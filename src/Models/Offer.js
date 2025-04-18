import mongoose from "mongoose";

const Offer = new mongoose.Schema({
    OfferName: {
        type: String,
    },
    OfferStartDate: {
        type: String,
    },
    OfferEndDate: {
        type: String,
    },

    OfferDiscountinPercentage: {
        type: Number,
    },
    offerCashbackinPercentage: {
        type: Number,
    },
    OfferDescription: {
        type: String,
    },
    OfferDays: {
        type: [String],
        required: true
    },
    salon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    }
});

const OfferModel = mongoose.model('Offer', Offer);
export default OfferModel;
    