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
    name: {
        type: String,
    },
    gender: {
        type: String,
        default: 'Male',
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
    token: {
        type: String,
    },
    lastLogin: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true })

UserSchema.pre('save', function (next) {
    if (this.isModified('lastLogin')) {
        const now = new Date();
        const IndianTime = new Date(now.getTime() + 330*60000);
        this.lastLogin = IndianTime;
    }
    next();
});

const UserModel = mongoose.model('User', User);

export default UserModel;
