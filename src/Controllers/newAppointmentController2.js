import mongoose from "mongoose";
import { calculateDetailedCosts } from "../utils/costCalculator.js";

import AppointmentModel from "../Models/Appointments.js";
import UserModel from "../Models/User.js";
import SalonModel from "../Models/Salon.js";
import CustomerModel from "../Models/Customer.js";
import OfferModel from "../Models/Offer.js";
import Service from "../Models/Services.js";
import { messaging } from "./fcmClient.js";
import WalletModel from "../Models/wallet.js";


const getTotalCost = async (req, res) => {
  try {
    // Expects: { services: [{ serviceId, selectedOptionId? }], offerCode?, salonId }
    // salonId is needed if an offerCode is provided for validation
    const { services, offerCode, salonId,appointmentDate } = req.body;
    const user = req.user._id;

    // Basic validation
    if (!services || !Array.isArray(services) || services.length === 0) {
         return res.status(400).json({ success: false, message: "Services array is required." });
    }
    if (offerCode && !salonId) {
         return res.status(400).json({ success: false, message: "Salon ID is required when using an offer code." });
    }


    // Use the helper function (passing null for appointmentDate as it's not strictly needed here,
    // unless offers are day-specific and you want to preview for a future date)
    const calculationResult = await calculateDetailedCosts(user, salonId, services, offerCode, appointmentDate); // Pass null for date in getTotalCost


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
      return res.status(400).json({ success: false, message: calculationResult.message });
    }

    // Return the calculated costs
    return res.status(200).json({
      success: true,
      message: "Total cost calculated successfully",
      data: {
        serviceCost: calculationResult.costs.totalServiceCost,
        discountApplied: calculationResult.costs.discountAmount,
        potentialCashback: calculationResult.costs.offerCashback, // Cashback TO BE earned
        walletSavingsApplied: calculationResult.costs.walletSavingsUsed, // Amount deducted FROM wallet
        platformFee: calculationResult.costs.platformFee,
        approxBill: calculationResult.costs.finalPayableAmount,
        walletBalanceAvailable: calculationResult.costs.walletBalanceAvailable, // Show current balance
        offerDetails: calculationResult.offerDetails, // Include details if offer applied
        offerValidationError: calculationResult.offerValidationError // Let FE know if offer failed
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
    } = req.body;
    const userId = req.user._id;

    // --- Basic Validations ---
    if (!salonId || !servicesInput || !appointmentDate || !appointmentStartTime) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }
    if (!Array.isArray(servicesInput) || servicesInput.length === 0) {
         return res.status(400).json({ success: false, message: "Services array cannot be empty." });
    }

    // --- Fetch Core Models ---
    const salon = await SalonModel.findById(salonId);
    if (!salon) {
      return res.status(404).json({ success: false, message: "Salon not found" });
    }

    const customer = await CustomerModel.findOne({ userId: userId });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const wallet = await WalletModel.findOne({ userId: userId });
     if (!wallet) {
        return res.status(404).json({ success: false, message: "Wallet not found" });
     }

    // --- Calculate Costs Reliably on Backend ---
    // Pass the actual appointmentDate for accurate offer day validation
    const calculationResult = await calculateDetailedCosts(userId, salonId, servicesInput, offerCode, appointmentDate);

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
        return res.status(400).json({ success: false, message: calculationResult.message || "Failed to calculate final costs." });
    }

     // --- Check Wallet Balance before proceeding ---
     // Ensure the user *still* has enough balance for the calculated deduction
     const currentWalletBalance = wallet.balance; // Re-fetch or use reliable fetched value
     const { walletSavingsUsed, offerCashback, finalPayableAmount, discountAmount,billBeforeDiscount,platformFee,totalServiceCost } = calculationResult.costs;
     const appliedOfferId = calculationResult.offerDetails ? calculationResult.offerDetails.offerId : null;

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
      // Store the detailed services breakdown including options
      services: calculationResult.calculatedServices.map(s => ({
          service: s.serviceId, // Store reference to the service
          selectedOption: s.chosenOption ? s.chosenOption.optionId : null, // Store reference to chosen option if any
          calculatedCost: s.finalCost // Store the cost used for this service item
      })),
      billingDetails: {
        totalServiceCost: totalServiceCost,
        walletSavingsUsed: walletSavingsUsed,
        platformFee: platformFee,
        billBeforeDiscount: billBeforeDiscount,
        discountAmount: discountAmount,
        finalPayableAmount: finalPayableAmount, // This is the key payment amount
        offerCashbackEarned: offerCashback
    },

      appointmentDate: appointmentDate,
      appointmentStartTime: appointmentStartTime,
      Status: "Booked",
      offerApplied: appliedOfferId // Store the ID of the offer used, if any
    });

    const appointmentId = newAppointment._id;

    // --- Update Related Models ---

    // Update Customer (add appointment, add used offer if applicable)
    customer.appointments.push(appointmentId);
    if (appliedOfferId && !customer.offers.some(offer => offer._id.equals(appliedOfferId))) { // Prevent duplicates
      customer.offers.push(appliedOfferId);
    }
    await customer.save();

    // Update Salon
    salon.appointments.push(appointmentId);
    await salon.save();

    // Update Wallet Balance (Debit savings used, Credit cashback earned)
    const netWalletChange = offerCashback - walletSavingsUsed;
    const newBalance = currentWalletBalance + netWalletChange;

    // Update wallet (using findOneAndUpdate for atomicity on the wallet doc)
    await WalletModel.findOneAndUpdate(
        { userId: userId },
        { 
          $inc: { balance: netWalletChange },  // Increment/decrement balance atomically
          $push: { appointmentHistory: appointmentId }  // Push appointment ID to the appointments array
        }, 
        { new: true }  // Return updated doc if needed, though not strictly necessary here
      );

    console.log("Wallet updated:", {
      oldBalance: currentWalletBalance,
      cashBackAdded: offerCashback,
      walletSavingsUsed: walletSavingsUsed,
      netChange: netWalletChange,
      newBalance: newBalance // Calculated for logging, actual update done by $inc
    });


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
    const { status } = req.body; // Accept or Reject

    if (!appointmentId || !status) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (appointment.Status !== "Booked") {
      return res.status(400).json({ success: false, message: "Appointment already processed" });
    }

    if (status !== "Accept" && status !== "Reject") {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    //status are Confirmed or Rejected
    appointment.Status = status === "Accept" ? "Confirmed" : "Rejected";
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: `Appointment ${status}ed successfully`,
      data: appointment,
    });

  }
  catch (error) {
    console.error("Error in accepting/rejecting appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Error in processing appointment",
      error: error.message, // Provide error message in response (optional)
    });
  }
}


const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "Appointment ID is required." });
    }

    const appointment = await AppointmentModel.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }
    
    if (appointment.Status == "Booked" && appointment.Status == "Confirmed") {
      appointment.Status = "Cancelled";
      await appointment.save();
    }

    // If appointment is already cancelled or completed, return appropriate message

    if (appointment.Status == "Cancelled") {
      return res.status(400).json({ success: false, message: "Appointment already cancelled." });
    }
    if (appointment.Status == "Completed") {
      return res.status(400).json({ success: false, message: "Appointment already completed." });
    }

    // Update the appointment status to cancelled
    appointment.Status = "Cancelled";
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully.",
      data: appointment,
    });

  }
  catch (error) {
    console.error("Error in cancelling appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Error in cancelling appointment",
      error: error.message, // Provide error message in response (optional)
    });
  }

}





export { createAppointment, getTotalCost , acceptOrRejectAppointment,cancelAppointment }; // Export refactored functions