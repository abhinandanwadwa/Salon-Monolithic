// filepath: c:\Users\jasha\Downloads\SEM_4\Projects\Salon-monolithic\src\Controllers\transaction.controller.js
import AppointmentModel from "../Models/Appointments.js";
import TransactionModel from "../Models/transaction.js";
import UserModel from "../Models/User.js"; // If needed for customer details
import dotenv from "dotenv";
import PaytmChecksum from "paytmchecksum";
import axios from "axios";

dotenv.config();

// --- Paytm Configuration (load from .env) ---
const PAYTM_MERCHANT_ID = "DIY12386817555501617";
const PAYTM_MERCHANT_KEY = "bKMfNxPPf_QdZppa";
const PAYTM_WEBSITE = process.env.PAYTM_WEBSITE || "WEBSTAGING"; // Or "DEFAULT" for production
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000"; // Your frontend URL for redirects if any
const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:5000"; // Your backend URL
const PAYTM_CALLBACK_URL = `${BACKEND_API_URL}/api/payment/paytm-callback`;

// --- Real Paytm SDK functions ---
async function generatePaytmTxnToken(orderId, amount, custId) {
  console.log(
    `Generating Paytm token for OrderID: ${orderId}, Amount: ${amount}, CustID: ${custId}`
  );
  try {
    // 1. Prepare parameters for Paytm's initiate transaction API
    const paytmParams = {
      body: {
        requestType: "Payment",
        mid: PAYTM_MERCHANT_ID,
        websiteName: PAYTM_WEBSITE,
        orderId: orderId,
        callbackUrl: PAYTM_CALLBACK_URL,
        txnAmount: { value: amount.toString(), currency: "INR" },
        userInfo: { custId: custId },
      },
      head: { signature: "" }
    };
    
    // 2. Generate checksum
    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      PAYTM_MERCHANT_KEY
    );
    
    paytmParams.head.signature = checksum;
    
    // 3. Make an API call to Paytm to initiate transaction
    const postData = JSON.stringify(paytmParams);
    
    // Using the staging URL for testing
    const paytmURL = `https://securegw-stage.paytm.in/theia/api/v1/initiateTransaction?mid=${PAYTM_MERCHANT_ID}&orderId=${orderId}`;
    
    // For production, use this URL instead:
    // const paytmURL = `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${PAYTM_MERCHANT_ID}&orderId=${orderId}`;
    
    const response = await axios.post(paytmURL, postData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    });
    
    // 4. Process the response
    if (response.data.body && response.data.body.resultInfo.resultStatus === 'S') {
      return {
        success: true,
        token: response.data.body.txnToken,
        orderId: orderId,
        amount: amount,
        mid: PAYTM_MERCHANT_ID
      };
    } else {
      console.error('Paytm token generation failed:', response.data);
      return {
        success: false,
        error: response.data.body?.resultInfo?.resultMsg || 'Failed to generate transaction token'
      };
    }
  } catch (error) {
    console.error('Error in generatePaytmTxnToken:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function verifyPaytmChecksum(dataFromPaytm) {
  try {
    console.log("Verifying Paytm checksum with received data:", dataFromPaytm);
    
    // Extract checksum from response
    const receivedChecksum = dataFromPaytm.CHECKSUMHASH;
    if (!receivedChecksum) {
      console.error('CHECKSUMHASH missing in Paytm response');
      return false;
    }
    
    // Create a copy of data without the checksum field
    const dataWithoutChecksum = { ...dataFromPaytm };
    delete dataWithoutChecksum.CHECKSUMHASH;
    
    // Verify the signature/checksum
    const isVerified = await PaytmChecksum.verifySignature(
      dataWithoutChecksum, 
      PAYTM_MERCHANT_KEY, 
      receivedChecksum
    );
    
    console.log(`Checksum verification result: ${isVerified ? 'SUCCESS' : 'FAILURE'}`);
    return isVerified;
  } catch (error) {
    console.error('Error verifying Paytm checksum:', error);
    return false;
  }
}
// --- End Real Functions ---

export const initiatePaytmPayment = async (req, res) => {
  try {
    const { appointmentId } = req.body; // amount will be fetched from appointment
    const userId = req.user._id; // Assuming 'verify' middleware adds user to req

    if (!appointmentId) {
      return res
        .status(400)
        .json({ success: false, message: "Appointment ID is required." });
    }

    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (appointment.isPaid || appointment.paymentStatus === "Paid") {
      return res.status(400).json({
        success: false,
        message: "This appointment has already been paid for.",
      });
    }

    const amountToPay = appointment.billingDetails.finalPayableAmount;
    if (amountToPay <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount for payment." });
    }

    const orderId = `SALON_ORD_${appointmentId}_${Date.now()}`; // Generate a unique order ID

    // Create or update transaction record
    let transaction = await TransactionModel.findOneAndUpdate(
      {
        appointmentId: appointmentId,
        status: { $in: ["INITIATED", "PENDING"] },
      },
      {
        userId,
        orderId,
        amount: amountToPay,
        status: "INITIATED",
        gatewayResponse: null,
        checksumVerified: false,
        paytmTransactionId: null,
      },
      { upsert: true, new: true }
    );

    const paytmTokenResponse = await generatePaytmTxnToken(
      orderId,
      amountToPay,
      userId.toString()
    );

    if (!paytmTokenResponse.success) {
      transaction.status = "FAILURE";
      transaction.gatewayResponse = { error: "Token generation failed" };
      await transaction.save();
      return res.status(500).json({
        success: false,
        message: "Failed to generate Paytm transaction token.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Paytm transaction token generated.",
      data: {
        transactionToken: paytmTokenResponse.token,
        orderId: paytmTokenResponse.orderId,
        amount: paytmTokenResponse.amount.toString(),
        mid: paytmTokenResponse.mid,
        callbackUrl: PAYTM_CALLBACK_URL, // Flutter SDK needs this
      },
    });
  } catch (error) {
    console.error("Error in initiatePaytmPayment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

export const handlePaytmCallback = async (req, res) => {
  try {
    const paytmResponse = req.body; // Paytm sends data as x-www-form-urlencoded
    console.log("Paytm Callback Received:", paytmResponse);

    const orderId = paytmResponse.ORDERID;
    if (!orderId) {
      console.error("ORDERID missing in Paytm callback.");
      return res.status(400).send("ORDERID missing"); // Respond to Paytm
    }

    const transaction = await TransactionModel.findOne({ orderId: orderId });
    if (!transaction) {
      console.error(`Transaction not found for ORDERID: ${orderId}`);
      return res.status(404).send("Transaction not found"); // Respond to Paytm
    }

    // Idempotency: If already processed, just send response
    if (
      transaction.status === "SUCCESS" ||
      (transaction.status === "FAILURE" && transaction.checksumVerified)
    ) {
      console.log(
        `Transaction ${orderId} already processed with status: ${transaction.status}`
      );
      const htmlResponse = `<html><head><title>Payment Status</title></head><body><h1>Transaction Already Processed</h1><p>Status: ${transaction.status}</p></body></html>`;
      return res.status(200).send(htmlResponse);
    }

    transaction.gatewayResponse = paytmResponse;
    const isChecksumVerified = await verifyPaytmChecksum({ ...paytmResponse }); // Pass a copy
    transaction.checksumVerified = isChecksumVerified;

    if (isChecksumVerified) {
      if (paytmResponse.STATUS === "TXN_SUCCESS") {
        transaction.status = "SUCCESS";
        transaction.paytmTransactionId = paytmResponse.TXNID;

        await AppointmentModel.findByIdAndUpdate(transaction.appointmentId, {
          paymentStatus: "Paid",
          isPaid: true,
          Status: "Confirmed", // Update appointment status
        });
        console.log(
          `Payment SUCCESS for OrderID: ${orderId}. Appointment updated.`
        );
        // TODO: Send notifications (user, salon)
      } else if (paytmResponse.STATUS === "TXN_FAILURE") {
        transaction.status = "FAILURE";
        console.log(
          `Payment FAILURE for OrderID: ${orderId}. Reason: ${paytmResponse.RESPMSG}`
        );
      } else {
        transaction.status = "PENDING"; // Or FAILURE based on business rule
        console.log(
          `Payment PENDING or other status for OrderID: ${orderId}. Status: ${paytmResponse.STATUS}`
        );
      }
    } else {
      transaction.status = "FAILURE"; // Checksum failed
      console.error(`Checksum verification FAILED for OrderID: ${orderId}.`);
      // Log this as a potential security issue
    }

    await transaction.save();

    // Respond to Paytm. Usually, a redirect or simple HTML is fine.
    // The Flutter app will confirm status via polling or WebSocket.
    const redirectUrl = `${APP_BASE_URL}/payment-status?orderId=${orderId}&status=${transaction.status}`;
    // res.redirect(redirectUrl); // If user's browser hits this.
    // For server-to-server, Paytm might just expect 200 OK.
    // Sending HTML as per typical Paytm examples.
    const htmlResponse = `<html><head><title>Payment Status</title></head><body><h1>Payment ${paytmResponse.STATUS}</h1><p>${paytmResponse.RESPMSG}</p><p>Please return to the app.</p></body></html>`;
    return res.status(200).send(htmlResponse);
  } catch (error) {
    console.error("Error in handlePaytmCallback:", error);
    // It's important to respond to Paytm to avoid retries if possible.
    return res.status(500).send("Internal Server Error processing callback.");
  }
};

// Endpoint for Flutter app to poll for final payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Order ID is required." });
    }

    const transaction = await TransactionModel.findOne({
      orderId: orderId,
    }).populate({
      path: "appointmentId",
      select: "Status paymentStatus isPaid user salon billingDetails", // Select fields you need
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found." });
    }

    return res.status(200).json({
      success: true,
      data: {
        orderId: transaction.orderId,
        transactionStatus: transaction.status,
        paytmTransactionId: transaction.paytmTransactionId,
        amount: transaction.amount,
        appointmentDetails: transaction.appointmentId, // Contains updated status
        gatewayMessage: transaction.gatewayResponse
          ? transaction.gatewayResponse.RESPMSG
          : null,
        lastUpdated: transaction.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};
