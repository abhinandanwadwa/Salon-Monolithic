import SalonModel from "../Models/Salon.js";
import ArtistModel from "../Models/Artist.js";
import UserModel from "../Models/User.js";
import Service from "../Models/Services.js";
import ServiceArtist from "../Models/ServiceArtist.js";
import AppointmentModel from "../Models/Appointments.js";
import mongoose from "mongoose";
/**
 * @desc Create an artist with all services
 * @method POST
 * @route /api/artist/create-artist-with-services
 * @access Private
 * @requestBody { artistData: Array }
 * @requestBodyExample { artistData: [{ ArtistName: String, PhoneNumber: Number, ArtistType: String, workingDays: Array of Strings, startTime: String, endTime: String, ArtistPhoto: String }] }
 */

const CreateArtistWithAllServices = async (req, res) => {
  try {
    const { artistData } = req.body;
    const { _id: userId } = req.user;
    const salon = await SalonModel.findOne({ userId: userId });
    console.log(artistData);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const services = await Service.find({ salon: salon._id });


    if (!services.length) {
      return res.status(404).json({
        success: false,
        message: "No services found",
      });
    }
    if (!Array.isArray(artistData)) {
      return res.status(400).json({
        success: false,
        message: "Artists data should be an array of objects",
      });
    }

    const createdArtists = [];

    for (let i = 0; i < artistData.length; i++) {
      const {
        ArtistName,
        PhoneNumber,
        ArtistType,
        workingDays,
        startTime,
        endTime,
      } = artistData[i];



      let user = await UserModel.findOne({ phoneNumber: PhoneNumber });


      if (user && user.role === "Artist") {
        return res.status(400).json({
          success: false,
          message:
            "User  already exists with this phone number: " + PhoneNumber,
        });
      }

      if (user && user.role === "Owner") {
        // Convert both to ObjectId if they are not already
        const salonUserId = new mongoose.Types.ObjectId(salon.userId);
        const userId = new mongoose.Types.ObjectId(user._id);

        if (!salonUserId.equals(userId)) {
          return res.status(400).json({
            success: false,
            message:
              "User already exists with this phone number: " + PhoneNumber 
          });
        }

        const artist = new ArtistModel({
          userId: user._id,
          ArtistName,
          PhoneNumber,
          ArtistType,
          workingDays,
          startTime,
          endTime,
          salon: salon._id,
          services,
        });

        await artist.save();
        createdArtists.push(artist);

        for (const serviceId of services) {
          const service = await Service.findById(serviceId);
          const serviceArtist = new ServiceArtist({
            Artist: artist._id,
            Service: serviceId,
            Price: service.ServiceCost,
          });

          await serviceArtist.save();
        }

        continue; // Skip the rest of the loop and continue with the next iteration
      }

      if (user && user.role === "Customer") {
        user.role = "Artist";
        await user.save();

        const artist = new ArtistModel({
          userId: user._id,
          ArtistName,
          PhoneNumber,
          ArtistType,
          workingDays,
          startTime,
          endTime,
          salon: salon._id,
          services,
        });

        await artist.save();

        createdArtists.push(artist);

        for (const serviceId of services) {
          const service = await Service.findById(serviceId);
          const serviceArtist = new ServiceArtist({
            Artist: artist._id,
            Service: serviceId,
            Price: service.ServiceCost,
          });

          await serviceArtist.save();
        }

        continue; // Skip the rest of the loop and continue with the next iteration
      }

      if (!user) {
        user = new UserModel({
          phoneNumber: PhoneNumber,
          role: "Artist",
          name: ArtistName,
        });
        await user.save();

        if (
          !ArtistName ||
          !PhoneNumber ||
          !ArtistType ||
          !workingDays ||
          !startTime ||
          !endTime
        ) {
          return res.status(400).json({
            success: false,
            message: "Artist data is incomplete",
          });
        }

        const artist = new ArtistModel({
          userId: user._id,
          ArtistName,
          PhoneNumber,
          ArtistType,
          workingDays,
          startTime,
          endTime,
          salon: salon._id,
          services,
        });

        await artist.save();
        createdArtists.push(artist);

        for (const service of services) {
          const serviceArtist = new ServiceArtist({
            Artist: artist._id,
            Service: service._id,
            Price: service.ServiceCost,
          });

          await serviceArtist.save();
        }
      } else {
        return res.status(400).json({
          success: false,
          message:
            "User already exists with this phone number:  " + PhoneNumber,
        });
      }
    }
    salon.Artists.push(...createdArtists);

    await salon.save();

    return res.status(201).json({
      success: true,
      message: "Artists created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in creating artists" + error,
    });
  }
};

