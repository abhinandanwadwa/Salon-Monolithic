import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    user : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    artist : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artist',
        required: true
    },
    servies : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service'
        }
    ],
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
},{timestamps: true})

const AppointmentModel = mongoose.model('Appointment', appointmentSchema);
export default AppointmentModel;