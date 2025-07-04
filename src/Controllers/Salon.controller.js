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
      salonPhoneNumber,
      startTime,
      endTime,
      coordinates,
      gst,
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

    let Gstbool;

    if (gst === "True") {
      Gstbool = true;
    }

    if (gst === "False") {
      Gstbool = false;
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

    // if (!coordinate) {
    //   const geocoder = NodeGeocoder(options);
    //   const mergedAddress = `${Address1} ${Address2}`;
    //   const response = await geocoder.geocode(
    //     `${mergedAddress} ${City} ${State} ${Country}`
    //   );

    //   if (!response.length) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid address",
    //     });
    //   }

    //   locationDetails = {
    //     type: "Point",
    //     coordinates: [response[0].latitude, response[0].longitude],
    //   };
    // } else {
    //   locationDetails = {
    //     type: "Point",
    //     coordinates: [coordinate[0], coordinate[1]],
    //   };
    // }


    const CoverImage = req.file ? req.file.location : null;

    // convert salonPhoneNumber to number from string
    const salonNumber = parseInt(salonPhoneNumber);

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
      Gst: Gstbool,
      salonPhoneNumber: salonNumber,
      CoverImage,
      location: {
        type: "Point",
        coordinates: ["28.6139", "77.2090"],
      },
    });

    // const password = otpGenerator.generate(8, {
    //   upperCaseAlphabets: true,
    //   specialChars: false,
    //   lowerCaseAlphabets: true,
    // });

    // // Write the salon name , phoneNumber , OWner name and password to google sheet
    // await sheets.spreadsheets.values.append({
    //   spreadsheetId,
    //   range: "Sheet1!A1:D1",
    //   valueInputOption: "USER_ENTERED",
    //   insertDataOption: "INSERT_ROWS",

    //   resource: {
    //     values: [[SalonName, user.phoneNumber, OwnerName, password]],
    //   },
    // });

    // const salt = await bycrypt.genSalt(10);
    // user.password = await bycrypt.hash(password, salt);
    // await salon.save();
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


