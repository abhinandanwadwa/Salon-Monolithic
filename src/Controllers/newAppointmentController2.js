import mongoose from "mongoose";
import { calculateDetailedCosts } from "../utils/costCalculator.js";

import AppointmentModel from "../Models/Appointments.js";
import UserModel from "../Models/User.js";
import SalonModel from "../Models/Salon.js";
import CustomerModel from "../Models/Customer.js";
import moment from "moment";
import OfferModel from "../Models/Offer.js";
import Service from "../Models/Services.js";
import { messaging } from "./fcmClient.js";
import WalletModel from "../Models/wallet.js";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("default", {
    month: "short",
  });
  const year = date.getFullYear();
  const daySuffix = (day) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };
  return `${day}${daySuffix(day)} ${month} ${year}`;
};

const getTotalCost = async (req, res) => {
  try {
    // Expects: { services: [{ serviceId, selectedOptionId? }], offerCode?, salonId }
    // salonId is needed if an offerCode is provided for validation
    const { services, offerCode, salonId, appointmentDate } = req.body;
    const user = req.user._id;

    // Basic validation
    if (!services || !Array.isArray(services) || services.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Services array is required." });
    }
    if (offerCode && !salonId) {
      return res.status(400).json({
        success: false,
        message: "Salon ID is required when using an offer code.",
      });
    }

    // Use the helper function (passing null for appointmentDate as it's not strictly needed here,
    // unless offers are day-specific and you want to preview for a future date)
    const calculationResult = await calculateDetailedCosts(
      user,
      salonId,
      services,
      offerCode,
      appointmentDate
    ); // Pass null for date in getTotalCost

    if (!calculationResult.success) {
      // Handle specific errors, e.g., offer validation errors
      if (calculationResult.offerValidationError) {
        return res.status(400).json({
          success: false,
          message: `Offer Error: ${calculationResult.offerValidationError}`,
          // Optionally return costs calculated *without* the invalid offer
        });
      }
      // General calculation error
      return res
        .status(400)
        .json({ success: false, message: calculationResult.message });
    }

    // Return the calculated costs
    return res.status(200).json({
      success: true,
      message: "Total cost calculated successfully",
      data: {
        totalServiceCost: calculationResult.costs.totalServiceCost,
        discountAmount: calculationResult.costs.discountAmount,
        offerCashbackEarned: calculationResult.costs.offerCashback, // Cashback TO BE earned
        walletSavingsUsed: calculationResult.costs.walletSavingsUsed, // Amount deducted FROM wallet
        platformFee: calculationResult.costs.platformFee,
        gst: calculationResult.costs.gst,
        billBeforeDiscount: calculationResult.costs.billBeforeDiscount,
        finalPayableAmount: calculationResult.costs.finalPayableAmount,
        offerDetails: calculationResult.offerDetails, // Include details if offer applied
        offerValidationError: calculationResult.offerValidationError, // Let FE know if offer failed
      },
    });
  } catch (error) {
    console.error("Error in getTotalCost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching cost",
    });
  }
};

