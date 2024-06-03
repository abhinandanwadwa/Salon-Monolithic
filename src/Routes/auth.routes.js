import { verifyOTP,sendOTP,ChangeRole,logout } from "../Controllers/Auth.controller.js";

import express from "express";
import { roleAuthorization, verify } from "../middlewares/authenticated.js";

const Authrouter = express.Router();

Authrouter.post("/send-otp", sendOTP);
Authrouter.post("/verify-otp", verifyOTP);
Authrouter.post("/changeRole",verify,roleAuthorization(['Owner']) ,ChangeRole);
Authrouter.post("/logout",verify,logout);

export default Authrouter;
