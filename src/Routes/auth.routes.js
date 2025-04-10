import {
  verifyUser,
  ChangeRole,
  logout,
  sendOTP,
  verifyOTP,
  verifyToken,
  addName,
  verifyOwner,
  LoginAdmin,
  RegisterAdmin,
  getSalonsubAdmins,
  removesubAdmin,
  deleteOwner,
  getUserDetails,
} from "../Controllers/Auth.controller.js";
import rateLimit from "express-rate-limit";

import express from "express";
import { roleAuthorization, verify } from "../middlewares/authenticated.js";

const Authrouter = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 100 requests per windowMs
});

Authrouter.post("/verifyUser", verifyUser);
//
Authrouter.post("/send-otp", limiter, sendOTP);

Authrouter.post("/getUserDetails", verify, getUserDetails);

Authrouter.post("/verify-otp", verifyOTP);

Authrouter.post(
  "/changeRole",
  verify,
  roleAuthorization(["Owner"]),
  ChangeRole
);

Authrouter.post("/logout", verify, logout);

Authrouter.post("/verifyToken", verifyToken);

Authrouter.post("/updateUser", verify, addName);

Authrouter.post("/verifyOwner", verifyOwner);

Authrouter.post("/loginAdmin", LoginAdmin);

Authrouter.post("/registerAdmin", RegisterAdmin);

Authrouter.get(
  "/getSalonsubAdmins",
  verify,
  roleAuthorization(["Owner"]),
  getSalonsubAdmins
);

Authrouter.post(
  "/removesubAdmin/:artistId",
  verify,
  roleAuthorization(["Owner"]),
  removesubAdmin
);

Authrouter.delete("/deleteOwner", deleteOwner);

export default Authrouter;
