import mongoose from "mongoose";

const Services = new mongoose.Schema({
    ServiceName: {
        type: String,
    },
    ServiceType: {
        type: String,
    },
    ServiceCost: {
        type: Number,
    },
    ServiceTime: {
        type: Number,
    },
    salon : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
    },
    ServiceGender: {
        type: String,
        enum: ['Male','Female','Both']
    }
});

Services.index({ ServiceName: 'text' });

const Service = mongoose.model("Service", Services);
export default Service;