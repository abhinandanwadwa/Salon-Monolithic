import { verifyUser,ChangeRole,logout ,sendOTP,verifyOTP,verifyToken} from "../Controllers/Auth.controller.js";

import express from "express";
import { roleAuthorization, verify } from "../middlewares/authenticated.js";

const Authrouter = express.Router();


Authrouter.post("/verifyUser", verifyUser);
Authrouter.post("/send-otp",sendOTP);
Authrouter.post("/verify-otp",verifyOTP);
Authrouter.post("/changeRole",verify,roleAuthorization(['Owner']) ,ChangeRole);
Authrouter.post("/logout",verify,logout);
Authrouter.post("/verifyToken",verifyToken);

export default Authrouter;
