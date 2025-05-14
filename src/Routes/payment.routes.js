import express from "express";
// import { verify, roleAuthorization } from "../middlewares/authenticated.js"; // Assuming you might need these later
import * as transactionController from "../Controllers/transcation.controller.js";

const paymentRouter = express.Router();

// Middleware to parse raw body for webhook signature verification
// This needs to be applied specifically to the webhook route BEFORE the router handles it,
// or ensure express.json() is not used globally before this for this specific route.
// A common way is to apply it directly in the route definition or before the router.
// For simplicity, we'll assume it's handled correctly or add it to server.js for the specific path.
// If using express.Router(), it's often cleaner to apply it in the main app file for the specific path:
// app.use('/api/payments/razorpay-webhook', express.raw({ type: 'application/json' }));

paymentRouter.post(
  "/create-razorpay-order",
  transactionController.createRazorpayOrder
);

// Ensure express.raw() is used for this route for signature verification
// This is a common pattern: define the raw body parser just for this route.


paymentRouter.get(
  "/payment-status/:paymentId",
  transactionController.getPaymentStatus
);
paymentRouter.get("/order-status/:orderId", transactionController.getOrderStatus);

export default paymentRouter;
