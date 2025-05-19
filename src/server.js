import dotenv from "dotenv";
dotenv.config(); // Load environment variables at the very top

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import ConnectDB from "./DB/index.js";
import { errorHandler, notfound } from "./middlewares/error.js";

import Authrouter from "./Routes/auth.routes.js";
import Artistrouter from "./Routes/Artist.routes.js";
import Servicerouter from "./Routes/Services.routes.js";
import Appointmentrouter from "./Routes/appointment.routes.js";
import Salonrouter from "./Routes/Salon.routes.js";
import Adminrouter from "./Routes/Admin.routes.js";
import Offerrouter from "./Routes/Offer.routes.js";
import Reviewrouter from "./Routes/Review.routes.js";
import { messaging } from "./Controllers/fcmClient.js";
import paymentRouter from "./Routes/payment.routes.js";
import { razorpayWebhook } from "./Controllers/transcation.controller.js";
// import {
//   connectToWhatsApp,
//   sendWhatsAppMessage,
// } from "./services/whatsappService.js"; // Import Baileys functions

const app = express();

// Trust the first proxy (needed for correct client IP detection behind proxies)
app.set("trust proxy", 1);

app.post(
  "/api/payments/razorpay-webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "https://www.salondekho.in",
      "https://admin.salondekho.in",
      "http://localhost:5173",
      "https://admin.jsondev.in",
    ],
    credentials: true,
  })
);

// app.use(function(req, res, next) {
//     res.header('Access-Control-Allow-Origin', ['https://www.salondekho.in','http://localhost:5173']);
//     res.header('Access-Control-Allow-Credentials', true);
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//     next();
// });

app.use("/api/auth", Authrouter);
app.use("/api/artist", Artistrouter);
app.use("/api/service", Servicerouter);
app.use("/api/appointment", Appointmentrouter);
app.use("/api/salon", Salonrouter);
app.use("/api/offer", Offerrouter);
app.use("/api/review", Reviewrouter);
app.use("/api/admin", Adminrouter);
app.use("/api/payments", paymentRouter);

// // Example route to send a WhatsApp message (for testing)
// app.post("/api/whatsapp/send", async (req, res) => {
//   try {
//     const { to, message } = req.body; // to should be like "91xxxxxxxxxx"
//     if (!to || !message) {
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: "Missing 'to' or 'message' in request body",
//         });
//     }
//     const recipientJid = `${to}@s.whatsapp.net`;
//     await sendWhatsAppMessage(recipientJid, message);
//     res
//       .status(200)
//       .json({ success: true, message: "WhatsApp message sending initiated." });
//   } catch (error) {
//     console.error("Error in /api/whatsapp/send:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

app.post("/api/notification", async (req, res) => {
  try {
    const { token, title, body } = req.body;
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: token,
    };
    messaging.send(message);
    res.status(200).json({ success: true, message: "Notification sent" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/addFcmToken", async (req, res) => {
  try {
    const { token } = req.body;

    messaging
      .subscribeToTopic(token, "all_users")
      .then((response) => {
        if (response.successCount > 0) {
          console.log("Successfully subscribed to topic:", response);
        } else {
          console.error("Failed to subscribe to topic:", response.errors);
        }
      })
      .catch((error) => {
        console.log("Error subscribing to topic:", error);
      });

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }
    // Assuming you have a User model and you're saving the token there
    res
      .status(200)
      .json({ success: true, message: "Token saved successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.use(notfound);
app.use(errorHandler);

// Connect to MongoDB
ConnectDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
      // Initialize WhatsApp connection when server starts
      // connectToWhatsApp().catch((err) =>
      //   console.error("Failed to connect to WhatsApp:", err)
      // );
    });
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB", error.message);
  });
