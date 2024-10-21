import OfferModel from "../Models/Offer.js";
import SalonModel from "../Models/Salon.js";
import CustomerModel from "../Models/Customer.js";
import moment from "moment";
import ArtistModel from "../Models/Artist.js";
import { db,messaging } from "./fcmClient.js";


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
    let salon = await SalonModel.findOne({ userId: user });

    if(req.user.role === 'subAdmin'){
      const artist = await ArtistModel.findOne({ userId: user });
      salon = await SalonModel.findOne({ Artists: artist._id });
    }

    if (!salon) {
      return res.status(404).json({ 
        success: false,
        message: "Salon not found" 
      });
    }

    const offerCode = OfferName.toUpperCase();

    const offer = new OfferModel({
      OfferName : offerCode,
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
    let salon = await SalonModel.findOne({ userId: user });

    if(req.user.role === 'subAdmin'){
      const artist = await ArtistModel.findOne({ userId: user });
      salon = await SalonModel.findOne({ Artists: artist._id });
    }
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
      message: "Error in fetching offers" + error,
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
    let salon = await SalonModel.findOne({ userId: user });

    if(req.user.role === 'subAdmin'){
      const artist = await ArtistModel.findOne({ userId: user });
      salon = await SalonModel.findOne({ Artists: artist._id });
    }
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
    const offerCode = offerName.toUpperCase();
    const user = req.user._id;
    const Costumer = await CustomerModel.findOne({ userId: user });
    
    const offer = await OfferModel.findOne({ OfferName: offerCode, salon: salonId });

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

    //convert current date to IST
    currentDate.setHours(currentDate.getHours() + 5);
    currentDate.setMinutes(currentDate.getMinutes() + 30);
    

    if(offerEndDate < currentDate){
      return res.status(400).json({
        success: false,
        message: "Offer expired",
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
      offerId: offer._id,
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

  const user = req.user._id
  if(user.token){
  const message = {
    notification: {
      title: 'New Order',
      body: 'You have a new order'
    },
    token: user.token
  };

  messaging.send(message).then((response) => {
    console.log('Successfully sent message:', response);
    return res.status(200).json({
      success: true,
      message: "Notification sent",
    });
  }).catch((error) => {
    console.log('Error sending message:', error);
    return res.status(500).json({
      success: false,
      message: "Error in sending notification",
    });
  });

  }

 

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

const getOffersofThatDay = async (req,res) => {
  try {
    const {day , salonId } = req.body;
    const userId = req.user._id;

    const customer = await CustomerModel.findOne({ userId: userId });    
    const offers = await OfferModel.find({ salon: salonId });

    if(!offers){
      return res.status(404).json({
        success: false,
        message: "No offers found",
        data: []
      });
    }
    let availableOffers = offers.filter(offer => offer.OfferDays.includes(day));

    let usedOffers = [];

    //filter the offers which are in customers offers array
    if(availableOffers.length > 0){
      usedOffers = availableOffers.filter(offer => customer.offers.includes(offer._id));
      availableOffers = availableOffers.filter(offer => !customer.offers.includes(offer._id));
    }


    //check if the offer has started
      
    return res.status(200).json({
      success: true,
      data: availableOffers,
      usedData: usedOffers
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching offers"
    });
  }

}



export { createOffer, getOffers, deleteOffer ,validateOffer,testApi,getOffersofThatDay };