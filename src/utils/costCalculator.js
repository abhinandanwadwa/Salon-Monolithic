// utils/costCalculator.js
import mongoose from "mongoose";
import moment from "moment";
import ServiceModel from "../Models/Services.js";
import OfferModel from "../Models/Offer.js";
import CustomerModel from "../Models/Customer.js";
import WalletModel from "../Models/wallet.js";
import SalonModel from "../Models/Salon.js";

const PLATFORM_FEE = 0; // Assuming this is applied before final GST in both cases
const GST_RATE = 0.18; // Example: 18% GST. Store this in a config or fetch from salon if it varies.

const OfferErrorCodes = {
    NOT_FOUND: "OFFER_NOT_FOUND",
    EXPIRED: "OFFER_EXPIRED",
    ALREADY_USED: "OFFER_ALREADY_USED",
    INVALID_DAY: "OFFER_INVALID_DAY",
    DATE_REQUIRED: "OFFER_APPOINTMENT_DATE_REQUIRED",
    INVALID_DATA: "OFFER_INVALID_DATA",
};

// Helper for rounding
const roundToTwo = (num) => parseFloat(num.toFixed(2));

export const calculateDetailedCosts = async (userId, salonId, servicesInput, offerCode, appointmentDate) => {
  try {
    const customer = await CustomerModel.findOne({ userId }).populate("offers");
    const wallet = await WalletModel.findOne({ userId });
    const salon = await SalonModel.findById(salonId);

    if (!customer) return { success: false, isOfferError: false, message: "Customer not found", errorCode: "CUSTOMER_NOT_FOUND" };
    if (!wallet) return { success: false, isOfferError: false, message: "Wallet not found", errorCode: "WALLET_NOT_FOUND" };
    if (!salon) return { success: false, isOfferError: false, message: "Salon not found", errorCode: "SALON_NOT_FOUND" };
    if (!servicesInput || servicesInput.length === 0) {
         return { success: false, isOfferError: false, message: "No services selected", errorCode: "SERVICES_REQUIRED" };
    }

    const currentWalletBalance = wallet.balance;
    const serviceIds = servicesInput.map(s => new mongoose.Types.ObjectId(s.serviceId));
    const fetchedServices = await ServiceModel.find({ _id: { $in: serviceIds } });

    let initialServiceSum = 0; // This is the sum of ServiceCost/OptionPrice
    const calculatedServices = [];

    for (const inputService of servicesInput) {
        const service = fetchedServices.find(s => s._id.toString() === inputService.serviceId);
        if (!service) {
             return { success: false, isOfferError: false, message: `Service with ID ${inputService.serviceId} not found`, errorCode: "SERVICE_NOT_FOUND" };
        }

        let costForItem = service.ServiceCost;
        let chosenOption = null;

        if (inputService.selectedOptionId) {
            const option = service.CustomizationOptions.find(opt => opt._id.toString() === inputService.selectedOptionId);
            if (!option) {
                 return { success: false, isOfferError: false, message: `Customization option ${inputService.selectedOptionId} not found for service ${service.ServiceName}`, errorCode: "OPTION_NOT_FOUND" };
            } else {
                // If option is found, add its price to the service cost
                // costForItem = option.OptionPrice;
                costForItem += option.OptionPrice; // Add option price to service cost
                chosenOption = { optionId: option._id, optionName: option.OptionName, optionPrice: option.OptionPrice };
            }
        }
        initialServiceSum += costForItem;
        calculatedServices.push({
            serviceId: service._id,
            serviceName: service.ServiceName,
            inputCost: costForItem, // The cost as per DB (could be inclusive or exclusive of GST)
            chosenOption: chosenOption
        });
    }
    initialServiceSum = roundToTwo(initialServiceSum);

    // --- Determine Base Cost for Deductions (Pre-GST Base) ---
    // This is the crucial part based on your notes
    let baseCostForDeductions;
    let originalGstAmountInPrice = 0; // Only relevant if prices are inclusive
    const pricesIncludeGst = !salon.Gst; // If salon.Gst is false or undefined, prices are inclusive

    if (pricesIncludeGst) {
        baseCostForDeductions = initialServiceSum;
    } else {
        // add GST to the initial service sum to get the pre-GST base
        let gst = initialServiceSum * GST_RATE;
        baseCostForDeductions = roundToTwo(initialServiceSum + gst);
    }

    // --- Apply Wallet Deduction (Applied on the pre-GST base) ---
    const walletSavingsUsed = roundToTwo(Math.min(baseCostForDeductions, currentWalletBalance));
    const costAfterWallet = roundToTwo(baseCostForDeductions - walletSavingsUsed);

    // --- Add Platform Fee (Applied on the pre-GST base after wallet) ---
    const billBeforeDiscountPreGst = roundToTwo(costAfterWallet + PLATFORM_FEE);

    // --- Apply Offer (Discount) ---
    let discountAmount = 0;
    let appliedOffer = null;

    if (offerCode) {
        offerCode = offerCode.toUpperCase();
        const offer = await OfferModel.findOne({ OfferName: offerCode, salon: salonId });

        if (!offer) {
             return { success: false, isOfferError: true, errorCode: OfferErrorCodes.NOT_FOUND, message: "Offer code not found or not valid for this salon."};
        }
        // ... (Offer validations: expiry, usage, day, data - KEEP YOUR EXISTING VALIDATIONS HERE)
        let validationDate = appointmentDate ? moment(appointmentDate) : null;
        let expiryCheckDate = validationDate ? validationDate.startOf('day') : moment().startOf('day');
        const offerEndDateMoment = moment(offer.OfferEndDate).endOf('day');

        if (offerEndDateMoment.isBefore(expiryCheckDate)) {
            return { success: false, isOfferError: true, errorCode: OfferErrorCodes.EXPIRED, message: "This offer has expired" + (validationDate ? " for the selected date." : ".") };
        }

        if (offer.OfferDays && offer.OfferDays.length > 0) {
             if (!validationDate) {
                 return { success: false, isOfferError: true, errorCode: OfferErrorCodes.DATE_REQUIRED, message: "Please select an appointment date to use this offer code." };
             }
             const Days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
             const appointmentDayName = Days[validationDate.day()];
             if (!offer.OfferDays.includes(appointmentDayName)) {
                 return { success: false, isOfferError: true, errorCode: OfferErrorCodes.INVALID_DAY, message: `This offer is not valid on a ${appointmentDayName}.` };
             }
        }
        if (offer.OfferDiscountinPercentage === undefined && offer.offerCashbackinPercentage === undefined) {
            return { success: false, isOfferError: true, errorCode: OfferErrorCodes.INVALID_DATA, message: "Offer data is invalid." };
        }
        // --- End Offer Validations ---

        appliedOffer = offer;
        if (offer.OfferDiscountinPercentage > 0) {
            // Discount is applied on the pre-GST amount after wallet and platform fee
            discountAmount = roundToTwo((billBeforeDiscountPreGst * offer.OfferDiscountinPercentage) / 100);
            discountAmount = Math.min(discountAmount, billBeforeDiscountPreGst); // Cap discount
        }
    } // End if(offerCode)

    const subTotalAfterDiscountPreGst = roundToTwo(billBeforeDiscountPreGst - discountAmount);

    // --- Calculate Final GST to be Paid ---
    // This GST is calculated on the baseCostForDeductions
    const gstPayable = roundToTwo(initialServiceSum * GST_RATE);

    // --- Calculate Final Payable Amount ---
    const finalPayableAmount = roundToTwo(subTotalAfterDiscountPreGst);

    // --- Calculate Cashback (based on Final Payable Amount) ---
    let cashbackAmount = 0;
    if (appliedOffer && appliedOffer.offerCashbackinPercentage > 0) {
         cashbackAmount = roundToTwo((finalPayableAmount * appliedOffer.offerCashbackinPercentage) / 100);
    }

    return {
      success: true,
      isOfferError: false,
      costs: {
        initialServiceSum: initialServiceSum, // Sum of (service/option prices) from DB
        pricesIncludeGst: pricesIncludeGst, // boolean: true if initialServiceSum included GST
        gstRate: GST_RATE, // The GST rate used for calculation

        baseForDeductionsAndDiscounts: initialServiceSum, // initialServiceSum or its pre-GST equivalent
        originalGstAmountInPrice: pricesIncludeGst ? originalGstAmountInPrice : 0, // GST amount if it was part of initialServiceSum

        walletSavingsUsed: walletSavingsUsed,
        platformFee: PLATFORM_FEE,
        
        billBeforeDiscountPreGst: billBeforeDiscountPreGst, // Cost after wallet & platform_fee, before discount, pre-GST
        discountAmount: discountAmount,
        
        subTotalAfterDiscountPreGst: subTotalAfterDiscountPreGst, // This is the "Amount" (Rs 517.96 or Rs 640) in your notes
        gstPayable: pricesIncludeGst ? 0 : gstPayable, // The GST calculated on subTotalAfterDiscountPreGst (Rs 93.23 or Rs 115.2)

        finalPayableAmount: finalPayableAmount, // The final amount customer pays (Rs 611 or Rs 755)
        offerCashback: cashbackAmount, // (Rs 122 if 20% on Rs 611)
        walletBalanceAvailable: currentWalletBalance
      },
      offerDetails: appliedOffer ? {
        offerId: appliedOffer._id,
        offerName: appliedOffer.OfferName,
        discountPercentage: appliedOffer.OfferDiscountinPercentage,
        cashbackPercentage: appliedOffer.offerCashbackinPercentage,
      } : null,
      calculatedServices: calculatedServices.map(cs => ({
          ...cs,
          // Add effective costs per service if needed after pro-rating discounts/wallet,
          // for now, inputCost is shown.
      })),
    };

  } catch (error) {
    console.error("Error in calculateDetailedCosts:", error);
    return {
        success: false,
        isOfferError: false,
        message: error.message || "An unexpected error occurred while calculating costs.",
        errorCode: "CALCULATION_ERROR"
    };
  }
};