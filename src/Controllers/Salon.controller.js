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
import CustomerModel from "../Models/Customer.js";
import Statistic from "../Models/Statistics.js";
import { messaging } from "./fcmClient.js";

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
      req.body;
    const {
      SalonName,
      OwnerName,
      BusinessType,
      Gender,
      workingDays,
      startTime,
      endTime,
      coordinates,
    } = req.body;

    let workingdaylist;
    try {
      workingdaylist = JSON.parse(workingDays);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid workingDays format",
      });
    }

    let coordinate;
    try {
      coordinate = JSON.parse(coordinates);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates format",
      });
    }

    // Get authenticated user's ID
    const { _id: userId } = req.user;
    const user = await UserModel.findById(userId);
    user.name = OwnerName;

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

    const options = {
      provider: "google",
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
    };

    let locationDetails;

    if (!coordinate) {
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
    } else {
      locationDetails = {
        type: "Point",
        coordinates: [coordinate[0], coordinate[1]],
      };
    }
    const CoverImage = req.file ? req.file.location : null;

    const salon = new SalonModel({
      userId,
      SalonName,
      OwnerName,
      address,
      BusinessType,
      Gender,
      workingDays: workingdaylist,
      startTime,
      endTime,
      salonPhoneNumber: user.phoneNumber,
      CoverImage,
      location: locationDetails,
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
    await salon.save();

    user.isSalon = true;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Salon created successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in creating salon" + error,
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

    if (endTime || startTime) {
      if (new Date(endTime) < new Date(startTime)) {
        return res.status(400).json({
          success: false,
          message: "End time should be greater than start time",
        });
      }

      const artists = await ArtistModel.find({ salon: salon._id });
      // if any artists start and end time is not in between the new start and end time then make it a subset

      for (let i = 0; i < artists.length; i++) {
        if (
          new Date(artists[i].startTime) < new Date(startTime) ||
          new Date(artists[i].endTime) > new Date(endTime)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Artist start and end time should be in between salon start and end time",
          });
        }
      }
    }

    if (workingDays) {
      const allArtists = await ArtistModel.find({ salon: salon._id });
      
      for (let i = 0; i < allArtists.length; i++) {
        const artistWorkingDays = allArtists[i].workingDays;
        const updatedWorkingDays = artistWorkingDays.filter((day) =>
          workingDays.includes(day)
        );
    
        // Update the artist's working days if they have changed
        if (updatedWorkingDays.length !== artistWorkingDays.length) {
          allArtists[i].workingDays = updatedWorkingDays;
          await allArtists[i].save();
        }
      }
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
    const salons = await SalonModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [latitude, longitude] }, // Note the order: [longitude, latitude]
          distanceField: "distance",
          maxDistance: 100000,
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
          from: "reviews", // The name of the Review collection in MongoDB
          localField: "Reviews",
          foreignField: "_id",
          as: "Reviews",
        }
      },  
    ]);

    return res.status(200).json({
      success: true,
      data: salons,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching salon" + error,
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
        populate: {
          path: "customerId",
          select: "name",
        },
      });
    // Fetch customer reviews and populate userId field

    return res.status(200).json(salon);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching salon" + error,
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
    if (req.user.role === "subAdmin") {
      const artist = await ArtistModel.findOne({ userId: OwnerId });
      const salon = await SalonModel.find({ Artists: artist._id })
        .populate("Services")
        .populate({
          path: "Artists",
          populate: {
            path: "appointments",
            path: "reviews",
          },
        })
        .populate("appointments")
        .populate("userId", "phoneNumber")
        .populate({
          path: "Reviews",
          populate: {
            path:"customerId",
          },
        })

      if (!salon.length) {
        return res.status(404).json({
          success: false,
          message: "No salon found",
        });
      }

      return res.status(200).json({
        success: true,
        data: salon,
        message: "Salon found",
      });
    } else {
      const salons = await SalonModel.find({ userId: OwnerId })
        .populate("Services")
        .populate({
          path: "Artists",
          populate: {
            path: "appointments",
          },
        })
        .populate("appointments")
        .populate("userId", "phoneNumber")
        .populate({
          path: "Reviews",
          populate: {
            path:"customerId",
          },
        })

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
    }
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