const createSalonByAdmin = async (req, res) => {
  try {
    const { Address1, Address2, Landmark, Pincode, City, State, Country } =
      req.body;
    const {
      SalonName,
      OwnerName,
      BusinessType,
      Gender,
      workingDays,
      aboutSalon,
      salonPhoneNumber,
      startTime,
      endTime,
      phoneNumber,
      coordinates,
      gst,
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


    const userExists = await UserModel.findOne({ phoneNumber: phoneNumber });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }else{
      const newUser = new UserModel({
        phoneNumber: phoneNumber,
        role: "Owner",
        name: OwnerName
      });
      await newUser.save();
    }

    let Gstbool;

    if (gst === "true") {
      Gstbool = true;
    }

    if (gst === "false") {
      Gstbool = false;
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

    const user = await UserModel.findOne({ phoneNumber: phoneNumber });
    user.name = OwnerName;

    const isSalon = await SalonModel.findOne({ userId: user._id });
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

    // if (!coordinate) {
    //   const geocoder = NodeGeocoder(options);
    //   const mergedAddress = `${Address1} ${Address2}`;
    //   const response = await geocoder.geocode(
    //     `${mergedAddress} ${City} ${State} ${Country}`
    //   );

    //   if (!response.length) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid address",
    //     });
    //   }

    //   locationDetails = {
    //     type: "Point",
    //     coordinates: [response[0].latitude, response[0].longitude],
    //   };
    // } else {
    //   locationDetails = {
    //     type: "Point",
    //     coordinates: [coordinate[0], coordinate[1]],
    //   };
    // }


    const CoverImage = req.file ? req.file.location : null;

    // convert salonPhoneNumber to number from string
    const salonNumber = parseInt(salonPhoneNumber);

    const salon = new SalonModel({
      userId: user._id,
      SalonName,
      OwnerName,
      address,
      BusinessType,
      Gender,
      workingDays: workingdaylist,
      startTime,
      endTime,
      Gst: Gstbool,
      salonPhoneNumber: salonNumber,
      CoverImage,
      aboutSalon,
      location: {
        type: "Point",
        coordinates: [coordinate[0], coordinate[1]],
      },
    });

    // const password = otpGenerator.generate(8, {
    //   upperCaseAlphabets: true,
    //   specialChars: false,
    //   lowerCaseAlphabets: true,
    // });

    // // Write the salon name , phoneNumber , OWner name and password to google sheet
    // await sheets.spreadsheets.values.append({
    //   spreadsheetId,
    //   range: "Sheet1!A1:D1",
    //   valueInputOption: "USER_ENTERED",
    //   insertDataOption: "INSERT_ROWS",

    //   resource: {
    //     values: [[SalonName, user.phoneNumber, OwnerName, password]],
    //   },
    // });

    // const salt = await bycrypt.genSalt(10);
    // user.password = await bycrypt.hash(password, salt);
    // await salon.save();
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
      coordinates,
      workingDays,
      startTime,
      endTime,
      Instagram,
      Facebook,
      gst,
      Gender,
    } = req.body;

    const { Address1, Address2, Landmark, Pincode, City, State, Country } =
      req.body;

    let locationDetails;

    const options = {
      provider: "google",
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
    };

    if (!coordinates && (Address1 || City || State || Country || Pincode)) {
      const geocoder = NodeGeocoder(options);
      const mergedAddress = `${Address1} ${Address2}`;
      const response = await geocoder.geocode(`${mergedAddress}  ${Country}`);

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
    } else if (coordinates) {
      locationDetails = {
        type: "Point",
        coordinates: [coordinates[0], coordinates[1]],
      };
    }

    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });

    let Gstbool = salon.Gst;

    if (gst === "True") {
      Gstbool = true;
    }

    if (gst === "False") {
      Gstbool = false;
    }

    console.log(Gstbool);
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
        const startArtistTime = artists[i].startTime.slice(11, 16);
        const endArtistTime = artists[i].endTime.slice(11, 16);
        if (startArtistTime < startTime || endArtistTime > endTime) {
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
    salon.location = locationDetails || salon.location;
    salon.address = {
      Address1: Address1 || salon.address.Address1,
      Address2: Address2 || salon.address.Address2,
      Landmark: Landmark || salon.address.Landmark,
      Pincode: Pincode || salon.address.Pincode,
      City: City || salon.address.City,
      State: State || salon.address.State,
      Country: Country || salon.address.Country,
    };
    salon.workingDays = workingDays || salon.workingDays;
    salon.Gender = Gender || salon.Gender;
    salon.startTime = startTime || salon.startTime;
    salon.endTime = endTime || salon.endTime;
    if(Instagram == ""){
      salon.Instagram = null;
    }else{
      salon.Instagram = Instagram || salon.Instagram;
    }
    if(Facebook == ""){
      salon.Facebook = null;
    }else{
      salon.Facebook = Facebook || salon.Facebook;
    }

    salon.Gst = Gstbool;

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
          query: { showSalon: true },
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
        },
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
        //remove services field from artists
        select: "-services",
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
            path: "customerId",
          },
        });

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
            path: "customerId",
          },
        });

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

      const aggregationPipeline = [
        {
          $geoNear: {
            near: locations,
            distanceField: "distance",
            maxDistance: 2000000, // 200 kilometers
            spherical: true,
            query: { showSalon: true },
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
          },
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
        { $text: { $search: salonName }, showSalon: true },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .populate("offers")
        .populate("Reviews");

      // Perform regex search
      const regexSearchResults = await SalonModel.find({
        SalonName: new RegExp(salonName, "i"),
        showSalon: true,
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

    let salon = await SalonModel.findOne({ userId: user });
    if (req.user.role === "subAdmin") {
      salon = await SalonModel.findOne({ Artists: req.user._id });
    }

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
    const { salonId } = req.params;

    const salon = await SalonModel.findById(salonId)

    const user = await UserModel.findById(salon.userId);

    if (!salon) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    if (salon.Services.length) {
      await Service.deleteMany({ _id: { $in: salon.Services } }, { session });
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

    await SalonModel.findOneAndDelete({ userId: user._id }, { session });


    await UserModel.findOneAndDelete({ _id: user._id }, { session });

    await Statistic.updateOne(
      { _id: "Statistic" },
      { $inc: { deletedSalonCount: 1 } }
    );

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
    let salon = await SalonModel.findOne({ userId: user });

    if (req.user.role === "subAdmin") {
      const artist = await ArtistModel.findOne({ userId: user });
      salon = await SalonModel.findOne({ Artists: artist._id });
    }

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
    let salon = await SalonModel.findOne({ userId: user });

    if (req.user.role === "subAdmin") {
      const artist = await ArtistModel.findOne({ userId: user });
      salon = await SalonModel.findOne({ Artists: artist._id });
    }

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
    let salon = await SalonModel.findOne({ userId: user });

    if (req.user.role === "subAdmin") {
      const artist = await ArtistModel.findOne({ userId: user });
      salon = await SalonModel.findOne({ Artists: artist._id });
    }

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
    let salon = await SalonModel.findOne({ userId: user });

    if (req.user.role === "subAdmin") {
      const artist = await ArtistModel.findOne({ userId: user });
      salon = await SalonModel.findOne({ Artists: artist._id });
    }

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
    let salon = await SalonModel.findOne({ userId: user });

    if (req.user.role === "subAdmin") {
      const artist = await ArtistModel.findOne({ userId: user });
      salon = await SalonModel.findOne({ Artists: artist._id });
    }

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
      .populate("userId", "phoneNumber")
      .populate("appointments");
  
    //total appointments per salon , cancelled and completed




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


const GetSalonDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const salon = await SalonModel.findById(id)
      .populate("Services")
      .populate("Artists")
      .populate("userId", "phoneNumber")
      .populate("Reviews")
      .populate("offers")
      .populate("appointments");

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });

    }

    return res.status(200).json({
      success: true,
      data: salon,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching salon",
    });
  }
};