/**
 * @desc Create Artists
 * @method POST
 * @access Private
 * @route /api/artist/create-artists
 * @requestBody { artistsData: [ { ArtistName: String, PhoneNumber: Number, ArtistType: String, workingDays: Array of Strings, startTime: String, endTime: String, ArtistPhoto: String, services: Array of Strings } ] }
 */
const createArtist = async (req, res) => {
  try {

    const {
      ArtistName,
      PhoneNumber,
      ArtistType,
      workingDays,
      startTime,
      endTime,
      services,
    } = req.body

    const startTimeString = startTime ? startTime.toString() : null;
    const endTimeString = endTime ? endTime.toString() : null;

    let workingdaylist;
    try {
      workingdaylist = JSON.parse(workingDays);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid workingDays format",
      });
    }

    if (
      !ArtistName ||
      !PhoneNumber ||
      !ArtistType ||
      !workingDays ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Artist data is incomplete",
      });
    }

    const userId = req.user._id;
    let servicesArray;
    if (typeof services === 'string') {
      try {
        servicesArray = JSON.parse(services);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid services format",
        });
      }
    } else {
      servicesArray = services;
    }

    const salon = await SalonModel.findOne({ userId });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    let user = await UserModel.findOne({ phoneNumber: PhoneNumber });
    const artistPhotoUrl = req.file ? req.file.location : null;

    if (user && user.role === "Artist") {
      return res.status(400).json({
        success: false,
        message: "User already exists with this phone number: " + PhoneNumber,
      });
    }

    if (user && user.role === "Owner") {
      const salonUserId = new mongoose.Types.ObjectId(salon.userId);
      const userId = new mongoose.Types.ObjectId(user._id);

      if (!salonUserId.equals(userId)) {
        return res.status(400).json({
          success: false,
          message:
            "User already exists with this phone number: " + PhoneNumber,
        });
      }

      const artist = new ArtistModel({
        userId: user._id,
        ArtistName,
        PhoneNumber,
        ArtistType,
        workingDays :workingdaylist,
        startTime: startTimeString,
        endTime: endTimeString,
        salon: salon._id,
        ArtistPhoto: artistPhotoUrl,
        services: servicesArray
      });

      await artist.save();

      for (const serviceId of servicesArray) {
        const service = await Service.findById(serviceId);
        const serviceArtist = new ServiceArtist({
          Artist: artist._id,
          Service: serviceId,
          Price: service.ServiceCost,
        });

        await serviceArtist.save();
      }

      // Update the salon with the new artist
      salon.Artists.push(artist);
      await salon.save();

      return res.status(201).json({
        success: true,
        message: "Artist created successfully",
        data: artist,
      });
    }

    if (user && user.role === "Customer") {
      user.role = "Artist";
      await user.save();

      const artist = new ArtistModel({
        userId: user._id,
        ArtistName,
        PhoneNumber,
        ArtistType,
        workingDays :workingdaylist,
        startTime: startTimeString,
        endTime: endTimeString,
        salon: salon._id,
        ArtistPhoto: artistPhotoUrl,
        services: servicesArray
      });

      await artist.save();

      for (const serviceId of servicesArray) {
        const service = await Service.findById(serviceId);
        const serviceArtist = new ServiceArtist({
          Artist: artist._id,
          Service: serviceId,
          Price: service.ServiceCost,
        });

        await serviceArtist.save();
      }

      // Update the salon with the new artist
      salon.Artists.push(artist);
      await salon.save();

      return res.status(201).json({
        success: true,
        message: "Artist created successfully",
        data: artist,
      });
    }

    if (!user) {
      user = new UserModel({
        phoneNumber: PhoneNumber,
        role: "Artist",
        name: ArtistName,
      });
      await user.save();

      const artist = new ArtistModel({
        userId: user._id,
        ArtistName,
        PhoneNumber,
        ArtistType,
        workingDays :workingdaylist,
        startTime : startTimeString,
        endTime : endTimeString,
        salon: salon._id,
        ArtistPhoto: artistPhotoUrl,
        services: servicesArray
      });
      await artist.save();

      for (const serviceId of servicesArray) {
        const service = await Service.findById(serviceId);
        const serviceArtist = new ServiceArtist({
          Artist: artist._id,
          Service: serviceId,
          Price: service.ServiceCost,
        });
        await serviceArtist.save();
      }

      // Update the salon with the new artist
      salon.Artists.push(artist);
      await salon.save();

      return res.status(201).json({
        success: true,
        message: "Artist created successfully",
        data: artist,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "User already exists with this phone number: " + PhoneNumber,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in creating artist: " + error,
    });
  }
};

