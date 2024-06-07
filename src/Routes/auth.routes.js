import { verifyUser,ChangeRole,logout } from "../Controllers/Auth.controller.js";

import express from "express";
import { roleAuthorization, verify } from "../middlewares/authenticated.js";

const Authrouter = express.Router();


Authrouter.post("/verifyUser", verifyUser);
Authrouter.post("/changeRole",verify,roleAuthorization(['Owner']) ,ChangeRole);
Authrouter.post("/logout",verify,logout);

export default Authrouter;
