import mongoose from "mongoose";
import SalonModel from "../Models/Salon.js";
import Service from "../Models/Services.js";
import UserModel from "../Models/User.js";
import NodeGeocoder from "node-geocoder";
import bycrypt from "bcryptjs";
import otpGenerator from "otp-generator";
import google from "googleapis";
import sheets, { spreadsheetId } from "./sheetClient.js";
import AppointmentModel from "../Models/Appointments.js";
import ServiceArtist from "../Models/ServiceArtist.js";
import ArtistModel from "../Models/Artist.js";
import ReviewModel from "../Models/review.js";
import OfferModel from "../Models/Offer.js";

/**
 * @desc Create a new salon
 * @method POST
 * @route /api/salon/create-salon
 * @access Private
 * @requestBody { SalonName: String, OwnerName: String, BusinessType: String, Gender: String, workingDays: [String], startTime: String, endTime: String, location: { type: String, coordinates: [Number] }, CoverImage: String, StorePhotos: [String], Brochure: String , Address: { Address1: String, Address2: String, Landmark: String, Pincode: Number, City: String, State: String Country: String}}
 */

const createSalon = async (req, res) => {
  try {
    const { Address1, Address2, Landmark, Pincode, City, State, Country } =
      req.body.Address;
    const {
      SalonName,
      OwnerName,
      BusinessType,
      Gender,
      workingDays,
      startTime,
      endTime,
      location,
      CoverImage,
      StorePhotos,
      Brochure,
    } = req.body;

    let locationDetails = null;

    // Get authenticated user's ID
    const { _id: userId } = req.user;
    const user = await UserModel.findById(userId);

    const isSalon = await SalonModel.findOne({ userId });
    if (isSalon) {
      return res.status(400).json({
        success: false,
        message: "User is already a salon owner",
      });
    }

    if (!Address1 || !City || !State || !Country || !Pincode) {
      return res.status(400).json({
        success: false,
        message: "Address details are incomplete",
      });
    }

    const address = {
      Address1,
      Address2,
      Landmark,
      Pincode,
      City,
      State,
      Country,
    };

    // Geocoding
    if (!location) {
      const options = {
        provider: "google",
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      };

      const geocoder = NodeGeocoder(options);
      const mergedAddress = `${Address1} ${Address2}`;
      const response = await geocoder.geocode(
        `${mergedAddress} ${City} ${State} ${Country}`
      );

      if (!response.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid address",
        });
      }

      locationDetails = {
        type: "Point",
        coordinates: [response[0].latitude, response[0].longitude],
      };
    }

    const salon = new SalonModel({
      userId,
      SalonName,
      OwnerName,
      address,
      BusinessType,
      Gender,
      workingDays,
      startTime,
      endTime,
      salonPhoneNumber: user.phoneNumber,
      CoverImage,
      StorePhotos,
      Brochure,
      location: locationDetails || location,
    });

    const password = otpGenerator.generate(8, {
      upperCaseAlphabets: true,
      specialChars: false,
      lowerCaseAlphabets: true,
    });

    // Write the salon name , phoneNumber , OWner name and password to google sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A1:D1",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",

      resource: {
        values: [[SalonName, user.phoneNumber, OwnerName, password]],
      },
    });

    const salt = await bycrypt.genSalt(10);
    user.password = await bycrypt.hash(password, salt);

    user.isSalon = true;
    await user.save();
    await salon.save();

    return res.status(201).json({
      success: true,
      message: "Salon created successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in creating salon",
    });
  }
};

/**
 * @desc Update salon
 * @method PUT
 * @route /api/salon/update-salon
 * @access Private
 * @requestBody { salonName: String, ownerName: String, ShopPhoneNumber: Number, location: { type: String, coordinates: [Number] }, workingDays: [String], startTime: String, endTime: String, Insta: String, Facebook: String }
 */

