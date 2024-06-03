import mongoose from "mongoose";

const Review = new mongoose.Schema({
    UserId: {
        type: String,
        required: true
    },
    Rating: {
        type: Number,
        required: true
    },
    Review: {
        type: String,
        required: true
    },
    Salon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
    },
    artist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artist',
    },
    appointment : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    }
})

const ReviewModel = mongoose.model('Review', Review);
export default ReviewModel;