import {
  createSalon,
  getOwnerSalon,
  searchSalons,
  getSalonById,
  getSalonByLocation,
  uploadBrochure,
  AddPhotos,
  deleteSalon,
  UpdateSalon,
  getSalonsAppointments,
  getAllSalons,
  SalonsStats,
} from "../Controllers/Salon.controller.js";
import { verify, roleAuthorization } from "../middlewares/authenticated.js";
import upload from "../utils/s3Multer.js";
import express from "express";

const Salonrouter = express.Router();

Salonrouter.post(
  "/create-salon",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  upload.fields([
    { name: "CoverImage", maxCount: 1 },
    { name: "StorePhotos", maxCount: 10 },
    { name: "Brochure", maxCount: 1 },
  ]),
  createSalon
);

Salonrouter.post(
  "/upload-brochure",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  upload.single("Brochure"),
  uploadBrochure
);

Salonrouter.get(
  "/get-owner-salon",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  getOwnerSalon
);

Salonrouter.post("/search-salons", searchSalons);

Salonrouter.get("/getSalon/:id", getSalonById);

Salonrouter.post("/getSalon", getSalonByLocation);

Salonrouter.post(
  "/add-photos",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  upload.fields([
    { name: "CoverImage", maxCount: 1 },
    { name: "ProfilePhotos", maxCount: 10 },
  ]),
  AddPhotos
);

Salonrouter.delete(
  "/delete-salon",
  verify,
  roleAuthorization(["Owner"]),
  deleteSalon
);

Salonrouter.get(
  "/get-salon-appointments",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  getSalonsAppointments
);

Salonrouter.put(
  "/update-salon",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  UpdateSalon
);

Salonrouter.get(
  "/get-all-salons",
  verify,
  roleAuthorization(["Admin"]),
  getAllSalons
);

Salonrouter.get(
  "/salons-stats",
  verify,
  roleAuthorization(["Admin"]),
  SalonsStats
);

export default Salonrouter;
