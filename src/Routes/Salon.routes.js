import { createSalon,getOwnerSalon,searchSalons,getSalonById,getSalonByLocation,uploadBrochure,AddPhotos,deleteSalon,UpdateSalon,getSalonsAppointments,getAllSalons,SalonsStats,AddStorePhotos,deleteStorePhotos,deleteCoverPhoto,deleteBrochure } from "../Controllers/Salon.controller.js";
import { verify,roleAuthorization } from "../middlewares/authenticated.js";
import upload from "../utils/s3Multer.js";
import express from "express";

const Salonrouter = express.Router();

Salonrouter.post("/create-salon",verify,roleAuthorization(['Owner']), upload.single("CoverImage"),createSalon);
Salonrouter.post("/upload-brochure",verify,roleAuthorization(['Owner']),upload.array("Brochure"),uploadBrochure);
Salonrouter.get("/get-owner-salon",verify,roleAuthorization(['Owner','subAdmin']),getOwnerSalon);
Salonrouter.post("/search-salons", searchSalons);
Salonrouter.get("/getSalon/:id", getSalonById);
Salonrouter.post("/getSalon", getSalonByLocation);
Salonrouter.delete("/delete-brochure",verify,roleAuthorization(['Owner']),deleteBrochure);
Salonrouter.delete("/delete-cover-Photo",verify,roleAuthorization(['Owner']),deleteCoverPhoto);

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
