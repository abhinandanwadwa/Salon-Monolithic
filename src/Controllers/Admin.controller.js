import UserModel from "../Models/User.js";
import SalonModel from "../Models/Salon.js";
import AppointmentModel from "../Models/Appointments.js";
import CustomerModel from "../Models/Customer.js";

const GetAllCustomers = async (req, res) => {
    try {
        const Customers = await CustomerModel.find().populate("userId");
        return res.status(200).json({
            success: true,
            data: Customers,
        });
    } catch (error) {
      console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error in fetching customers",
        });  
    }
}

const GetAllAppointments = async (req, res) => {
    try {
        const Appointments = await AppointmentModel.find().populate("user").populate("salon");
        return res.status(200).json({
            success: true,
            data: Appointments,
        });
    } catch (error) {
      console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error in fetching appointments",
        });  
    }
}

export { GetAllCustomers, GetAllAppointments };