import mongoose from "mongoose";

const User = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Customer','Artist','Owner','subAdmin','Admin'],
        required: true
    },
    isSalon : {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
    },
    otp: {
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
