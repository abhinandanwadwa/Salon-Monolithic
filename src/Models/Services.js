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
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Salon",
  },
  ServiceGender: {
    type: String,
    enum: ["Male", "Female", "Both"],
  },
  ServiceCount: {
    type: Number,
    default: 0,
  },
});

Services.index({ ServiceName: "text" });

const Service = mongoose.model("Service", Services);
export default Service;
