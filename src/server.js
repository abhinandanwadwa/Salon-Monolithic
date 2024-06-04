import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import ConnectDB from './DB/index.js';
import { errorHandler,notfound } from './middlewares/error.js';

import Authrouter from './Routes/auth.routes.js';
import Artistrouter from './Routes/Artist.routes.js';
import Servicerouter from './Routes/Services.routes.js';
import Appointmentrouter from './Routes/appointment.routes.js';
import Salonrouter from './Routes/Salon.routes.js';
import Offerrouter from './Routes/Offer.routes.js';



const app = express();
dotenv.config();
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(bodyParser.json());


app.use('/api/auth', Authrouter);
app.use('/api/artist', Artistrouter);
app.use('/api/service', Servicerouter);
app.use('/api/appointment', Appointmentrouter);
app.use('/api/salon', Salonrouter);
app.use('/api/offer', Offerrouter);


app.use(notfound);
app.use(errorHandler);


// Connect to MongoDB
ConnectDB().then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
}).catch((error) => {
    console.log('Error connecting to MongoDB', error.message);
});