/**
 * @desc Update Artist
 * @method PUT
 * @access Private
 * @route /api/artist/update-artist/:artistId
 * @requestBody { name: String, phoneNumber: Number, workingDays: Array of Strings, services: Array of Strings }
 */
const updateArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    const userId = req.user._id;
    const salon = await SalonModel.findOne({ userId });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const artist = await ArtistModel.findById(artistId);
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    const { name, phoneNumber, workingDays, services,startTime , endTime } = req.body;

    const startTimeString = startTime ? startTime.toString() : null;
    const endTimeString = endTime ? endTime.toString() : null;


    let workingdaylist;
    try {
      workingdaylist = JSON.parse(workingDays);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid workingDays format",
      });
    }

    if (phoneNumber) {
      const user = await UserModel.findOneAndUpdate(
        { _id: artist.userId },
        { phoneNumber }
      );

      await user.save();
    }

    const artistPhotoUrl = req.file ? req.file.location : artist.ArtistPhoto;

    // Parse services if it's a JSON string
    let servicesArray;
    if (typeof services === 'string') {
      try {
        servicesArray = JSON.parse(services);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid services format",
        });
      }
    } else {
      servicesArray = services;
    }

    // Ensure services is an array of ObjectIds
    if (servicesArray && !Array.isArray(servicesArray)) {
      return res.status(400).json({
        success: false,
        message: "Services should be an array",
      });
    }


    if (servicesArray) {
      for (const serviceId of servicesArray) {
        const service = await Service.findById(serviceId);
        if (service) {
          const serviceArtist = await ServiceArtist.findOne({
            Artist: artist._id,
            Service: serviceId,
          });

          if (!serviceArtist) {
            const newServiceArtist = new ServiceArtist({
              Artist: artist._id,
              Service: serviceId,
              Price: service.ServiceCost,
            });

            await newServiceArtist.save();
          }
        }
      }
    }

    artist.ArtistName = name || artist.ArtistName;
    artist.PhoneNumber = phoneNumber || artist.PhoneNumber;
    artist.workingDays = workingdaylist || artist.workingDays;
    artist.services = servicesArray || artist.services;
    artist.startTime = startTimeString || artist.startTime;
    artist.endTime = endTimeString || artist.endTime;
    artist.ArtistPhoto = artistPhotoUrl;

    await artist.save();

    return res.status(200).json({
      success: true,
      data: artist,
      message: "Artist updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in updating artist" + error,
    });
  }
};

/**
 * @desc Delete Artist
 * @method DELETE
 * @access Private
 * @route /api/artist/delete-artist/:artistId
 * @requestParams { artistId: String }
 */

const deleteArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    const userId = req.user._id;
    const salon = await SalonModel.findOne({ userId: userId });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const artist = await ArtistModel.findById(artistId);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    await ServiceArtist.deleteMany({ Artist: artistId });

    const appointments = await AppointmentModel.find({ artist: artistId });
    salon.appointments.pull(
      ...appointments.map((appointment) => appointment._id)
    );

    await AppointmentModel.deleteMany({ artist: artistId });
    salon.Artists.pull(artistId);

    await salon.save();

    await ArtistModel.findByIdAndDelete(artistId);

    const user = await UserModel.findById(artist.userId);

    if(user.role === "Artist"){
      await UserModel.findByIdAndDelete(user._id);
    }

    return res.status(200).json({
      success: true,
      message: "Artist deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in deleting artist" + error,
    });
  }
};

/**
 * @desc Get Artists by Salon
 * @method GET
 * @access Private
 * @route /api/artist/get-artists-by-salon
 */

