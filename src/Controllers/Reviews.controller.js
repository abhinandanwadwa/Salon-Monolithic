import ReviewModel from "../Models/review.js";
import ArtistModel from "../Models/Artist.js";
import SalonModel from "../Models/Salon.js";
import AppointmentModel from "../Models/Appointments.js";
import CustomerModel from "../Models/Customer.js";
import UserModel from "../Models/User.js";
import { messaging,db} from "./fcmClient.js";

const createReview = async (req, res) => {
    try {
        const {name, appointmentId, rating, review,date } = req.body;
        const user = req.user._id
        const appointment = await AppointmentModel.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if(appointment.Status !== 'Completed'){
            return res.status(400).json({ message: "Appointment not completed" });
        }

        if(appointment.Review){
            return res.status(400).json({ message: "Review already created" });
        }

        const Artist = await ArtistModel.findById(appointment.artist);
        const Salon = await SalonModel.findById(appointment.salon);

        const ArtistUser = await UserModel.findOne(Artist.userId);
        const SalonOwner = await UserModel.findOne(Salon.userId);

        let salonTokens = [];
        let Ids = [];

        for(let i = 0; i < Salon.subAdmins.length; i++){
            const subAdmin = await UserModel.findOne(Salon.subAdmins[i]);
            if(subAdmin.token){
                salonTokens.push(subAdmin.token);
                
            }
            Ids.push(subAdmin._id);
        }

        Ids.push(Salon.userId);
        Ids.push(Artist.userId);

        if(ArtistUser.token){
            salonTokens.push(ArtistUser.token);
        }

        if(SalonOwner.token){
            salonTokens.push(SalonOwner.token);
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const customer = await CustomerModel.findOne({ userId: user });

        const ReviewRating = new ReviewModel({
            name: name,
            customerId: customer._id,
            Rating: rating,
            Review: review,
            date: date
        });

        const NewReview = await ReviewRating.save();



        Artist.reviews.push(NewReview._id);
        Salon.Reviews.push(NewReview._id);

        await Artist.save();
        await Salon.save();

        appointment.Review = NewReview._id;
        await appointment.save();

        salonTokens = [...new Set(salonTokens)];

        if(salonTokens.length > 0){
            const message = {
                notification: {
                    title: 'New Review',
                    body: `${name} gave you a rating`,
                },
                tokens: salonTokens
            }
    
            messaging.sendEachForMulticast(message)
            .then((response) => {
                console.log('Successfully sent message:', response);
            })
            .catch((error) => {
                console.log('Error sending message:', error);
            });
        }

        Ids = [...new Set(Ids)];

        const nameArtist = Artist.name || ArtistUser.name || "Artist";

        db.collection("Notification").add({
            title: "New Review",
            body: `${name} gave you a rating`,
            Ids: Ids.map(id => id.toString()),
            read: false,
            related: nameArtist,
            createdAt: new Date().toISOString(),
          }).then((docRef) => {
            console.log("Document written with ID: ", docRef.id);
          }).catch((error) => {
            console.error("Error adding document: ", error);
          });
        
        
        return res.status(201).json({ 
            success: true,
            message: "Review Created" 
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false,
            message: "Internal Server Error"+ error 
        });
    }
}

export { createReview };