const createAppointment = async (req, res) => {
  try {
    // Simplified payload: { salonId, services: [{serviceId, selectedOptionId?], appointmentDate, appointmentStartTime, offerCode? }
    const {
      salonId,
      services: servicesInput, // Renamed for clarity
      appointmentDate,
      appointmentStartTime,
      offerCode, // Optional offer code
      notes,
    } = req.body;
    const userId = req.user._id;

    // --- Basic Validations ---
    if (
      !salonId ||
      !servicesInput ||
      !appointmentDate ||
      !appointmentStartTime
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }
    if (!Array.isArray(servicesInput) || servicesInput.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Services array cannot be empty." });
    }

    // --- Fetch Core Models ---
    const salon = await SalonModel.findById(salonId);
    if (!salon) {
      return res
        .status(404)
        .json({ success: false, message: "Salon not found" });
    }

    const customer = await CustomerModel.findOne({ userId: userId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const wallet = await WalletModel.findOne({ userId: userId });
    if (!wallet) {
      return res
        .status(404)
        .json({ success: false, message: "Wallet not found" });
    }

    // --- Calculate Costs Reliably on Backend ---
    // Pass the actual appointmentDate for accurate offer day validation
    const calculationResult = await calculateDetailedCosts(
      userId,
      salonId,
      servicesInput,
      offerCode,
      appointmentDate
    );

    // Handle calculation errors (e.g., service not found, invalid offer applied *during booking*)
    if (!calculationResult.success) {
      // Distinguish offer validation errors from others
      if (calculationResult.offerValidationError) {
        return res.status(400).json({
          success: false,
          message: `Offer Error: ${calculationResult.offerValidationError}`,
          // Maybe suggest booking without the offer?
        });
      }
      return res.status(400).json({
        success: false,
        message:
          calculationResult.message || "Failed to calculate final costs.",
      });
    }

    // --- Check Wallet Balance before proceeding ---
    // Ensure the user *still* has enough balance for the calculated deduction
    const currentWalletBalance = wallet.balance; // Re-fetch or use reliable fetched value
    const {
      walletSavingsUsed,
      offerCashback,
      finalPayableAmount,
      gst,
      discountAmount,
      billBeforeDiscount,
      platformFee,
      totalServiceCost,
    } = calculationResult.costs;
    const appliedOfferId = calculationResult.offerDetails
      ? calculationResult.offerDetails.offerId
      : null;

    if (walletSavingsUsed > currentWalletBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Required: ${walletSavingsUsed}, Available: ${currentWalletBalance}`,
      });
    }

    // --- Create Appointment ---
    const newAppointment = await AppointmentModel.create({
      salon: salonId,
      user: customer._id,
      name: customer.name,
      // Store the detailed services breakdown including options
      services: calculationResult.calculatedServices.map((s) => ({
        serviceName: s.serviceName, // Store the name of the service
        serviceCustomizationName: s.chosenOption
          ? s.chosenOption.optionName
          : null, // Store the name of the chosen option if any
        service: s.serviceId, // Store reference to the service
        selectedOption: s.chosenOption ? s.chosenOption.optionId : null, // Store reference to chosen option if any
        calculatedCost: s.finalCost, // Store the cost used for this service item
      })),
      billingDetails: {
        totalServiceCost: totalServiceCost.toFixed(2),
        gst: gst.toFixed(2), // GST applied on totalServiceCost
        walletSavingsUsed: walletSavingsUsed.toFixed(2), // Amount deducted from wallet
        platformFee: platformFee.toFixed(2),
        billBeforeDiscount: billBeforeDiscount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        finalPayableAmount: finalPayableAmount.toFixed(2), // This is the key payment amount
        offerCashbackEarned: offerCashback.toFixed(2),
      },
      notes: notes || null,

      appointmentDate: appointmentDate,
      appointmentStartTime: appointmentStartTime,
      Status: "Booked",
      offerApplied: appliedOfferId, // Store the ID of the offer used, if any
    });

    const appointmentId = newAppointment._id;

    // --- Update Related Models ---

    // Update Customer (add appointment, add used offer if applicable)
    customer.appointments.push(appointmentId);
    if (
      appliedOfferId &&
      !customer.offers.some((offer) => offer._id.equals(appliedOfferId))
    ) {
      // Prevent duplicates
      customer.offers.push(appliedOfferId);
    }
    await customer.save();

    // Update Salon
    salon.appointments.push(appointmentId);
    await salon.save();

    // Update Wallet Balance (Debit savings used, Credit cashback earned)
    // only reduce the wallet balance by the amount used, dont add cashback to the wallet
    const netWalletChange = -walletSavingsUsed; // Negative for debit
    const newBalance = currentWalletBalance + netWalletChange; // Calculate new balance
    // Note: cashback is not added to the wallet immediately, but can be tracked in billingDetails

    // Update wallet (using findOneAndUpdate for atomicity on the wallet doc)
    await WalletModel.findOneAndUpdate(
      { userId: userId },
      {
        $inc: { balance: netWalletChange }, // Increment/decrement balance atomically
        $push: { appointmentHistory: appointmentId }, // Push appointment ID to the appointments array
      },
      { new: true } // Return updated doc if needed, though not strictly necessary here
    );

    console.log("Wallet updated:", {
      oldBalance: currentWalletBalance,
      cashBackAdded: offerCashback,
      walletSavingsUsed: walletSavingsUsed,
      netChange: netWalletChange,
      newBalance: newBalance, // Calculated for logging, actual update done by $inc
    });

    const SalonOwner = await UserModel.findById(salon.userId);

    const TIME = moment(appointmentStartTime).format("hh:mm A");
    const date = formatDate(appointmentDate);

    if (SalonOwner && SalonOwner.token) {
      const message = {
        notification: {
          title: "New Appointment",
          body: `New appointment on ${date} at ${TIME}`,
        },
        token: SalonOwner.token,
      };

      messaging
        .send(message)
        .then((response) => {
          console.log("Successfully sent message:", response);
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }

    // --- Return Success ---
    return res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: newAppointment, // Return the created appointment object
    });
  } catch (error) {
    console.error("Error in creating appointment:", error);
    // Check for specific Mongoose validation errors if needed
    return res.status(500).json({
      success: false,
      message: "Error in creating appointment",
      error: error.message, // Provide error message in response (optional)
    });
  }
};

const acceptOrRejectAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body; // Accept or Reject or Complete

    if (!appointmentId || !status) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    if (status !== "Accept" && status !== "Reject" && status !== "Complete") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    //status are Confirmed or Rejected or Completed
    appointment.Status =
      status === "Accept"
        ? "Confirmed"
        : status === "Reject"
        ? "Rejected"
        : "Completed";

    await appointment.save();
    const customer = await CustomerModel.findById(appointment.user);
    const user = await UserModel.findById(customer.userId);

    if (user && user.token && status != "Complete") {
      const message = {
        notification: {
          title: `Appointment ${appointment.Status}`,
          body: `Your Appointment has been ${appointment.Status}`,
        },
        token: user.token,
      };

      messaging
        .send(message)
        .then((response) => {
          console.log("Successfully sent message:", response);
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }

    return res.status(200).json({
      success: true,
      message: `Appointment ${status}ed successfully`,
      data: appointment,
    });
  } catch (error) {
    console.error("Error in accepting/rejecting appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Error in processing appointment",
      error: error.message, // Provide error message in response (optional)
    });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!appointmentId) {
      return res
        .status(400)
        .json({ success: false, message: "Appointment ID is required." });
    }

    const appointment = await AppointmentModel.findById(appointmentId);

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (appointment.Status == "Booked" && appointment.Status == "Confirmed") {
      appointment.Status = "Cancelled";
      await appointment.save();
    }

    // If appointment is already cancelled or completed, return appropriate message

    if (appointment.Status == "Cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Appointment already cancelled." });
    }
    if (appointment.Status == "Completed") {
      return res
        .status(400)
        .json({ success: false, message: "Appointment already completed." });
    }

    // Update the appointment status to cancelled
    appointment.Status = "Cancelled";
    await appointment.save();

    const salon = await SalonModel.findById(appointment.salon);
    const SalonOwner = await UserModel.findById(salon.userId);

    const TIME = moment(appointment.appointmentStartTime).format("hh:mm A");
    const date = formatDate(appointment.appointmentDate);

    if (SalonOwner && SalonOwner.token) {
      const message = {
        notification: {
          title: `Appointment Cancelled`,
          body: `Appointment Scheduled on ${date} at ${TIME} has been Cancelled`,
        },
        token: SalonOwner.token,
      };

      messaging
        .send(message)
        .then((response) => {
          console.log("Successfully sent message:", response);
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully.",
      data: appointment,
    });
  } catch (error) {
    console.error("Error in cancelling appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Error in cancelling appointment",
      error: error.message, // Provide error message in response (optional)
    });
  }
};

//reschedule appointment and set the status to booked

const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newDate, newStartTime } = req.body; // New date and time for rescheduling

    if (!appointmentId || !newDate || !newStartTime) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    const appointment = await AppointmentModel.findById(appointmentId);

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    const oldTime = moment(appointment.appointmentStartTime).format("hh:mm A");
    const oldDate = formatDate(appointment.appointmentDate);
    // Update the appointment date and time
    appointment.appointmentDate = newDate;
    appointment.appointmentStartTime = newStartTime;

    appointment.Status = "Booked"; // Reset status to booked

    await appointment.save();

    const salon = await SalonModel.findById(appointment.salon);
    const SalonOwner = await UserModel.findById(salon.userId);
    const newTime = moment(appointment.appointmentStartTime).format("hh:mm A");
    const neDate = formatDate(appointment.appointmentDate);

    if (SalonOwner && SalonOwner.token) {
      const message = {
        notification: {
          title: `Appointment Rescheduled`,
          body: `Appointment Scheduled on ${oldDate} at ${oldTime} has been rescheduled to ${neDate} at ${newTime}`,
        },
        token: SalonOwner.token,
      };

      messaging
        .send(message)
        .then((response) => {
          console.log("Successfully sent message:", response);
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully.",
      data: appointment,
    });
  } catch (error) {
    console.error("Error in rescheduling appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Error in rescheduling appointment",
      error: error.message, // Provide error message in response (optional)
    });
  }
};

export {
  createAppointment,
  getTotalCost,
  acceptOrRejectAppointment,
  cancelAppointment,
  rescheduleAppointment,
}; // Export refactored functions
