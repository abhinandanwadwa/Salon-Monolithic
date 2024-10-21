import { GetAllCustomers,GetAllAppointments } from "../Controllers/Admin.controller";
import express from "express";
import { verify,roleAuthorization } from "../middlewares/authenticated";

const Adminrouter = express.Router();

Adminrouter.get("/get-all-customers",verify,roleAuthorization["Admin"], GetAllCustomers);

Adminrouter.get("/get-all-appointments",verify,roleAuthorization["Admin"], GetAllAppointments);

export default Adminrouter;