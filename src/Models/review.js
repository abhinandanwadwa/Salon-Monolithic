import mongoose from "mongoose";

const Review = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    Rating: {
        type: Number,
    },
    Review: {
        type: String,
    },
},{timestamps: true})

const ReviewModel = mongoose.model('Review', Review);
export default ReviewModel;