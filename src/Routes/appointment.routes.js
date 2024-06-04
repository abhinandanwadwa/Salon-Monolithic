import { createAppointmentByOwner,getTimeSlots,createAppointmentLock,BookAppointment } from "../Controllers/Appointments.controller.js";
import { verify,roleAuthorization } from "../middlewares/authenticated.js";

import express, { application } from "express";

const Appointmentrouter = express.Router();


Appointmentrouter.post("/createAppointmentByOwner",verify,roleAuthorization(['Owner','subAdmin']) ,createAppointmentByOwner);
Appointmentrouter.get("/getTimeSlots", getTimeSlots);
Appointmentrouter.post("/createAppointmentLock",verify,roleAuthorization(['Customer']), createAppointmentLock);
Appointmentrouter.post("/BookAppointment",verify,roleAuthorization(['Customer']), BookAppointment);

export default Appointmentrouter;