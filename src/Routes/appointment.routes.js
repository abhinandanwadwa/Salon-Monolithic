import { createAppointmentByOwner,getTimeSlots,cancelAppointment,rescheduleAppointment,editAppointment,CompleteAppointment,getCost } from "../Controllers/Appointments.controller.js";
import { verify,roleAuthorization } from "../middlewares/authenticated.js";

import express, { application } from "express";

const Appointmentrouter = express.Router();


Appointmentrouter.post("/createAppointmentByOwner",verify,roleAuthorization(['Owner','subAdmin']) ,createAppointmentByOwner);
Appointmentrouter.post("/getTimeSlots", getTimeSlots);
Appointmentrouter.post("/cancelAppointment/:appointmentId",verify, cancelAppointment);
Appointmentrouter.post("/rescheduleAppointment",verify,rescheduleAppointment);
Appointmentrouter.post("/CompleteAppointment",verify,roleAuthorization(['Owner']),CompleteAppointment);
Appointmentrouter.post("/editAppointment",verify,roleAuthorization(['Owner']),editAppointment);
Appointmentrouter.post("/getCost",verify,getCost);

export default Appointmentrouter;