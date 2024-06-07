import mongoose from "mongoose";

const User = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Customer','Artist','Owner','subAdmin'],
        required: true
    },
    isSalon : {
        type: Boolean,
        default: false
    },
}, { timestamps: true })

const UserModel = mongoose.model('User', User);

export default UserModel;
