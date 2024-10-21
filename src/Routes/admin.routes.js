import { GetAllCustomers,GetAllAppointments } from "../Controllers/Admin.controller.js";
import express from "express";
import { verify,roleAuthorization } from "../middlewares/authenticated.js";

const Adminrouter = express.Router();

Adminrouter.get("/get-all-customers",verify,roleAuthorization(["Admin"]), GetAllCustomers);

Adminrouter.get("/get-all-appointments",verify,roleAuthorization(["Admin"]), GetAllAppointments);

export default Adminrouter;