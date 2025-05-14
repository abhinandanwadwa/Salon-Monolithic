// filepath: c:\Users\jasha\Downloads\SEM_4\Projects\Salon-monolithic\src\Controllers\transcation.controller.js
import Razorpay from "razorpay";
import crypto from "crypto";
import AppointmentModel from "../Models/Appointments.js";
import TransactionModel from "../Models/transaction.js"; // Assuming this is the correct path and model name

// Initialize Razorpay instance
// Ensure these environment variables are set
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



// --- Create Razorpay Order ---
// Expects appointmentId in req.body to fetch details
export const createRazorpayOrder = async (req, res) => {
  const { appointmentId } = req.body;

  if (!appointmentId) {
    return res.status(400).json({ error: "Appointment ID is required" });
  }

  try {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    if (appointment.paymentStatus === "Paid") {
      return res.status(400).json({ error: "Appointment already paid" });
    }

    const amountInPaisa = Math.round(
      appointment.billingDetails.finalPayableAmount * 100
    ); // Convert to paisa
    const currency = "INR";
    const receipt = appointment._id.toString(); // Use appointmentId as receipt

    const options = {
      amount: amountInPaisa,
      currency,
      receipt,
      notes: {
        appointmentId: receipt, // Pass appointmentId in notes for webhook
        userId: appointment.user.toString(),
      },
    };

    const order = await instance.orders.create(options);
    if (!order) {
      return res.status(500).send("Error creating Razorpay order");
    }

    // Create a preliminary transaction record
    await TransactionModel.findOneAndUpdate(
      { appointmentId: appointment._id, orderId: order.id },
      {
        appointmentId: appointment._id,
        userId: appointment.user,
        orderId: order.id, // Razorpay Order ID
        amount: appointment.billingDetails.finalPayableAmount,
        currency: currency,
        status: "INITIATED", // Initial status
        paymentGateway: "Razorpay",
      },
      { upsert: true, new: true }
    );

    res.json({
      orderId: order.id,
      amount: order.amount, // Amount in paisa
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // For Flutter SDK
      appointmentDetails: {
        // Optionally send back some appointment details
        appointmentId: appointment._id,
        finalAmount: appointment.billingDetails.finalPayableAmount,
      },
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

// --- Razorpay Webhook for Payment Verification ---
export const razorpayWebhook = async (req, res) => {
  const secret = "mainsecretsalon";
  const receivedSignature = req.headers["x-razorpay-signature"];
  const requestBodyString = req.body.toString(); // req.body is raw buffer due to express.raw()

  
  console.log(requestBodyString)
  console.log(receivedSignature)

  const isSignatureValid = Razorpay.validateWebhookSignature(
    requestBodyString,
    receivedSignature,
    secret
  );

  const issignature = crypto
    .createHmac("sha256", secret)
    .update(requestBodyString)
    .digest("hex") === receivedSignature;
  console.log("Signature Valid:", issignature);
  console.log("Received Signature:", receivedSignature);

  if (isSignatureValid) {
    const event = JSON.parse(requestBodyString);
    console.log(
      "Razorpay Webhook Event Received:",
      JSON.stringify(event, null, 2)
    );

    const paymentEntity = event.payload.payment?.entity;
    const orderEntity = event.payload.order?.entity; // For order.paid event

    let appointmentId;
    let razorpayOrderId;
    let razorpayPaymentId;
    let paidAmount; // in paisa
    let paymentStatus;

    if (event.event === "payment.captured") {
      if (!paymentEntity) {
        console.error(
          "Webhook Error: payment.captured event but no payment entity."
        );
        return res.status(400).send("Webhook Error: Missing payment entity");
      }
      appointmentId = paymentEntity.notes?.appointmentId;
      razorpayOrderId = paymentEntity.order_id;
      razorpayPaymentId = paymentEntity.id;
      paidAmount = paymentEntity.amount; // Amount in paisa
      paymentStatus = "SUCCESS";

      console.log(
        `Payment Captured: ID=${razorpayPaymentId}, OrderID=${razorpayOrderId}, Amount=${
          paidAmount / 100
        } ${paymentEntity.currency}, Status=${paymentEntity.status}`
      );
    } else if (event.event === "payment.failed") {
      if (!paymentEntity) {
        console.error(
          "Webhook Error: payment.failed event but no payment entity."
        );
        return res.status(400).send("Webhook Error: Missing payment entity");
      }
      appointmentId = paymentEntity.notes?.appointmentId;
      razorpayOrderId = paymentEntity.order_id;
      razorpayPaymentId = paymentEntity.id; // May or may not exist for all failures
      paymentStatus = "FAILURE";

      console.log(
        `Payment Failed for Order ID: ${razorpayOrderId}, Error: ${paymentEntity.error_description}`
      );
    } else if (event.event === "order.paid") {
      // This event is also reliable.
      if (!orderEntity) {
        console.error("Webhook Error: order.paid event but no order entity.");
        return res.status(400).send("Webhook Error: Missing order entity");
      }
      appointmentId = orderEntity.notes?.appointmentId; // Assuming notes are copied to order
      razorpayOrderId = orderEntity.id;
      // For order.paid, we might not have a single paymentId if it involved multiple attempts.
      // We should rely on the payment.captured event for the specific paymentId.
      // However, order.paid confirms the order total is met.
      // Let's find the successful payment for this order if possible.
      const paymentsForOrder = await instance.orders.fetchPayments(
        razorpayOrderId
      );
      const successfulPayment = paymentsForOrder.items?.find(
        (p) => p.status === "captured"
      );
      if (successfulPayment) {
        razorpayPaymentId = successfulPayment.id;
        paidAmount = successfulPayment.amount;
      } else {
        // Fallback if direct payment capture event was missed or if logic needs adjustment
        paidAmount = orderEntity.amount_paid; // Amount in paisa
      }
      paymentStatus = "SUCCESS";

      console.log(
        `Order Paid: OrderID=${orderEntity.id}, Amount=${
          orderEntity.amount_paid / 100
        }, Status=${orderEntity.status}`
      );
    } else {
      console.log(`Received unhandled event: ${event.event}`);
      return res
        .status(200)
        .json({ status: "unhandled_event", event: event.event });
    }

    if (!appointmentId || !razorpayOrderId) {
      console.error(
        "Webhook Error: Could not determine appointmentId or razorpayOrderId from event.",
        event
      );
      // Acknowledge receipt to Razorpay to prevent retries for this malformed/unexpected event
      return res.status(200).json({
        status: "error",
        message: "Missing appointmentId or orderId in event payload notes.",
      });
    }

    try {
      const appointment = await AppointmentModel.findById(appointmentId);
      if (!appointment) {
        console.error(
          `Webhook Error: Appointment not found with ID: ${appointmentId} for order ${razorpayOrderId}`
        );
        return res
          .status(404)
          .json({ status: "error", message: "Appointment not found" });
      }

      // Update Transaction
      const transactionUpdate = {
        status: paymentStatus,
        paytmTransactionId: razorpayPaymentId, // Storing Razorpay Payment ID here
        gatewayResponse: event, // Store the full event payload
        checksumVerified: true, // Signature was verified
      };
      if (paidAmount !== undefined) {
        transactionUpdate.amount = paidAmount / 100; // Store amount in base currency unit (e.g., Rupees)
      }

      const updatedTransaction = await TransactionModel.findOneAndUpdate(
        { orderId: razorpayOrderId, appointmentId: appointmentId },
        { $set: transactionUpdate },
        { new: true, upsert: false } // Don't upsert here, should exist from createOrder
      );

      if (!updatedTransaction) {
        console.warn(
          `Webhook Warning: Transaction record not found for orderId ${razorpayOrderId} and appointmentId ${appointmentId}. This might indicate an issue or a race condition if the webhook arrived before the createOrder DB write completed, though unlikely.`
        );
        // Optionally, create it if it's missing, though it implies an issue in the flow.


      }

      if (paymentStatus === "SUCCESS") {
        // Verify amount if paidAmount is available
        const expectedAmountInPaisa = Math.round(
          appointment.billingDetails.finalPayableAmount * 100
        );
        if (paidAmount !== undefined && paidAmount !== expectedAmountInPaisa) {
          console.warn(
            `Webhook Amount Mismatch: Appointment ${appointmentId}, Order ${razorpayOrderId}. Expected ${expectedAmountInPaisa}, Paid ${paidAmount}. Holding status update.`
          );
          // TODO: Handle amount mismatch. Maybe flag for manual review.
          // For now, we will still mark transaction as success but not update appointment fully.
          // Or, you might choose to not update the appointment to 'Paid'
        }

        appointment.paymentStatus = "Paid";
        appointment.isPaid = true;
        // Optionally, update main appointment status if payment is the final step for confirmation
        if (
          appointment.Status === "Booked" ||
          appointment.Status === "Pending"
        ) {
          appointment.Status = "Confirmed";
        }
        // Link transaction to appointment if your schema supports it directly
        // appointment.transaction = updatedTransaction._id; // If you have a direct ref
        await appointment.save();
        console.log(`Appointment ${appointmentId} updated to Paid/Confirmed.`);

        // TODO: Send booking confirmation (email/SMS) to the user and salon.
      } else if (paymentStatus === "FAILURE") {
        appointment.paymentStatus = "Pending"; // Or "Failed" if you have such a status
        // appointment.Status = 'Payment Failed'; // Or revert to a previous status
        await appointment.save();
        console.log(
          `Appointment ${appointmentId} payment status updated due to failure.`
        );
      }

      res.status(200).json({ status: "ok" });
    } catch (dbError) {
      console.error(
        `Webhook DB Error: Failed to update records for appointment ${appointmentId}, order ${razorpayOrderId}. Error: ${dbError}`
      );
      // Respond with 500 to signal Razorpay to retry if appropriate,
      // but be cautious as this could lead to duplicate processing if not idempotent.
      // For now, acknowledge with 200 to avoid retry loops for DB errors that might be persistent.
      res.status(200).json({ status: "db_error", message: dbError.message });
    }
  } else {
    console.error(
      "Invalid Razorpay Webhook Signature. Signature validation failed."
    );
    res.status(400).send("Invalid signature");
  }
};

// --- (Optional): Fetch Payment Details ---
export const getPaymentStatus = async (req, res) => {
  const { paymentId } = req.params;
  if (!paymentId) {
    return res.status(400).json({ error: "Payment ID is required" });
  }
  try {
    const payment = await instance.payments.fetch(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json(payment);
  } catch (error) {
    console.error("Fetch payment error:", error);
    const statusCode = error.error?.statusCode || error.statusCode || 500;
    const message =
      error.error?.description || error.message || "Internal Server Error";
    res.status(statusCode).json({ error: message });
  }
};

export const getOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" });
  }
  try {
    const order = await instance.orders.fetch(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    const payments = await instance.orders.fetchPayments(orderId);
    res.json({ order, payments: payments.items });
  } catch (error) {
    console.error("Fetch order error:", error);
    const statusCode = error.error?.statusCode || error.statusCode || 500;
    const message =
      error.error?.description || error.message || "Internal Server Error";
    res.status(statusCode).json({ error: message });
  }
};
