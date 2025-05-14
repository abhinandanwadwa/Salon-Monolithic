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
  createSalonByAdmin,
  AddStorePhotos,
  deleteStorePhotos,
  searchSalonss,
  deleteCoverPhoto,
  deleteBrochure,
  GetSalonDetails
} from "../Controllers/Salon.controller.js";
import { verify, roleAuthorization } from "../middlewares/authenticated.js";
import upload from "../utils/s3Multer.js";
import express from "express";

const Salonrouter = express.Router();

Salonrouter.post(
  "/create-salon",
  verify,
  roleAuthorization(["Owner"]),
  upload.single("CoverImage"),
  createSalon
);

Salonrouter.post(
  "/create-salon-admin",
  verify,
  roleAuthorization(["Admin"]),
  upload.single("CoverImage"),
  createSalonByAdmin
);



Salonrouter.post(
  "/upload-brochure",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  upload.array("brochurePhotos"),
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

Salonrouter.delete(
  "/delete-brochure",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  deleteBrochure
);

Salonrouter.delete(
  "/delete-cover-Photo",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  deleteCoverPhoto
);

Salonrouter.post("/searchSalons", searchSalonss);

Salonrouter.post(
  "/add-cover-Photo",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  upload.single("CoverImage"),
  AddPhotos
);

Salonrouter.post(
  "/delete-store-Photos",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  deleteStorePhotos
);

Salonrouter.post(
  "/add-store-Photos",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  upload.array("StorePhotos"),
  AddStorePhotos
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
  roleAuthorization(["Owner"]),
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

Salonrouter.get(
  "/get-salon-details/:id",
  verify,
  roleAuthorization(["Admin"]),
  GetSalonDetails
);

export default Salonrouter;