const UpdateSalon = async (req, res) => {
  try {
    const {
      SalonName,
      OwnerName,
      salonPhoneNumber,
      location,
      workingDays,
      startTime,
      endTime,
      Instagram,
      Facebook,
    } = req.body;

    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    salon.SalonName = SalonName || salon.SalonName;
    salon.OwnerName = OwnerName || salon.OwnerName;
    salon.salonPhoneNumber = salonPhoneNumber || salon.salonPhoneNumber;
    salon.location = location || salon.location;
    salon.workingDays = workingDays || salon.workingDays;
    salon.startTime = startTime || salon.startTime;
    salon.endTime = endTime || salon.endTime;
    salon.Instagram = Instagram || salon.Instagram || null;
    salon.Facebook = Facebook || salon.Facebook || null;

    await salon.save();

    return res.status(200).json({
      success: true,
      message: "Salon updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in updating salon",
    });
  }
};

/**
 * @desc Get salon by location
 * @method POST
 * @route /api/salon/getSalon
 * @access Public
 * @requestBody { latitude: Number, longitude: Number }
 * @response { Salon }
 */

const getSalonByLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    console.log(req.body);
    const salons = await SalonModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [latitude, longitude] }, // Note the order: [longitude, latitude]
          distanceField: "distance",
          maxDistance: 10000,
          spherical: true,
        },
      },
      {
        $lookup: {
          from: "offers", // The collection name in the database
          localField: "_id",
          foreignField: "salon",
          as: "offers",
        },
      },
      {
        $lookup: {
          from: "reviews", // The collection name in the database
          localField: "Reviews",
          foreignField: "_id",
          as: "reviews",
        },
      },
    ]);

    return res.status(200).json(salons);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching salon",
    });
  }
};

/**
 * @desc Get salon by ID
 * @method GET
 * @route /api/salon/getSalon/:id
 * @access Public
 * @request { id }
 */

const getSalonById = async (req, res) => {
  try {
    const { id } = req.params;
    const salon = await SalonModel.findById(id)
      .populate("Services")
      .populate({
        path: "Artists",
        populate: {
          path: "reviews",
        },
      })
      .populate("offers")
      .populate({
        path: "Reviews",
      });
    // Fetch customer reviews and populate userId field
    const customerReviews = await ReviewModel.find({
      _id: { $in: salon.Reviews },
    }).populate({
      path: "userId",
      model: "Customer",
      select: "name",
    });

    // Map reviews to include customer name
    const reviewsWithCustomerName = customerReviews.map((review) => ({
      ...review._doc,
      userName: review.userId.name,
    }));

    // Add the reviews with customer names to the salon document
    salon._doc.customerReviews = reviewsWithCustomerName;

    return res.status(200).json(salon);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching salon",
    });
  }
};

/**
 * @desc Get salon by owner
 * @method GET
 * @route /api/salon/get-owner-salon
 * @access Private
 * @request None
 */

const getOwnerSalon = async (req, res) => {
  try {
    const OwnerId = req.user._id;
    const salons = await SalonModel.find({ userId: OwnerId })
      .populate("Services")
      .populate({
        path: "Artists",
        populate: {
          path: "appointments",
        },
      })
      .populate("appointments")
      .populate("userId", "phoneNumber");
    if (!salons.length) {
      return res.status(404).json({
        success: false,
        message: "No salon found",
      });
    }
    return res.status(200).json({
      success: true,
      data: salons,
      message: "Salon found",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching salon",
    });
  }
};

/**
 * @desc Search salons
 * @method POST
 * @route /api/salon/search-salons
 * @access Public
 * @requestBody { service: String, address: String, location: { latitude: Number, longitude: Number } }
 * @response { Salon }
 */

