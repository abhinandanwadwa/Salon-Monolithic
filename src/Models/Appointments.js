import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    services: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
          required: true,
        },
        serviceName: {
          type: String,
          required: true,
        },
        serviceCustomizationName: {
          type: String,
        },
        selectedOption: {
          type: mongoose.Schema.Types.ObjectId,
          required: false, 
        },
        calculatedCost: {
          type: Number,
          required: true,
        },
      },
    ],
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    billingDetails: {
      totalServiceCost: {
        // Sum of all calculatedCosts from services array above
        type: Number,
        required: true,
        default: 0,
      },
      gst: {
        // GST applied on totalServiceCost
        type: Number,
        required: true,
        default: 0,
        // do toFixed(2)
        


      },
      walletSavingsUsed: {
        // Amount deducted from wallet
        type: Number,
        required: true,
        default: 0,
      },
      platformFee: {
        // Platform fee added
        type: Number,
        required: true,
        default: 0,
      },
      billBeforeDiscount: {
        // (totalServiceCost - walletSavingsUsed) + platformFee
        type: Number,
        required: true,
        default: 0,
      },
      discountAmount: {
        // Discount applied from offer
        type: Number,
        required: true,
        default: 0,
      },
      finalPayableAmount: {
        // The final amount charged (billBeforeDiscount - discountAmount)
        type: Number, // THIS IS THE MAIN COST FIELD FOR PAYMENT
        required: true,
        default: 0,
      },
      offerCashbackEarned: {
        // Cashback generated by this appointment
        type: Number,
        required: true,
        default: 0,
      },
      _id: false, // No separate ID needed for the billingDetails object
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentStartTime: {
      type: String,
      required: true,
    },
    appointmentEndTime: {
      type: String,
    },
    Duration: {
      type: Number,
    },
    appointmentCost: {
      type: Number,
    },
    Status: {
        type: String,
        enum: ['Cancelled','Confirmed','Booked','Completed', 'Rejected', 'No Show'],
        default: 'Booked'
    },
    gender: {
      type: String,
      default: "Male",
    },
    name: {
      type: String,
    },
    Review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid","Failed", "Refunded"],
      default: "Pending",
    },
    // transaction: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Transaction'
    // },
    isPaid: {
      type: Boolean,
      default: false,
    },
    cancellationReason: {
        type: String,
    },
    notes: {
      type: String,
    },
    offerApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
    },
  },
  { timestamps: true }
);

const AppointmentModel = mongoose.model("Appointment", appointmentSchema);
export default AppointmentModel;
