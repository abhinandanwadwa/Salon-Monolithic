import mongoose from "mongoose";

const Statistics = new mongoose.Schema({
    _id: {
        type: String,
        default: "Statistic"
    },
    OtpCount : {
        type: Number,
        default: 0
    },
    UserCount : {
        type: Number,
        default: 0
    },
    SalonCount : {
        type: Number,
        default: 0
    },
    AppointmentCount : {
        type: Number,
        default: 0
    },
    deletedSalonCount : {
        type: Number,
        default: 0
    },
    
});

const Statistic = mongoose.model("Statistic", Statistics);

export default Statistic;