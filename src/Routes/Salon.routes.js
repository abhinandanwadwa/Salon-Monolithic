import { createSalon,getOwnerSalon,searchSalons,getSalonById,getSalonByLocation,uploadBrochure,AddPhotos,deleteSalon,UpdateSalon,getSalonsAppointments,getAllSalons,SalonsStats,AddStorePhotos,deleteStorePhotos } from "../Controllers/Salon.controller.js";
import { verify,roleAuthorization } from "../middlewares/authenticated.js";
import upload from "../utils/s3Multer.js";
import express from "express";

const Salonrouter = express.Router();

Salonrouter.post("/create-salon",verify,roleAuthorization(['Owner']), upload.fields([
  { name: "CoverImage", maxCount: 1 },
]),upload.array("StorePhotos"),createSalon);
Salonrouter.post("/upload-brochure",verify,roleAuthorization(['Owner']),upload.single("Brochure"),uploadBrochure);
Salonrouter.get("/get-owner-salon",verify,roleAuthorization(['Owner','subAdmin']),getOwnerSalon);
Salonrouter.post("/search-salons", searchSalons);
Salonrouter.get("/getSalon/:id", getSalonById);
Salonrouter.post("/getSalon", getSalonByLocation);

Salonrouter.post(
  "/add-cover-Photo",
  verify,
  roleAuthorization(["Owner"]),
  upload.single("CoverImage"),
  AddPhotos
);

Salonrouter.post(
  "/delete-store-Photos",
  verify,
  roleAuthorization(["Owner"]),
  deleteStorePhotos
);

Salonrouter.post(
  "/add-store-Photos",
  verify,
  roleAuthorization(["Owner"]),
  upload.array("StorePhotos"),
  AddStorePhotos
)

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

export default Salonrouter;
