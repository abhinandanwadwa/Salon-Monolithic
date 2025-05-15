// utils/costCalculator.js (or within AppointmentsController.js)
import mongoose from "mongoose";
import moment from "moment"; // Make sure moment is imported
import ServiceModel from "../Models/Services.js";
import OfferModel from "../Models/Offer.js";
import CustomerModel from "../Models/Customer.js";
import WalletModel from "../Models/wallet.js";

const PLATFORM_FEE = 0;

// Define specific error codes for offer validation issues
const OfferErrorCodes = {
    NOT_FOUND: "OFFER_NOT_FOUND",
    EXPIRED: "OFFER_EXPIRED",
    ALREADY_USED: "OFFER_ALREADY_USED",
    INVALID_DAY: "OFFER_INVALID_DAY",
    DATE_REQUIRED: "OFFER_APPOINTMENT_DATE_REQUIRED", // When date needed for day validation but not provided
    INVALID_DATA: "OFFER_INVALID_DATA", // Offer structure itself is bad
};


export const calculateDetailedCosts = async (userId, salonId, servicesInput, offerCode, appointmentDate) => {
  try {
    // --- 1. Fetch User Data ---
    const customer = await CustomerModel.findOne({ userId }).populate("offers");
    const wallet = await WalletModel.findOne({ userId });

    // Basic data validation
    if (!customer) return { success: false, isOfferError: false, message: "Customer not found", errorCode: "CUSTOMER_NOT_FOUND" };
    if (!wallet) return { success: false, isOfferError: false, message: "Wallet not found", errorCode: "WALLET_NOT_FOUND" };
    if (!servicesInput || servicesInput.length === 0) {
         return { success: false, isOfferError: false, message: "No services selected", errorCode: "SERVICES_REQUIRED" };
    }

    const currentWalletBalance = wallet.balance;

    // --- 2. Calculate Base Service & Customization Cost ---
    const serviceIds = servicesInput.map(s => new mongoose.Types.ObjectId(s.serviceId));
    const fetchedServices = await ServiceModel.find({ _id: { $in: serviceIds } });

    let totalServiceCost = 0;
    const calculatedServices = [];

    for (const inputService of servicesInput) {
        const service = fetchedServices.find(s => s._id.toString() === inputService.serviceId);
        if (!service) {
            // If a service ID provided doesn't exist
             return { success: false, isOfferError: false, message: `Service with ID ${inputService.serviceId} not found`, errorCode: "SERVICE_NOT_FOUND" };
        }

        let costForItem = service.ServiceCost;
        let chosenOption = null;

        if (inputService.selectedOptionId) {
            const option = service.CustomizationOptions.find(opt => opt._id.toString() === inputService.selectedOptionId);
            if (!option) {
                 // If a selected option ID doesn't exist for the service
                 return { success: false, isOfferError: false, message: `Customization option ${inputService.selectedOptionId} not found for service ${service.ServiceName}`, errorCode: "OPTION_NOT_FOUND" };
                // Or use console.warn and base price if desired:
                // console.warn(`Customization option ${inputService.selectedOptionId} not found for service ${service.ServiceName}. Using base price.`);
            } else {
                costForItem = option.OptionPrice;
                chosenOption = { optionId: option._id, optionName: option.OptionName, optionPrice: option.OptionPrice };
            }
        }
        totalServiceCost += costForItem;
        calculatedServices.push({
            serviceId: service._id,
            serviceName: service.ServiceName,
            baseCost: service.ServiceCost,
            finalCost: costForItem,
            chosenOption: chosenOption
        });
    }

    // --- 3. Apply Wallet Deduction FIRST ---
    const walletSavingsUsed = Math.min(totalServiceCost, currentWalletBalance);
    const costAfterWallet = totalServiceCost - walletSavingsUsed;

    // --- 4. Add Platform Fee to get Bill Before Discount ---
    const billBeforeDiscount = costAfterWallet + PLATFORM_FEE;

    // --- 5. Apply Offer (Discount and Cashback) ---
    let discountAmount = 0;
    let cashbackAmount = 0;
    let appliedOffer = null;
    // No offerValidationError variable needed, return directly

    if (offerCode) {
        offerCode = offerCode.toUpperCase();
        const offer = await OfferModel.findOne({ OfferName: offerCode, salon: salonId });

        if (!offer) {
             // --- Offer Not Found Error ---
             return {
                 success: false,
                 isOfferError: true, // Flag indicating the error is offer-related
                 errorCode: OfferErrorCodes.NOT_FOUND,
                 message: "Offer code not found or not valid for this salon."
             };
        }

        // --- Offer Validations ---
        let validationDate = appointmentDate ? moment(appointmentDate) : null;
        let expiryCheckDate = validationDate ? validationDate.startOf('day') : moment().startOf('day');
        const offerEndDateMoment = moment(offer.OfferEndDate).endOf('day');

        // 1. Expiry Check
        if (offerEndDateMoment.isBefore(expiryCheckDate)) {
            // --- Offer Expired Error ---
            return {
                success: false,
                isOfferError: true,
                errorCode: OfferErrorCodes.EXPIRED,
                message: "This offer has expired" + (validationDate ? " for the selected date." : ".")
            };
        }

        // 2. Usage Check
        const hasUsedOffer = customer.offers.some(usedOffer => usedOffer._id.equals(offer._id));
        if (hasUsedOffer) {
             // --- Offer Already Used Error ---
            return {
                success: false,
                isOfferError: true,
                errorCode: OfferErrorCodes.ALREADY_USED,
                message: "You have already used this offer code."
            };
        }

        // 3. Day Check (Requires validationDate derived from appointmentDate)
        if (offer.OfferDays && offer.OfferDays.length > 0) {
             if (!validationDate) {
                 // --- Date Required Error ---
                 return {
                     success: false,
                     isOfferError: true,
                     errorCode: OfferErrorCodes.DATE_REQUIRED,
                     message: "Please select an appointment date to use this offer code (it's only valid on specific days)."
                 };
             }
             const Days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
             const appointmentDayName = Days[validationDate.day()];
             const isValidDay = offer.OfferDays.includes(appointmentDayName);

             if (!isValidDay) {
                  // --- Invalid Day Error ---
                 return {
                     success: false,
                     isOfferError: true,
                     errorCode: OfferErrorCodes.INVALID_DAY,
                     message: `This offer is not valid on a ${appointmentDayName}.`
                 };
             }
        }

        // 4. Data Check
        if (offer.OfferDiscountinPercentage === undefined && offer.offerCashbackinPercentage === undefined) {
            console.error(`Offer ${offer.OfferName} (${offer._id}) has invalid data - no discount or cashback percentage defined.`);
             // --- Invalid Data Error ---
            return {
                success: false,
                isOfferError: true,
                errorCode: OfferErrorCodes.INVALID_DATA,
                message: "Offer data is invalid. Please contact support." // User-friendly message
            };
        }
        // --- End Offer Validations ---

        // If all validations passed:
        appliedOffer = offer;
        if (offer.OfferDiscountinPercentage > 0) {
            discountAmount = (billBeforeDiscount * offer.OfferDiscountinPercentage) / 100;
            discountAmount = Math.min(discountAmount, billBeforeDiscount);
        }
        // Cashback calculation comes later
    } // End if(offerCode)

    // --- 6. Calculate Final Payable Amount ---
    const finalPayableAmount = Math.max(0, billBeforeDiscount - discountAmount);

    // --- 7. Calculate Cashback based on Final Payable Amount ---
    if (appliedOffer && appliedOffer.offerCashbackinPercentage > 0) {
         cashbackAmount = (finalPayableAmount * appliedOffer.offerCashbackinPercentage) / 100;
    }

    // --- 8. Prepare SUCCESS Result Object ---
    return {
      success: true,
      isOfferError: false, // Explicitly false on success
      costs: {
        totalServiceCost: totalServiceCost,
        walletSavingsUsed: walletSavingsUsed,
        platformFee: PLATFORM_FEE,
        billBeforeDiscount: billBeforeDiscount,
        discountAmount: discountAmount,
        finalPayableAmount: finalPayableAmount,
        offerCashback: cashbackAmount, // Renamed for clarity from offerCashbackEarned
        walletBalanceAvailable: currentWalletBalance
      },
      offerDetails: appliedOffer ? {
        offerId: appliedOffer._id,
        offerName: appliedOffer.OfferName,
        discountPercentage: appliedOffer.OfferDiscountinPercentage,
        cashbackPercentage: appliedOffer.offerCashbackinPercentage,
      } : null,
      calculatedServices: calculatedServices,
      // No offerValidationError needed here anymore
    };

  } catch (error) {
    // --- Catch unexpected errors during calculation ---
    console.error("Error in calculateDetailedCosts:", error);
    // Return a generic server error structure
    return {
        success: false,
        isOfferError: false, // Not specifically an offer validation error
        message: error.message || "An unexpected error occurred while calculating costs.",
        errorCode: "CALCULATION_ERROR" // Generic code for unexpected issues
    };
  }
};