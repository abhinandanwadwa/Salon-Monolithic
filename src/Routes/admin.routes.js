import {
  GetAllCustomers,
  GetAllAppointments,
  sendNotifications,
  AddBanner,
  DelteBanner,
  GetAllBanners,
} from "../Controllers/Admin.controller.js";
import express from "express";
import { verify, roleAuthorization } from "../middlewares/authenticated.js";
import upload from "../utils/s3Multer.js";

const Adminrouter = express.Router();

Adminrouter.get(
  "/get-all-customers",
  verify,
  roleAuthorization(["Admin"]),
  GetAllCustomers
);

Adminrouter.get(
  "/get-all-appointments",
  verify,
  roleAuthorization(["Admin"]),
  GetAllAppointments
);

Adminrouter.post(
  "/send-notification",
  verify,
  roleAuthorization(["Admin"]),
  sendNotifications
);

Adminrouter.post(
  "/add-banner",
  upload.single("imageUrl"),
  verify,
  roleAuthorization(["Admin"]),
  AddBanner
);

Adminrouter.get(
  "/get-all-banners",

  verify,
  roleAuthorization(["Admin"]),
  GetAllBanners
);

Adminrouter.delete(
  "/delete-banner/:id",
  verify,
  roleAuthorization(["Admin"]),
  DelteBanner
);

// Adminrouter.post(


export default Adminrouter;
