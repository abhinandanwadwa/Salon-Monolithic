import express from "express";
import { verify } from "../middlewares/authenticated.js"; // Your authentication middleware
import {
  initiatePaytmPayment,
  handlePaytmCallback,
  getPaymentStatus,
} from "../Controllers/transcation.controller.js";

const PaymentRouter = express.Router();

// Endpoint for Flutter app to initiate payment
// POST /api/payment/initiate-paytm
PaymentRouter.post("/initiate-paytm", verify, initiatePaytmPayment);

// Endpoint for Paytm to send callback/webhook
// POST /api/payment/paytm-callback
// This route should be publicly accessible by Paytm's servers
// Paytm sends data as x-www-form-urlencoded, ensure your server.js has app.use(express.urlencoded({ extended: true }));
PaymentRouter.post("/paytm-callback", handlePaytmCallback);

// Endpoint for Flutter app to poll for payment status
// GET /api/payment/status/:orderId
PaymentRouter.get("/status/:orderId", verify, getPaymentStatus);

export default PaymentRouter;
