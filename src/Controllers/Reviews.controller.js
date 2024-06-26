import ReviewModel from "../Models/review.js";
import ArtistModel from "../Models/Artist.js";
import SalonModel from "../Models/Salon.js";
import AppointmentModel from "../Models/Appointments.js";
import CustomerModel from "../Models/Customer.js";

const createReview = async (req, res) => {
    try {
        const { appointmentId, rating, review } = req.body;
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

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const customer = await CustomerModel.findById({ userId: user });

        const ReviewRating = new ReviewModel({
            customerId: customer._id,
            Rating: rating,
            Review: review,
        });

        const NewReview = await ReviewRating.save();

        Artist.reviews.push(NewReview._id);
        Salon.Reviews.push(NewReview._id);

        await Artist.save();
        await Salon.save();

        appointment.Review = NewReview._id;
        await appointment.save();


        return res.status(201).json({ 
            success: true,
            message: "Review Created" 
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ 
            success: false,
            message: "Internal Server Error" 
        });
    }
}

export { createReview };