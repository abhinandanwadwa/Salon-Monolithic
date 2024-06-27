import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
    },  
    email: {
        type: String,
    },
    gender: {
        type: String,
    },
    appointments: [
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
})

const CustomerModel = mongoose.model('Customer', customerSchema);
export default CustomerModel;