const searchSalons = async (req, res) => {
  try {
    const { service, address, location } = req.body;
    let regex,
      matchingServices,
      salonIds = [],
      locations,
      salons;

    // Handle service search
    if (service) {
      regex = new RegExp(service, "i"); // 'i' makes it case-insensitive
      matchingServices = await Service.find({
        ServiceName: { $regex: regex },
      }).populate("salon", "_id");
      salonIds = [
        ...new Set(
          matchingServices.map(
            (service) => service.salon && service.salon._id.toString()
          )
        ),
      ];
    }

    console.log(salonIds);

    // Handle address geocoding
    if (address) {
      const options = {
        provider: "google",
        apiKey: process.env.GOOGLE_MAPS_API_KEY, // Make sure to set your Google Maps API key in the environment variables
      };
      const geocoder = NodeGeocoder(options);
      const response = await geocoder.geocode(address);
      if (!response.length) {
        return res.status(400).json({ error: "Invalid address" });
      }

      locations = {
        type: "Point",
        coordinates: [response[0].latitude, response[0].longitude], // Corrected order to [longitude, latitude]
      };
    }

    // Handle provided coordinates directly
    if (!address && !service && location) {
      locations = {
        type: "Point",
        coordinates: [location.latitude, location.longitude], // Corrected order to [longitude, latitude]
      };
    }

    // Construct query based on provided inputs
    // Construct aggregation pipeline
    const aggregationPipeline = [];

    // Add $geoNear stage if locations are available
    if (locations) {
      aggregationPipeline.push({
        $geoNear: {
          near: locations,
          distanceField: "distance",
          maxDistance: 200000, // 20 kilometers
          spherical: true,
        },
      });
    }

    // Add $match stage to filter by salon IDs
    if (salonIds.length > 0) {
      aggregationPipeline.push({
        $match: {
          _id: { $in: salonIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      });
    }

    aggregationPipeline.push(
      {
        $lookup: {
          from: "offers", // The collection name in the database
          localField: "_id",
          foreignField: "salon",
          as: "offers",
        },
      },
      {
        $lookup: {
          from: "reviews", // The collection name in the database
          localField: "Reviews",
          foreignField: "_id",
          as: "reviews",
        },
      }
    );

    // Execute aggregation pipeline
    salons = await SalonModel.aggregate(aggregationPipeline);

    if (!salons.length)
      return res.status(404).json({
        success: false,
        message: "No salons found",
      });

    return res.status(200).json({
      success: true,
      data: salons,
      message: "Salons found",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error in fetching salons" });
  }
};

/**
 * @desc Upload salon brochure
 * @method POST
 * @route /api/salon/upload-brochure
 * @access Private
 * @requestBody { Brochure: String }
 */

const uploadBrochure = async (req, res) => {
  try {
    const { Brochure } = req.body;

    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    salon.Brochure = Brochure || salon.Brochure || null;
    await salon.save();
    return res.status(200).json({
      success: true,
      message: "Brochure uploaded successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in uploading brochure",
    });
  }
};

/**
 * @desc Delete salon
 * @method DELETE
 * @route /api/salon/delete-salon
 * @access Private
 * @request None
 */

const deleteSalon = async (req, res) => {
  try {
    const user = req.user._id;

    const salon = await SalonModel.findOne({ userId: user });

    const services = await Service.find({ salon: salon._id });

    const serviceArtist = await ServiceArtist.find({
      Service: { $in: services.map((service) => service._id) },
    });

    if (serviceArtist.length) {
      await ServiceArtist.deleteMany({
        Service: { $in: services.map((service) => service._id) },
      });
    }

    if (services.length) {
      await Service.deleteMany({ salon: salon._id });
    }

    const artists = await ArtistModel.find({ salon: salon._id });
    const users = await UserModel.find({
      _id: { $in: artists.map((artist) => artist.userId) },
    });

    if (users.length) {
      await UserModel.deleteMany({
        _id: { $in: artists.map((artist) => artist.userId) },
      });
    }

    if (artists.length) {
      await ArtistModel.deleteMany({ salon: salon._id });
    }

    if (salon.appointments.length) {
      await AppointmentModel.deleteMany({ _id: { $in: salon.appointments } });
    }

    if (salon.Reviews.length) {
      await ReviewModel.deleteMany({ _id: { $in: salon.Reviews } });
    }

    if (salon.offers.length) {
      await OfferModel.deleteMany({ _id: { $in: salon.offers } });
    }

    await SalonModel.findOneAndDelete({ userId: user });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    await UserModel.findOneAndDelete({ _id: user });

    return res.status(200).json({
      success: true,
      message: "Salon deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in deleting salon",
    });
  }
};

/**
 * @desc Add photos to salon
 * @method POST
 * @route /api/salon/add-photos
 * @access Private
 * @requestBody { coverPhoto: String, ProfilePhotos: [String] }
 */

const AddPhotos = async (req, res) => {
  try {
    const { coverPhoto, ProfilePhotos } = req.body;

    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    if (ProfilePhotos.length > 0) {
      if (!Array.isArray(ProfilePhotos)) {
        return res.status(400).json({
          success: false,
          message: "Artists data should be an array of objects",
        });
      }
    }

    salon.CoverImage = coverPhoto || salon.CoverImage;
    salon.StorePhotos = ProfilePhotos || salon.StorePhotos || null;

    await salon.save();

    return res.status(200).json({
      success: true,
      message: "Photos uploaded successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in uploading photos",
    });
  }
};

const getSalonsAppointments = async (req, res) => {
  try {
    const id = req.user._id;
    const salon = await SalonModel.findOne({ userId: id }).populate({
      path: "appointments",
      populate: [
        {
          path: "user",
          select: "name phoneNumber _id",
        },
        {
          path: "services",
          select: "ServiceName  _id",
        },
        {
          path: "artist",
          select: "ArtistName PhoneNumber _id workingDays startTime endTime",
        },
      ],
    });

    // If salon not found or no appointments
    if (!salon || !salon.appointments) {
      return res.status(404).json({
        success: false,
        message: "No appointments found for this salon",
      });
    }

    // Extract appointments from the salon object
    const appointments = salon.appointments;

    console.log(appointments);

    return res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching salon",
    });
  }
};

const getAllSalons = async (req, res) => {
  try {
    const salons = await SalonModel.find()
      .populate("Services")
      .populate("Artists")
      .populate("userId", "phoneNumber")
      .populate("Reviews")
      .populate("offers");

    if (!salons.length) {
      return res.status(404).json({
        success: false,
        message: "No salons found",
      });
    }

    return res.status(200).json({
      success: true,
      data: salons,
      message: "Salons found",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching salons",
    });
  }
};

const SalonsStats = async (req, res) => {
  try {
    //total bookings , no of user sign up this week , total salons registered,

    const totalSalons = await SalonModel.countDocuments();
    const totalUsers = await UserModel.countDocuments();
    const totalAppointments = await AppointmentModel.countDocuments();

    const today = new Date();
    //weekly bookings and user registration

    const weekStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - today.getDay()
    );
    const weekEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + (6 - today.getDay())
    );

    const weeklyUsers = await UserModel.find({
      createdAt: { $gte: weekStart, $lte: weekEnd },
    }).countDocuments();

    const weeklyAppointments = await AppointmentModel.find({
      createdAt: { $gte: weekStart, $lte: weekEnd },
    }).countDocuments();

    return res.status(200).json({
      success: true,
      data: {
        totalSalons,
        totalUsers,
        totalAppointments,
        weeklyUsers,
        weeklyAppointments,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching stats",
    });
  }
};

export {
  createSalon,
  getSalonById,
  getSalonByLocation,
  searchSalons,
  getOwnerSalon,
  uploadBrochure,
  deleteSalon,
  UpdateSalon,
  getSalonsAppointments,
  AddPhotos,
  getAllSalons,
  SalonsStats,
};
