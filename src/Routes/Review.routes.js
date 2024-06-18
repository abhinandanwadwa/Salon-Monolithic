import { createReview } from "../Controllers/Reviews.controller.js";

import express from "express";
import { verify } from "../middlewares/authenticated.js";

const Reviewrouter = express.Router();

Reviewrouter.post("/createReview",verify, createReview);

export default Reviewrouter;