import mongoose from 'mongoose';

const Artist = new mongoose.Schema({
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ArtistName : {
        type: String,
        required: true
    },
    PhoneNumber : {
        type: Number,
        required: true
    },
    ArtistType : {
        type: String,
        required: true
    },
    workingDays : {
        type: [String],
        required: true
    },
    startTime : {
        type: String,
        required: true
    },
    endTime : {
        type: String,
        required: true
    },
    salon : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
    },
    ArtistPhoto :{
        type: String,
    },
    services : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service'
        }
    ],
    appointments : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        }
    ],
})

const ArtistModel = mongoose.model('Artist', Artist);
export default ArtistModel;