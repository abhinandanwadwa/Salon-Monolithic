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
  GetSalonDetails,
  AddStorePhotosbyAdmin,
  AddsalonPhotosbyAdmin,
  getSalonAllPhotos,
  deleteSalonPhotosByAdmin,
  deleteStorePhotosByAdmin,
} from "../Controllers/Salon.controller.js";
import { verify, roleAuthorization } from "../middlewares/authenticated.js";
import upload , { uploadToAzure } from "../utils/s3Multer.js";
import express from "express";

const Salonrouter = express.Router();

Salonrouter.post(
  "/create-salon",
  verify,
  roleAuthorization(["Owner"]),
  upload.single("CoverImage"),
  uploadToAzure,
  createSalon
);

Salonrouter.post(
  "/create-salon-admin",
  verify,
  roleAuthorization(["Admin"]),
  upload.single("CoverImage"),
  uploadToAzure,
  createSalonByAdmin
);



Salonrouter.post(
  "/upload-brochure",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  upload.array("brochurePhotos"),
  uploadToAzure,
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
  uploadToAzure,
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
  uploadToAzure,
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

Salonrouter.get(
  "/get-salon-all-photos/:salonId",
  verify,
  roleAuthorization(["Admin"]),
  getSalonAllPhotos
);

Salonrouter.post(
  "/add-store-Photos-by-admin/:salonId",
  verify,
  roleAuthorization(["Admin"]),
  upload.array("StorePhotos"),
  uploadToAzure,
  AddStorePhotosbyAdmin
);

Salonrouter.post(
  "/add-salon-Photos-by-admin/:salonId",
  verify,
  roleAuthorization(["Admin"]),
  upload.array("StorePhotos"),
  uploadToAzure,
  AddsalonPhotosbyAdmin
);

Salonrouter.post(
  "/delete-salon-Photos-by-admin/:salonId",
  verify,
  roleAuthorization(["Admin"]),
  deleteSalonPhotosByAdmin
);

Salonrouter.post(
  "/delete-store-Photos-by-admin/:salonId",
  verify,
  roleAuthorization(["Admin"]),
  deleteStorePhotosByAdmin
);


export default Salonrouter;
