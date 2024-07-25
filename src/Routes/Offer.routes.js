import { createOffer,getOffers,deleteOffer,validateOffer,testApi,getOffersofThatDay } from "../Controllers/Offer.controller.js";

import express from "express";
import { roleAuthorization, verify } from "../middlewares/authenticated.js";

const Offerrouter = express.Router();

Offerrouter.post("/create-offer",verify,roleAuthorization(['Owner','subAdmin']),createOffer);
Offerrouter.get("/get",verify,roleAuthorization(['Owner','subAdmin']) ,getOffers);
Offerrouter.delete("/delete-offer/:offerId",verify,roleAuthorization(['Owner','subAdmin']),deleteOffer);
Offerrouter.post("/validate-offer",verify,validateOffer);
Offerrouter.get("/test",verify,testApi);
Offerrouter.post("/get-offers-of-that-day",verify,getOffersofThatDay);

export default Offerrouter;
