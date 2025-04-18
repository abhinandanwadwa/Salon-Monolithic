import mongoose from 'mongoose';

const Wallet = new mongoose.Schema({
    balance: {
        type: Number,
        default: 0
    },
    appointmentHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        }
    ],
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // transactions: [
    //     {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'Transaction'
    //     }
    // ]
}, { timestamps: true });

const WalletModel = mongoose.model('Wallet', Wallet);
export default WalletModel;