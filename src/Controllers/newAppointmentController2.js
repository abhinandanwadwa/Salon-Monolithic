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
import { sendRescheduledAppointment ,sendCancelByCustomerToOwner , sendRescheduleByCustomerToOwner} from "../utils/whatsappUtility.js";

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

const roundToTwo = (num) => {
  if (typeof num !== 'number' || isNaN(num)) {
    // console.warn(`roundToTwo received non-numeric input: ${num}. Returning 0.`); // Optional warning
    return 0; // Or throw an error, or return NaN, depending on desired strictness
  }
  return parseFloat(num.toFixed(2));
};

const getTotalCost = async (req, res) => {
  try {
    const { services, offerCode, salonId, appointmentDate } = req.body;
    const user = req.user._id; // Assuming req.user is populated by authentication middleware

    // Basic validation
    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ success: false, message: "Services array is required." });
    }
    // salonId is required by calculateDetailedCosts to fetch salon details (e.g., for salon.Gst flag)
    // and for offer validation if an offerCode is provided.
    if (!salonId) {
        return res.status(400).json({ success: false, message: "Salon ID is required." });
    }
    // appointmentDate is optional for calculateDetailedCosts overall,
    // but calculateDetailedCosts itself will return an error if an offer requires it and it's missing.

    let calculationResult = await calculateDetailedCosts(
      user,
      salonId,
      services,
      offerCode,
      appointmentDate
    );

    let offerValidationErrorForResponse = null;

    // Scenario: An offer was attempted, but it failed validation.
    // We should then calculate the cost without the offer and report the offer's error message.
    if (!calculationResult.success && calculationResult.isOfferError) {
      offerValidationErrorForResponse = calculationResult.message; // Store the original offer error message

      // Attempt to calculate costs again, this time without any offer.
      const fallbackCalculationResult = await calculateDetailedCosts(
        user,
        salonId,
        services,
        null, // No offer code for the fallback calculation
        appointmentDate // Pass appointmentDate along; it might be used for non-offer related logic if any
      );
      calculationResult = fallbackCalculationResult; // Use the result of the fallback calculation going forward
    }



    // After potential fallback, check if the calculation was ultimately successful.
    if (!calculationResult.success) {
      // This means:
      // 1. The initial calculation failed for a non-offer reason (e.g., service not found, customer not found).
      // OR
      // 2. The initial calculation failed due to an offer error, AND the subsequent fallback calculation (without offer) also failed.
      return res.status(400).json({
        success: false,
        message: calculationResult.message,
        errorCode: calculationResult.errorCode, // Provide specific error code if available from calculateDetailedCosts
      });
    }

    // If we reach here, 'calculationResult' holds a successful cost calculation
    // (either with the original offer, or without an offer if the original offer failed and fallback succeeded).
    const { costs, offerDetails: successfulOfferDetails } = calculationResult;

    console.log("Calculated Costs:", costs); // Log the costs for debugging

    // Construct 'totalServiceCost' for the response as per original intent:
    // This is the sum of catalog prices (service.ServiceCost or option.OptionPrice).
    // - If catalog prices are GST-inclusive, this value is the direct sum (costs.initialServiceSum).
    // - If catalog prices are GST-exclusive AND GST is applicable, this value reflects (sum of prices + GST on that sum).
    let responseTotalServiceCost = costs.baseForDeductionsAndDiscounts;
    // if (!costs.pricesIncludeGst && costs.gstRate > 0) { // If prices are exclusive AND GST is applicable (gstRate > 0)
    //     responseTotalServiceCost = roundToTwo(costs.initialServiceSum * (1 + costs.gstRate));
    // }

    // Construct the response data object with the exact variable names requested
    return res.status(200).json({
      success: true,
      message: "Total cost calculated successfully",
      data: {
        totalServiceCost: responseTotalServiceCost,
        discountAmount: costs.discountAmount,
        offerCashbackEarned: costs.offerCashback,
        walletSavingsUsed: costs.walletSavingsUsed,
        platformFee: costs.platformFee,
        gst: costs.gstPayable, // This is the final GST amount calculated on the taxable base
        // billBeforeDiscount: costs.billBeforeDiscountPreGst, // This is the base amount (pre-GST) on which the discount was applied
        finalPayableAmount: costs.finalPayableAmount,
        offerDetails: successfulOfferDetails, // Contains details of the offer if one was successfully applied; null otherwise
        offerValidationError: offerValidationErrorForResponse, // Contains the error message if an offer was attempted but failed
      },
    });

  } catch (error) {
    console.error("Error in getTotalCost controller:", error); // Log the actual error
    return res.status(500).json({
      success: false,
      message: "Internal server error while calculating total cost.",
      // errorCode: "INTERNAL_SERVER_ERROR" // You can add a generic error code for internal errors
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
    const calculationResult = await calculateDetailedCosts(
      userId,
      salonId,
      servicesInput,
      offerCode,
      appointmentDate
    );


    if (!calculationResult.success) {
      // If an offer was attempted and failed, calculationResult will have isOfferError: true.
      // Unlike getTotalCost, for createAppointment, if the offer is invalid at the point of booking,
      // we should probably fail the booking rather than silently booking without the offer,
      // unless business logic dictates otherwise. The current logic correctly fails.
      return res.status(400).json({
        success: false,
        message: calculationResult.message || "Failed to calculate final costs for booking.",
        errorCode: calculationResult.errorCode, // Provide specific error code
        isOfferError: calculationResult.isOfferError // Indicate if it was an offer issue
      });
    }

    // ...
    const { costs, offerDetails, calculatedServices: detailedCalculatedServices } = calculationResult;

    // --- Extract cost components from the new `costs` structure ---
    const {
        initialServiceSum,
        pricesIncludeGst,
        gstRate,
        baseForDeductionsAndDiscounts,
        walletSavingsUsed,
        platformFee,
        discountAmount,
        subTotalAfterDiscountPreGst,
        gstPayable,
        finalPayableAmount,
        offerCashback,
    } = costs;

    const appliedOfferId = offerDetails ? offerDetails.offerId : null;
    
    // --- CHECK WALLET (already correct in your code) ---
    const currentWalletBalance = wallet.balance;
    if (walletSavingsUsed > currentWalletBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Required: ${roundToTwo(walletSavingsUsed)}, Available: ${roundToTwo(currentWalletBalance)}`,
      });
    }

    // --- Calculate the actual billBeforeDiscount ---
    // This is the amount (pre-GST, after wallet, after platform fee) on which the offer discount was applied.
    const actualBillBeforeDiscount = roundToTwo(baseForDeductionsAndDiscounts - walletSavingsUsed + platformFee);

    // --- Create Appointment ---
    const newAppointment = await AppointmentModel.create({
      salon: salonId,
      user: customer._id,
      name: customer.name,
      services: detailedCalculatedServices.map((s) => ({ // Use detailedCalculatedServices
        serviceName: s.serviceName,
        serviceCustomizationName: s.chosenOption ? s.chosenOption.optionName : null,
        service: s.serviceId,
        selectedOption: s.chosenOption ? s.chosenOption.optionId : null,
        calculatedCost: roundToTwo(s.inputCost), // FIX: Use s.inputCost and round it
      })),
      billingDetails: {
        // totalServiceCost definition from your latest getTotalCost logic
        totalServiceCost: roundToTwo(baseForDeductionsAndDiscounts),
        gst: roundToTwo(gstPayable), // Assuming your schema calls it 'gst' for gstPayable
        walletSavingsUsed: roundToTwo(walletSavingsUsed),
        platformFee: roundToTwo(platformFee),
        billBeforeDiscount: actualBillBeforeDiscount, // FIX: Provide the calculated value
        discountAmount: roundToTwo(discountAmount),
        finalPayableAmount: roundToTwo(finalPayableAmount),
        offerCashbackEarned: roundToTwo(offerCashback),
      },
      notes: notes || null,
      appointmentDate: appointmentDate,
      appointmentStartTime: appointmentStartTime,
      Status: "Booked",
      offerApplied: appliedOfferId,
    });
// ... rest of your function

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

    // // Update Wallet Balance (Debit savings used, Credit cashback earned)
    // // only reduce the wallet balance by the amount used, dont add cashback to the wallet
    // const netWalletChange = -walletSavingsUsed; // Negative for debit
    // const newBalance = currentWalletBalance + netWalletChange; // Calculate new balance
    // // Note: cashback is not added to the wallet immediately, but can be tracked in billingDetails

    // // Update wallet (using findOneAndUpdate for atomicity on the wallet doc)
    // await WalletModel.findOneAndUpdate(
    //   { userId: userId },
    //   {
    //     $inc: { balance: netWalletChange }, // Increment/decrement balance atomically
    //     $push: { appointmentHistory: appointmentId }, // Push appointment ID to the appointments array
    //   },
    //   { new: true } // Return updated doc if needed, though not strictly necessary here
    // );

    // console.log("Wallet updated:", {
    //   oldBalance: currentWalletBalance,
    //   cashBackAdded: offerCashback,
    //   walletSavingsUsed: walletSavingsUsed,
    //   netChange: netWalletChange,
    //   newBalance: newBalance, // Calculated for logging, actual update done by $inc
    // });

    // --- Send WhatsApp Notification ---

    await sendPendingAppointment(
      customer.mobileNumber,
      customer.name,
      //first service name from the services array
      detailedCalculatedServices[0].serviceName,
      salon.SalonName,
      formatDate(appointmentDate),
      moment(appointmentStartTime).format("hh:mm A")
    );

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

    const customer = await CustomerModel.findById(appointment.user);

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

    sendCancelByCustomerToOwner(
      SalonOwner.phoneNumber,
      SalonOwner.name,
      customer.name,
      customer.phoneNumber,
      appointment.services[0].serviceName,
      date,
      TIME,
      appointment.billingDetails.finalPayableAmount.toString()
    );

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

    const customer = await CustomerModel.findById(appointment.user);
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

    sendRescheduledAppointment(
      customer.phoneNumber,
      customer.name,
      appointment.services[0].serviceName,
      salon.SalonName,
      neDate,
      newTime
    );

    sendRescheduleByCustomerToOwner(
      SalonOwner.phoneNumber,
      SalonOwner.name,
      customer.name,
      customer.phoneNumber,
      appointment.services[0].serviceName,
      neDate,
      newTime,
      appointment.billingDetails.finalPayableAmount.toString()
    );

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
