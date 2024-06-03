import { createOffer,getOffers,deleteOffer,validateOffer } from "../Controllers/Offer.controller";

import express from "express";
import { roleAuthorization, verify } from "../middlewares/authenticated";

const Offerrouter = express.Router();

Offerrouter.post("/create-offer",verify,roleAuthorization(['Owner','subAdmin']),createOffer);
Offerrouter.get("/get",verify,roleAuthorization(['Owner','subAdmin']) ,getOffers);
Offerrouter.delete("/delete-offer/:offerId",verify,roleAuthorization(['Owner','subAdmin']),deleteOffer);
Offerrouter.post("/validate-offer",validateOffer);

export default Offerrouter;