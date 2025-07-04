import SalonModel from "../Models/Salon.js";
import AppointmentModel from "../Models/Appointments.js";
import CustomerModel from "../Models/Customer.js";
import Banner from "../Models/Banner.js";
import { messaging } from "./fcmClient.js";
import UserModel from "../Models/User.js"; // Ensure this path is correct

const topics = {
  all: "/topics/all_users",
  customers: "/topics/customers",
  salons: "/topics/owners",
};

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
};

//apply pagination
const GetAllAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const appointments = await AppointmentModel.find()
      .populate({
        path: "user",
        populate: {
          path: "userId", // Assuming Customer model has a userId field referencing User
          select: "name phoneNumber email", // Select specific fields from User
        },
      })
      .populate({
        path: "services.service",
        model: "Service", // Explicitly state the model for nested population
      })
      .populate({
        path: "salon",
        // You can add specific selections for salon if needed
        // select: 'SalonName address SalonPhoneNumber CoverImage'
      })
      .populate("Review") // Populates the Review field
      .populate("offerApplied") // Populates the offerApplied field
      .sort({ createdAt: -1 }) // Optional: sort by creation date
      .skip(skip)
      .limit(limitNumber);

    const totalAppointments = await AppointmentModel.countDocuments();

    return res.status(200).json({
      success: true,
      data: appointments,
      totalPages: Math.ceil(totalAppointments / limitNumber),
      currentPage: pageNumber,
      totalAppointments: totalAppointments,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching appointments",
    });
  }
};

const AddBanner = async (req, res) => {
  try {
    const { title, link, isActive } = req.body;

    const imageUrl = req.file.location;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    // If this banner is set to active, deactivate all other banners
    if (isActive && isActive.toString() === "true") {
      await Banner.updateMany({}, { $set: { isActive: false } });
    }

    const newBanner = new Banner({
      title,
      imageUrl,
      link,
      isActive: isActive === undefined ? false : isActive,
    });
    await newBanner.save();
    return res.status(201).json({
      success: true,
      data: newBanner,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in adding banner",
    });
  }
};

const GetAllBanners = async (req, res) => {
  try {
    const Banners = await Banner.find();
    return res.status(200).json({
      success: true,
      data: Banners,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching banners",
    });
  }
};

const getActiveBanner = async (req, res) => {
  //send the first active banner
  try {
    const banner = await Banner.find({ isActive: true });
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "No active banner found",
      });
    }
    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching active banner",
    });
  }
};

const DelteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in deleting banner",
    });
  }
};

const toggleBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in toggling banner",
    });
  }
};

const sendNotifications = async (req, res) => {
  try {
    const { type, title, body } = req.body;

    if (!type || !title || !body) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields. Please provide 'type', 'title', and 'body'.",
      });
    }

    // Validate type
    if (!topics[type]) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Valid types are 'all', 'customers', 'salons'.",
      });
    }

    // Get the topic string
    const topic = topics[type];

    // Construct message payload
    const messagePayload = {
      topic, // sending to the topic
      notification: {
        title,
        body,
      },
      android: {
        priority: "high",
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
      },
    };

    // Send message via FCM
    const response = await messaging.send(messagePayload);

    res.status(200).json({
      success: true,
      message: "Notification sent successfully.",
      fcmResponse: response,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    let errorMessage = "Failed to send notification.";
    if (error.code && error.message) {
      errorMessage = `Firebase error: ${error.code} - ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    res
      .status(500)
      .json({ success: false, message: errorMessage, error: error.toString() });
  }
};

export {
  GetAllCustomers,
  GetAllAppointments,
  AddBanner,
  GetAllBanners,
  getActiveBanner,
  DelteBanner,
  sendNotifications,
  toggleBanner,
};
