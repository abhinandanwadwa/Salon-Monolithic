import { createArtists,GetArtistbyService,getArtistsBySalon,CreateArtistWithAllServices,updateArtist,deleteArtist,updateArtistServicePrice,getArtistData} from "../Controllers/Artist.controller.js";
import { verify,roleAuthorization } from "../middlewares/authenticated.js";

import express from "express";

const Artistrouter = express.Router();

Artistrouter.post("/create-artists",verify,roleAuthorization(['Owner','subAdmin']),createArtists);
Artistrouter.post("/create-artist-with-services",verify,roleAuthorization(['Owner']),CreateArtistWithAllServices);
Artistrouter.post("/get-artist-by-service/:salonid",GetArtistbyService);
Artistrouter.get("/get-artist-by-salon",verify,
roleAuthorization(['Owner','subAdmin']),getArtistsBySalon);
Artistrouter.put("/update-artist/:artistId",verify,roleAuthorization(['Owner','subAdmin']),updateArtist);
Artistrouter.delete("/delete-artist/:artistId",verify,roleAuthorization(['Owner']),deleteArtist);
Artistrouter.put("/update-artist-service-price/:artistId",verify,roleAuthorization(['Artist']),updateArtistServicePrice);
Artistrouter.get("/get-artist-data",verify,roleAuthorization(['Artist']),getArtistData);

export default Artistrouter;
