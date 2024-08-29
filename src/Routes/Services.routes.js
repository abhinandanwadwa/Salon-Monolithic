import {
  createServices,
  getServices,
  updateService,
  deleteService,
  deleteCategory,
  createService,
  CreateServiceByExcel,
  DeleteAllServices,
} from "../Controllers/Service.controller.js";
import { verify, roleAuthorization } from "../middlewares/authenticated.js";
import express from "express";

const Servicerouter = express.Router();

Servicerouter.post(
  "/create-services",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  createServices
);

Servicerouter.get("/get-services/:SalonId", getServices);

Servicerouter.put(
  "/update-service/:serviceId",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  updateService
);

Servicerouter.delete(
  "/delete-service/:serviceId",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  deleteService
);

Servicerouter.delete(
  "/delete-category",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  deleteCategory
);

Servicerouter.post(
  "/create-service",
  verify,
  roleAuthorization(["Owner", "subAdmin"]),
  createService
);

Servicerouter.post(
  "/create-service-by-excel/:salonId",
  verify,
  roleAuthorization(["Admin"]),
  CreateServiceByExcel
);

Servicerouter.delete(
  "/delete-all-services",
  verify,
  roleAuthorization(["Admin"]),
  DeleteAllServices
);

export default Servicerouter;
