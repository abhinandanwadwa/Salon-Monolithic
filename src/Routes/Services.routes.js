import { createServices,getServices,updateService,deleteService,deleteCategory } from "../Controllers/Service.controller.js";
import { verify,roleAuthorization } from "../middlewares/authenticated.js";
import express from "express";

const Servicerouter = express.Router();

Servicerouter.post("/create-services",verify,roleAuthorization(['Owner','subAdmin']),createServices);
Servicerouter.get("/get-services/:SalonId", getServices);
Servicerouter.put("/update-service/:serviceId",verify,roleAuthorization(['Owner','subAdmin']),updateService);
Servicerouter.delete("/delete-service/:serviceId",verify,roleAuthorization(['Owner']),deleteService);
Servicerouter.delete("/delete-category",verify,roleAuthorization(['Owner','subAdmin']),deleteCategory);

export default Servicerouter;