const searchSalonss = async (req, res) => {
  try {
    const { salonName, location } = req.body;

    if ((location && salonName) || location) {
      const locations = {
        type: "Point",
        coordinates: [location.latitude, location.longitude], // Corrected order: [longitude, latitude]
      };

      //location has lat and long

      const aggregationPipeline = [
        {
          $geoNear: {
            near: locations,
            distanceField: "distance",
            maxDistance: 200000, // 200 kilometers
            spherical: true,
          },
        },
        {
          $lookup: {
            from: "offers",
            localField: "_id",
            foreignField: "salon",
            as: "offers",
          },
        },
        {
          $lookup: {
            from: "reviews", // The name of the Review collection in MongoDB
            localField: "Reviews",
            foreignField: "_id",
            as: "Reviews",
          }
        },  
      ];

      const salons = await SalonModel.aggregate(aggregationPipeline);

      return res.status(200).json({
        success: true,
        data: salons,
        message: "Salons found",
      });
    }

    if (salonName) {
      // Perform text search
      const textSearchResults = await SalonModel.find(
        { $text: { $search: salonName } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .populate("offers")
        .populate("Reviews");

      // Perform regex search
      const regexSearchResults = await SalonModel.find({
        SalonName: new RegExp(salonName, "i"),
      })
        .populate("offers")
        .populate("Reviews");

      // Merge results, ensuring no duplicates
      const mergedResults = [
        ...textSearchResults,
        ...regexSearchResults,
      ].reduce((acc, current) => {
        const x = acc.find((item) => item._id.equals(current._id));
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      return res.status(200).json({
        success: true,
        data: mergedResults,
        message: "Salons found",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid search criteria",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching salons",
    });
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
    const user = req.user._id;

    const brochurePhotos = req.files;

    // Ensure the array is not empty
    if (!brochurePhotos || brochurePhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No photos were uploaded",
      });
    }

    const salon = await SalonModel.findOne({ userId: user });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    brochurePhotos.forEach((file) => {
      salon.Brochure.push(file.location); // or file.filename depending on how you want to store the reference
    });

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user._id;

    const salon = await SalonModel.findOne({ userId: user });

    if (!salon) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const services = await Service.find({ salon: salon._id });
    const serviceIds = services.map((service) => service._id);

    if (serviceIds.length) {
      await ServiceArtist.deleteMany(
        { Service: { $in: serviceIds } },
        { session }
      );
      await Service.deleteMany({ _id: { $in: serviceIds } }, { session });
    }

    const artists = await ArtistModel.find({ salon: salon._id });
    const artistUserIds = artists.map((artist) => artist.userId);
    
    let SendTokens = [];

    for (let i = 0; i < artistUserIds.length; i++) {
      const ArtistUser = await UserModel.findById(artistUserIds[i]);
      if (ArtistUser && ArtistUser.token) {
        SendTokens.push(ArtistUser.token);
      }
      if(ArtistUser.role === "subAdmin"){
        ArtistUser.role = "Artist";
        await ArtistUser.save();
      }
    }
    
    if (artistUserIds.length) {
      await CustomerModel.deleteMany({ userId: { $in: artistUserIds } }, { session });
      await UserModel.deleteMany({ _id: { $in: artistUserIds } }, { session });
      await ArtistModel.deleteMany({ salon: salon._id }, { session });
    }

    if (salon.appointments.length) {
      await AppointmentModel.deleteMany(
        { _id: { $in: salon.appointments } },
        { session }
      );
    }

    if (salon.Reviews.length) {
      await ReviewModel.deleteMany(
        { _id: { $in: salon.Reviews } },
        { session }
      );
    }

    if (salon.offers.length) {
      await OfferModel.deleteMany({ _id: { $in: salon.offers } }, { session });
    }

    await SalonModel.findOneAndDelete({ userId: user }, { session });
    await CustomerModel.findOneAndDelete({ userId: user }, { session });
    
    const OwnerUser = await UserModel.findById(user);
    if (OwnerUser && OwnerUser.token) {
      SendTokens.push(OwnerUser.token);
    }
    
    await UserModel.findOneAndDelete({ _id: user }, { session });

    SendTokens = [...new Set(SendTokens)];

    if (SendTokens.length) {
      const message = {
        notification: {
          title: "Account Deleted",
          body: "Your account has been deleted"
        },
        tokens: SendTokens
      };

      messaging.sendEachForMulticast(message).then((response) => {
        console.log(response);
      }).catch((error) => {
        console.error(error);
      });
    }


    await session.commitTransaction();
    session.endSession();

    

    return res.status(200).json({
      success: true,
      message: "Salon deleted successfully",
    });
  } catch (error) {
    console.error(error);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Error in deleting salon: " + error,
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
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });

    const coverImageUrl = req.file.location;
    salon.CoverImage = coverImageUrl || salon.CoverImage || null;

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

const AddStorePhotos = async (req, res) => {
  try {
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const storephotos = req.files;

    // Ensure the array is not empty
    if (!storephotos || storephotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No photos were uploaded",
      });
    }

    storephotos.forEach((file) => {
      salon.StorePhotos.push(file.location); // or file.filename depending on how you want to store the reference
    });

    await salon.save();

    return res.status(200).json({
      success: true,
      message: "Photos uploaded successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in uploading photos",
    });
  }
};

const deleteStorePhotos = async (req, res) => {
  try {
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const storePhotos = req.body.storePhotos;

    if (!storePhotos || storePhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No photos were deleted",
      });
    }

    storePhotos.forEach((photo) => {
      salon.StorePhotos = salon.StorePhotos.filter(
        (storePhoto) => storePhoto !== photo
      );
    });

    await salon.save();

    return res.status(200).json({
      success: true,
      message: "Photos deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in deleting photos",
    });
  }
};

