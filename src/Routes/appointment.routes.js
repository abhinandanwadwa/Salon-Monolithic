import { createAppointmentByOwner,getTimeSlots,cancelAppointment,rescheduleAppointment,editAppointment,CompleteAppointment,getCost,CreateAppointment ,getAppointments,getAppointmentsById} from "../Controllers/Appointments.controller.js";
import { verify,roleAuthorization } from "../middlewares/authenticated.js";

import express, { application } from "express";

const Appointmentrouter = express.Router();


Appointmentrouter.post("/createAppointmentByOwner",verify,roleAuthorization(['Owner','subAdmin']) ,createAppointmentByOwner);
Appointmentrouter.post("/getTimeSlots", getTimeSlots);
Appointmentrouter.post("/cancelAppointment/:appointmentId",verify, cancelAppointment);
Appointmentrouter.post("/rescheduleAppointment",verify,rescheduleAppointment);
Appointmentrouter.post("/CompleteAppointment/:appointmentId",verify,roleAuthorization(['Owner','Artist','subAdmin']),CompleteAppointment);
Appointmentrouter.post("/editAppointment",verify,roleAuthorization(['Owner','Artist','subAdmin']),editAppointment);
Appointmentrouter.post("/getCost",verify,getCost);
Appointmentrouter.post("/CreateAppointment",verify,CreateAppointment);
Appointmentrouter.get("/getAppointments",verify,getAppointments);
Appointmentrouter.get("/getAppointments/:appointmentId",verify,getAppointmentsById);

export default Appointmentrouter;