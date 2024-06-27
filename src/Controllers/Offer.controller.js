import OfferModel from "../Models/Offer.js";
import SalonModel from "../Models/Salon.js";
import CustomerModel from "../Models/Customer.js";
import moment from "moment";

/**
 * @desc Create Offer
 * @method POST
 * @route /api/offer/create-offer
 * @access Private
 * @requestBody {
 *   OfferName: String,
 *   OfferStartDate: Date,
 *   OfferEndDate: Date,
 *   OfferDiscountinRuppees: Number,
 *   OfferDiscountinPercentage: Number,
 *   OfferDescription: String,
 *   OfferDays: Array of Strings
 * }
 */



const createOffer = async (req, res) => {
  try {
    const {
      OfferName,
      OfferStartDate,
      OfferEndDate,
      OfferDiscountinPercentage,
      OfferDescription,
      OfferDays,
    } = req.body;
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });
    if (!salon) {
      return res.status(404).json({ 
        success: false,
        message: "Salon not found" 
      });
    }

    const offer = new OfferModel({
      OfferName,
      OfferStartDate,
      OfferEndDate,
      OfferDiscountinPercentage,
      OfferDescription,
      OfferDays,
      salon: salon._id,
    });
    await offer.save();

    salon.offers.push(offer);
    await salon.save();

    return res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in creating offer",
    });
  }
};

/**
 * @desc Get Offers
 * @method GET
 * @route /api/offer/get
 * @access Private
 * @request None
 */



const getOffers = async (req, res) => {
  try {
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });
    if (!salon) {
      return res.status(404).json({ 
        success: false,
        message: "Salon not found" });
    }

    const offers = await OfferModel.find({ salon: salon._id });
    return res.status(200).json(offers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching offers",
    });
  }
};

/**
 * @desc Delete Offer
 * @method DELETE
 * @route /api/offer/delete/:offerId
 * @access Private
 * @requestParams { offerId: String }
 */

const deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });
    if (!salon) {
      return res.status(404).json({ 
        success: false,
        message: "Salon not found" 
      });
    }

    await OfferModel.findByIdAndDelete(offerId);
    await salon.offers.pull(offerId);

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in deleting offer",
    });
  }
};

/**
 * @desc Validate Offer
 * @method POST
 * @route /api/offer/validate
 * @access Public
 * @requestBody { offerName: String }
 * @requestParams { salonId: String }
 */

const validateOffer = async (req, res) => {
  try {
    const { offerName,salonId, TodayDate } = req.body;
    console.log(offerName);

    const user = req.user._id;
    console.log(user)
    const Costumer = await CustomerModel.findOne({ userId: user });
    
    const offer = await OfferModel.findOne({ OfferName: offerName, salon: salonId });

    console.log(offer)

    if (!offer) {
      return res.status(404).json({ 
        success: false,
        message: "Offer not found" 
      });
    }

    const offerStartDate = new Date(offer.OfferStartDate);
    const offerEndDate = new Date(offer.OfferEndDate);
    const currentDate = new Date(TodayDate);

    if(offerStartDate > currentDate || offerEndDate < currentDate){
      return res.status(400).json({
        success: false,
        message: "Offer expired" + offerStartDate + currentDate + offerEndDate
      });
    }

    console.log(Costumer)

    if(Costumer.offers.includes(offer._id)){
      return res.status(400).json({
        success: false,
        message: "Offer already Used"
      });
    }



    const todayDay = moment(TodayDate).day();


    const Days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    const today = Days[todayDay];

    if(offer.OfferDays.length > 0 && !offer.OfferDays.includes(today)){
      return res.status(400).json({
        success: false,
        message: "Offer not valid today"
      });
    }

    if(!offer.OfferDiscountinPercentage ){
      return res.status(400).json({
        success: false,
        message: "Invalid offer"
      });
    }

   

    return res.status(200).json({
      success: true,
      data: offer.OfferDiscountinPercentage ,
      message: "Offer applied successfully",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in validating offer" + error + req.body.TodayDate,
    });
  }
}

const testApi = async (req, res) => {

  const user = req.user._id;
  if(user){
    return res.status(200).json({
      success: true,
      message: "User found",
      user: user,
    });
  }
  return res.status(404).json({
    success: false,
    message: "User not found",
  });
}


export { createOffer, getOffers, deleteOffer ,validateOffer,testApi };