const SalonsStats = async (req, res) => {
  try {
    //total bookings , no of user sign up this week , total salons registered,

    const totalSalons = await SalonModel.countDocuments();
    const totalUsers = await UserModel.countDocuments();
    const totalAppointments = await AppointmentModel.countDocuments();
    const totalCustomers = await CustomerModel.countDocuments();

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

    const TodayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );



    
      

    const dailyCustomers = await CustomerModel.find({
      createdAt: { $gte: TodayStart },
    }).countDocuments();

    const appointments = await AppointmentModel.find();
    
    const TotalRatings = await ReviewModel.find().countDocuments();

    const DailyRatings = await ReviewModel.find({
      createdAt: { $gte: TodayStart },
    }).countDocuments();

    const AppUsers = await UserModel.find({
      role: { $ne: "Customer" },
    }).countDocuments();

    const DailyAppUsers = await UserModel.find({
      role: { $ne: "Customer" },
      createdAt: { $gte: TodayStart },
    }).countDocuments();

    const stats = await Statistic.findOne({});

    return res.status(200).json({
      success: true,
      data: {
        stats,
        totalSalons,
        totalUsers,
        totalCustomers,
        AppUsers,
        dailyCustomers,
        appointments,
        totalAppointments,
        TotalRatings,
        DailyRatings,
        DailyAppUsers,
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

const AddStorePhotosbyAdmin = async (req, res) => {
  try {
    const { salonId } = req.params;
    let salon = await SalonModel.findById(salonId);

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

const deleteStorePhotosByAdmin = async (req, res) => {
  try {
    const { salonId } = req.params;
    let salon = await SalonModel.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const storePhotos = req.body.photoUrl;

    if (!storePhotos || storePhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No photos were deleted",
      });
    }

    //single photo delte
    if (typeof storePhotos === "string") {
      salon.StorePhotos = salon.StorePhotos.filter(
        (photo) => photo !== storePhotos
      );
    }
    else {
      //multiple photos delete
      storePhotos.forEach((photo) => {
        salon.StorePhotos = salon.StorePhotos.filter(
          (storePhoto) => storePhoto !== photo
        );
      });
    }

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


const AddsalonPhotosbyAdmin = async (req, res) => {
  try {
    const { salonId } = req.params;
    let salon = await SalonModel.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const salonPhotos = req.files;

    // Ensure the array is not empty
    if (!salonPhotos || salonPhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No photos were uploaded",
      });
    }

    salonPhotos.forEach((file) => {
      salon.salonPhotos.push(file.location); // or file.filename depending on how you want to store the reference
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

const deleteSalonPhotosByAdmin = async (req, res) => {
  try {
    const { salonId } = req.params;
    let salon = await SalonModel.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const salonPhotos = req.body.photoUrl;

    if (!salonPhotos || salonPhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No photos were deleted",
      });
    }

    //single photo delte
    if (typeof salonPhotos === "string") {
      salon.salonPhotos = salon.salonPhotos.filter(
        (photo) => photo !== salonPhotos
      );
    } else {
      //multiple photos delete
      salonPhotos.forEach((photo) => {
        salon.salonPhotos = salon.salonPhotos.filter(
          (salonPhoto) => salonPhoto !== photo
        );
      });
    }

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

const getSalonAllPhotos = async (req, res) => {
  try {
    const { salonId } = req.params;
    let salon = await SalonModel.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        salonPhotos: salon.salonPhotos,
        StorePhotos: salon.StorePhotos,
        CoverImage: salon.CoverImage,
        Brochure: salon.Brochure,
      },
    });
  }
  catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in fetching photos",
    });
  }
}

export {
  createSalon,
  getSalonById,
  getSalonByLocation,
  searchSalons,
  getOwnerSalon,
  uploadBrochure,
  deleteSalon,
  createSalonByAdmin,
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
  GetSalonDetails,
  AddStorePhotosbyAdmin,
  AddsalonPhotosbyAdmin,
  deleteSalonPhotosByAdmin,
  deleteStorePhotosByAdmin,
  getSalonAllPhotos,
};
