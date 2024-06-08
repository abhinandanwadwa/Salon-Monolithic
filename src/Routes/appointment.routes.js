import { createAppointmentByOwner,getTimeSlots,createAppointmentLock,BookAppointment,cancelAppointment,rescheduleAppointment } from "../Controllers/Appointments.controller.js";
import { verify,roleAuthorization } from "../middlewares/authenticated.js";

import express, { application } from "express";

const Appointmentrouter = express.Router();


Appointmentrouter.post("/createAppointmentByOwner",verify,roleAuthorization(['Owner','subAdmin']) ,createAppointmentByOwner);
Appointmentrouter.post("/getTimeSlots", getTimeSlots);
Appointmentrouter.post("/createAppointmentLock",verify,roleAuthorization(['Customer']), createAppointmentLock);
Appointmentrouter.post("/BookAppointment",verify,roleAuthorization(['Customer']), BookAppointment);
Appointmentrouter.post("/cancelAppointment/:appointmentId",verify, cancelAppointment);
Appointmentrouter.post("/rescheduleAppointment",verify,rescheduleAppointment);

export default Appointmentrouter;