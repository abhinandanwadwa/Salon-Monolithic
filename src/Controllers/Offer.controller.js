import OfferModel from "../Models/Offer";
import SalonModel from "../Models/Salon";

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
      OfferDiscountinRuppees,
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
      OfferDiscountinRuppees,
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
    const { offerName,salonId } = req.body;
    
    const offer = await OfferModel.findOne({ OfferName: offerName, salon: salonId });

    if (!offer) {
      return res.status(404).json({ 
        success: false,
        message: "Offer not found" 
      });
    }

    if(offer.OfferStartDate > new Date() || offer.OfferEndDate < new Date()){
      return res.status(400).json({
        success: false,
        message: "Offer expired"
      });
    }

    if(offer.OfferDays.length > 0 && !offer.OfferDays.includes(new Date().toLocaleDateString())){
      return res.status(400).json({
        success: false,
        message: "Offer not valid today"
      });
    }

    if(!offer.OfferDiscountinPercentage && !offer.OfferDiscountinRuppees){
      return res.status(400).json({
        success: false,
        message: "Invalid offer"
      });
    }

    return res.status(200).json({
      success: true,
      data: offer.OfferDiscountinPercentage || offer.OfferDiscountinRuppees,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in validating offer",
    });
  }
}



export { createOffer, getOffers, deleteOffer ,validateOffer };