const deleteCoverPhoto = async (req, res) => {
  try {
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    salon.CoverImage = null;
    await salon.save();

    return res.status(200).json({
      success: true,
      message: "Cover photo deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in deleting cover photo",
    });
  }
};

const deleteBrochure = async (req, res) => {
  try {
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const brochure = req.body.brochures;

    if (!brochure || brochure.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No brochures were deleted" + brochure,
      });
    }

    brochure.forEach((brochure) => {
      salon.Brochure = salon.Brochure.filter(
        (brochures) => brochures !== brochure
      );
    });

    await salon.save();

    return res.status(200).json({
      success: true,
      message: "Brochures deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in deleting brochures",
    });
  }
};

const getSalonsAppointments = async (req, res) => {
  try {
    const id = req.user._id;

    if (req.user.role === "subAdmin") {
      const artist = await ArtistModel.findOne({ userId: id });
      const salon = await SalonModel.findOne({ Artists: artist._id }).populate({
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
            select:
              "ArtistName PhoneNumber _id workingDays startTime endTime reviews",
          },
          {
            path: "Review",
            select: "Review Rating",
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

      return res.status(200).json(appointments);
    } else {
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
            select:
              "ArtistName PhoneNumber _id workingDays startTime endTime reviews",
          },
          {
            path: "Review",
            select: "Review Rating",
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

      return res.status(200).json(appointments);
    }
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

    const stats = await Statistic.findOne({});

    return res.status(200).json({
      success: true,
      data: {
        stats,
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
  AddStorePhotos,
  deleteStorePhotos,
  deleteBrochure,
  deleteCoverPhoto,
  searchSalonss,
};
