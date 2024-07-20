import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    name : {
        type: String,
    },
    user : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    artist : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artist',
        required: true
    },
    services : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service'
        }
    ],
    salon : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    appointmentStartTime: {
        type: String,
        required: true
    },
    appointmentEndTime: {
        type: String,
        required: true
    },
    Duration: {
        type: Number,
        required: true
    },
    appointmentCost: {
        type: Number,
    },
    Status: {
        type: String,
        enum: ['Cancelled','Locked','Booked','Completed'],
        default: 'Booked'
    },
    lockExpires: {
        type: Date,
    }, 
    gender: {
        type: String,
    },
    Review: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    },
},{timestamps: true})

const AppointmentModel = mongoose.model('Appointment', appointmentSchema);
export default AppointmentModel;