import mongoose from 'mongoose';

const Salon = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    SalonName : {
        type: String,
        required: true
    },
    OwnerName : {
        type: String,
        required: true
    },
    address: {
        Address1: {
            type: String,
            required: true
        },
        Address2: {
            type: String,
        },
        Landmark: {
            type: String,
        },
        Pincode: {
            type: String,
            required: true
        },
        City: {
            type: String,
        },
        State: {
            type: String,
        },
        Country: {
            type: String,
            required: true
        }

    },
    BusinessType : {
        type: String,
        required: true
    }, 
    Gender : {
        type: String,
        enum: ['Male', 'Female', 'Unisex']
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
    salonPhoneNumber : {
        type: Number,
    },
    CoverImage : {
        type: String,
    },
    StorePhotos : {
        type: [String],
    },
    Brochure : {
        type: [String],
    },
    location : {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    Reviews : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    Services : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service'
        }
    ],
    Artists : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Artist'
        }
    ],
    Instagram : {
        type: String,
    },
    Facebook : {
        type: String,
    },
    appointments : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        }
    ],
    offers : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Offer'
        }
    ],
});



Salon.index({ location: '2dsphere' });

const SalonModel = mongoose.model('Salon', Salon);
export default SalonModel;