import moment from "moment";
import mongoose from "mongoose";

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
    const { services } = req.body;

    const user = req.user._id;
    const customer = await CustomerModel.findOne({ userId: user });
    const userProfile = await UserModel.findById(user).populate("Wallet");

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    const serviceObjectIds = services.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const TotalCost = await Service.aggregate([
      {
        $match: {
          _id: { $in: serviceObjectIds }, // Use converted ObjectIds
        },
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$ServiceCost" },
          // Optional: Include service details for debugging
          services: {
            $push: { id: "$_id", name: "$ServiceName", cost: "$ServiceCost" },
          },
        },
      },
    ]);
    console.log(TotalCost);

    const walletCashAvailable = userProfile.Wallet.balance;

    const approxBill = TotalCost[0].totalCost - walletCashAvailable + 10;

    if (approxBill < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid calculation: Approximate bill cannot be negative",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Total Cost",
      data: {
        serviceCost: TotalCost[0].totalCost,
        WalletSavings: walletCashAvailable,
        platformFee: 10,
        approxBill: approxBill,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching cost",
    });
  }
};

const createAppointment = async (req, res) => {
  try {
    const {
      salonId,
      services,
      appointmentDate,
      appointmentStartTime,
      serviceCost,
      WalletSavings,
      cashBack,
      discount,
      approxBill,
      offerId,
    } = req.body;
    const user = req.user._id;

    // Validate salon existence
    const salon = await SalonModel.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    // Validate customer existence
    const customer = await CustomerModel.findOne({ userId: user });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if offer ID is valid
    let validOffer = true;
    if (
      offerId === "null" ||
      offerId === "" ||
      offerId === null ||
      offerId === undefined ||
      offerId === " "
    ) {
      validOffer = false;
    }

    // Process offer if valid
    if (validOffer) {
      // Important fix: Need to await the promise to get the actual offer document
      const offer = await OfferModel.findById(offerId);

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      console.log("Offer details:", {
        name: offer.OfferName,
        discount: offer.OfferDiscountinPercentage,
        cashback: offer.offerCashbackinPercentage,
      });

      const DiscountPercentage = offer.OfferDiscountinPercentage;
      const Cashback = offer.offerCashbackinPercentage;
      const CurrentBill = serviceCost - WalletSavings;

      // Calculate the discount amount
      const calculatedDiscount = (CurrentBill * DiscountPercentage) / 100;

      // Calculate new bill with discount and convenience fee
      const newApproxBill = CurrentBill - calculatedDiscount + 10;

      console.log("Bill calculation:", {
        CurrentBill,
        DiscountPercentage,
        calculatedDiscount,
        newApproxBill,
        approxBill,
      });

      if (newApproxBill < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid calculation: Approximate bill cannot be negative",
        });
      }

      // Optional: You might want to make this check more flexible with a small tolerance
      const roundedNew = Math.round(newApproxBill);
      const roundedOld = Math.round(approxBill);
      const tolerance = 1; // Allow 1 unit difference due to rounding

      if (Math.abs(roundedNew - roundedOld) > tolerance) {
        return res.status(400).json({
          success: false,
          message: `Invalid calculation: Approximate bill mismatch (Server: ${roundedNew}, Client: ${roundedOld})`,
        });
      }
    }

    // Create appointment
    const Appointment = await AppointmentModel.create({
      salon: salonId,
      user: customer._id,
      services: services,
      appointmentDate: appointmentDate,
      appointmentStartTime: appointmentStartTime,
      appointmentCost: approxBill,
      appointmentCashback: cashBack,
      appointmentDiscount: discount,
      Status: "Booked",
    });

    console.log("Appointment created:", Appointment);

    const appointmentId = Appointment._id;

    // Update customer's appointments and offers
    customer.appointments.push(appointmentId);
    if (validOffer) {
      customer.offers.push(offerId);
    }
    await customer.save();

    // Update salon's appointments
    salon.appointments.push(appointmentId);
    await salon.save();

    // Process wallet transactions for cashback
    if (cashBack > 0) {
      const wallet = await WalletModel.findOne({ userId: user });
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      // Add cashback to wallet and subtract wallet savings if used
      const walletBalance = wallet.balance;
      const newBalance = walletBalance + cashBack;

      await WalletModel.findOneAndUpdate(
        { userId: user },
        { balance: newBalance },
        { new: true }
      );

      console.log("Wallet updated:", {
        oldBalance: walletBalance,
        cashBackAdded: cashBack,
        newBalance,
      });
    }

    // If wallet savings were used, we need to update the wallet balance separately
    // Process wallet transactions for cashback and apply wallet savings
    if (cashBack > 0 || WalletSavings > 0) {
      const wallet = await WalletModel.findOne({ userId: user });
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      // Current wallet balance
      const walletBalance = wallet.balance;

      // Calculate new balance: add cashback and subtract wallet savings used
      const newBalance = walletBalance + cashBack - WalletSavings;

      // Check for negative balance
      if (newBalance < 0) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }

      // Update wallet with new balance
      await WalletModel.findOneAndUpdate(
        { userId: user },
        { balance: newBalance },
        { new: true }
      );

      console.log("Wallet updated:", {
        oldBalance: walletBalance,
        cashBackAdded: cashBack,
        walletSavingsUsed: WalletSavings,
        newBalance,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: Appointment,
    });
  } catch (error) {
    console.error("Error in creating appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Error in creating appointment",
      error: error.message,
    });
  }
};
export { createAppointment, getTotalCost };
