import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import ConnectDB from "./DB/index.js";
import { errorHandler, notfound } from "./middlewares/error.js";

import Authrouter from "./Routes/auth.routes.js";
import Artistrouter from "./Routes/Artist.routes.js";
import Servicerouter from "./Routes/Services.routes.js";
import Appointmentrouter from "./Routes/appointment.routes.js";
import Salonrouter from "./Routes/Salon.routes.js";
import Offerrouter from "./Routes/Offer.routes.js";
import Reviewrouter from "./Routes/Review.routes.js";
import { messaging } from "./Controllers/fcmClient.js";

const app = express();
dotenv.config();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "https://www.salondekho.in",
      "https://admin.salondekho.in",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

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

app.use(notfound);
app.use(errorHandler);

// Connect to MongoDB
ConnectDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB", error.message);
  });
