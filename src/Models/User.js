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
    otp : {
        type: String,
    },
    otpExpiration : {
        type: Date,
        default: Date.now,
        get: (otpExpiration) => otpExpiration.getTime(),
        set: (otpExpiration) => new Date(otpExpiration)
    },
    
}, { timestamps: true })

const UserModel = mongoose.model('User', User);

export default UserModel;