const getArtistsBySalon = async (req, res) => {
  try {
    const user = req.user._id;

    if (req.user.role === "subAdmin") {
      const artist = await ArtistModel.findOne({ userId: user });
      const salon = await SalonModel.findOne({ Artists: artist._id });
      if (!salon) {
        return res.status(404).json({
          success: false,
          message: "Salon not found",
        });
      }

      const artists = await ArtistModel.find({ salon: salon._id }).populate(
        "services"
      );

      return res.status(200).json({
        success: true,
        data: artists,
        message: "Artists fetched successfully",
      });
    }
    if (req.user.role === "Owner") {
      const salon = await SalonModel.findOne({ userId: user });
      if (!salon) {
        return res.status(404).json({
          success: false,
          message: "Salon not found",
        });
      }

      const artists = await ArtistModel.find({ salon: salon._id }).populate(
        "services"
      );

      return res.status(200).json({
        success: true,
        data: artists,
        message: "Artists fetched successfully",
      });
    }
  } catch (error) {
    return new Error(error);
  }
};

/**
 * @desc Get Artists by Service
 * @method POST
 * @access Public
 * @route /api/artist/get-artist-by-service/:salonid
 * @requestBody { serviceIds: Array of Strings }
 * @requestParams { salonid: String }
 */

const GetArtistbyService = async (req, res) => {
  try {
    const { serviceIds } = req.body;
    console.log("Service IDs:", serviceIds);

    const { salonid } = req.params;
    console.log("Salon ID:", salonid);

    const salon = await SalonModel.findById(salonid);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    // const artistService = await ServiceArtist.find({ Service: { $all: serviceIds } }).populate("Artist");

    // if (!artistService.length) {
    //     return res.status(404).json({
    //         success: false,
    //         message: "No artists found"
    //     });
    // }
    // const artists = artistService.map((service) => service.Artist);
    // // Use the $all operator to find artists who offer all of the specified services
    const artists = await ArtistModel.find({
      services: { $all: serviceIds },
      salon: salonid,
    }).populate("reviews");

    return res.status(200).json({ artists });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching artists" + error,
    });
  }
};

const updateArtistServicePrice = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { price } = req.body;
    const id = req.user._id;
    const artist = await ArtistModel.findOne({ userId: id });
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }
    const service = await ServiceArtist.findOne({
      Artist: artist._id,
      Service: serviceId,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }
    service.Price = price;
    await service.save();

    return res.status(200).json({
      success: true,
      data: service,
      message: "Service price updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in updating service price",
    });
  }
};

const getSalonArtistsSchedule = async (req, res) => {
  try {
    const userId = req.user._id;
    const salon = await SalonModel.findOne({ userId });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const artists = await ArtistModel.find({ salon: salon._id }).populate(
      "appointments"
    );

    if (!artists.length) {
      return res.status(404).json({
        success: false,
        message: "No artists found",
      });
    }

    return res.status(200).json({
      success: true,
      data: artists,
      message: "Artists fetched successfully",
    });
  } catch (error) {}
};

const getArtistData = async (req, res) => {
  try {
    const artistId = req.user._id;

    const artist = await ArtistModel.find({
      userId: artistId,
    })
      .populate({
        path: "appointments",
        populate: {
          path: "user services",
          select: "-userId -appointments -salon",
        },
      })
      .populate({
        path: "salon",
        select:
          " -location -StorePhotos -OwnerId -salonType -Services -Artists -createdAt -updatedAt -appointments -workingDays -startTime -endTime -__v -CoverImage -Brochure",
      })
      .populate("reviews");

    const Artistt = await ArtistModel.findOne({ userId: artistId });

    console.log(Artistt._id);

    const services = await ServiceArtist.find({
      Artist: Artistt._id,
    }).populate("Service");

    if (!services) {
      return res.status(404).json({
        success: false,
        message: "Services not found for the artist",
      });
    }

    console.log("Services fetched successfully:", services);

    const data = {
      artist,
      services,
    };

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    return res.status(200).json({
      success: true,
      data,
      message: "Artist fetched successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching artist",
    });
  }
};

const GetArtistService = async (req, res) => {
  try {
    const userId = req.user._id;

    const services = await ServiceArtist.find({ Artist: userId }).populate(
      "Service"
    );

    if (!services) {
      return res.status(404).json({
        success: false,
        message: "Services not found for the artist",
      });
    }

    console.log("Services fetched successfully:", services);

    return res.status(200).json({
      success: true,
      data: services,
      message: "Services fetched successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching services",
    });
  }
};

export {
  createArtist,
  getArtistsBySalon,
  GetArtistbyService,
  CreateArtistWithAllServices,
  updateArtist,
  deleteArtist,
  updateArtistServicePrice,
  getArtistData,
};
