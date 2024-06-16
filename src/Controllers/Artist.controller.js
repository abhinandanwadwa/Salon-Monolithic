import SalonModel from "../Models/Salon.js";
import ArtistModel from "../Models/Artist.js";
import UserModel from "../Models/User.js";
import Service from "../Models/Services.js";
import ServiceArtist from "../Models/ServiceArtist.js";
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
        console.log(artistData)
        if (!salon) {
            return res.status(404).json({
                success: false,
                message: "Salon not found",
            });
        }

        const services = await Service.find({salon: salon._id});

        if (!services.length) {
            return res.status(404).json({ 
                success: false,
              message: "No services found" });
        }
        if (!Array.isArray(artistData)) {
            return res.status(400).json({
              success: false,
              message: "Artists data should be an array of objects",
            });
        }

        const createdArtists = [];

        for (const artists of artistData) {

            const {
                ArtistName,
                PhoneNumber,
                ArtistType,
                workingDays,
                startTime,
                endTime,
                ArtistPhoto,
            } = artists;

            let user = await UserModel.findOne({ phoneNumber:PhoneNumber });

            if (!user) {
                user = new UserModel({ phoneNumber:PhoneNumber,role: "Artist"});
                await user.save();
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

            const artist = new ArtistModel({
                userId: user._id,
                ArtistName,
                PhoneNumber,
                ArtistType,
                workingDays,
                startTime,
                endTime,
                salon: salon._id,
                ArtistPhoto,
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
        }

        salon.Artists.push(...createdArtists);

        await salon.save();

        return res.status(201).json({
            success: true,
            message: "Artists created successfully",
            data: createdArtists,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error in creating artists",
        });
    }
}

/**
 * @desc Create Artists
 * @method POST
 * @access Private
 * @route /api/artist/create-artists
 * @requestBody { artistsData: [ { ArtistName: String, PhoneNumber: Number, ArtistType: String, workingDays: Array of Strings, startTime: String, endTime: String, ArtistPhoto: String, services: Array of Strings } ] }
 */



const createArtists = async (req, res) => {
  try {

    const {artistsData} = req.body;

    if (!Array.isArray(artistsData)) {
      return res.status(400).json({
        success: false,
        message: "Artists data should be an array of objects",
      });
    }

    const userId = req.user._id;

    const salon = await SalonModel.findOne({ userId });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const createdArtists = [];

    for (const artistData of artistsData) {
      const {
        ArtistName,
        PhoneNumber,
        ArtistType,
        workingDays,
        startTime,
        endTime,
        ArtistPhoto,
        services,
      } = artistData;

      let user = await UserModel.findOne({ phoneNumber:PhoneNumber  });
      if (!user) {
        user = new UserModel({ phoneNumber:PhoneNumber,role: "Artist"});
        await user.save();

      // // Validate inputs for each artist
      // if (
      //   !ArtistName ||
      //   !PhoneNumber ||
      //   !ArtistType ||
      //   !workingDays ||
      //   !startTime ||
      //   !endTime
      // ) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Artist data is incomplete",
      //   });
      // }

      
            
      // Create the artist
      const artist = new ArtistModel({
        userId: user._id,
        ArtistName,
        PhoneNumber,
        ArtistType,
        workingDays,
        startTime,
        endTime,
        salon: salon._id, // Assuming SalonId is a reference to the salon
        ArtistPhoto,
        services,
      });
      await artist.save();
      // Add created artist to the array
      createdArtists.push(artist);

      // Create a new serviceArtist for each service
      for (const serviceId of services) {
        const service = await Service.findById(serviceId);
        const serviceArtist = new ServiceArtist({
          Artist: artist._id,
          Service: serviceId,
          Price: service.ServiceCost,
        });
        await serviceArtist.save();
      }

    }else{
        return res.status(400).json({
            success: false,
            message: 'User already exists with this phone number: '+ PhoneNumber
        });
    }
    }

    // Update the salon with the new artists
    salon.Artists.push(...createdArtists);
    await salon.save();

    return res
      .status(201)
      .json({
        success: true,
        message: "Artists created successfully",
        data: createdArtists,
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in creating artists",
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

        const { name , phoneNumber , workingDays , services } = req.body;

        if(phoneNumber){
            const user = await UserModel.findOneAndUpdate({ _id: artist.userId }, { phoneNumber });

            await user.save();
        }

        artist.ArtistName = name || artist.ArtistName;
        artist.PhoneNumber = phoneNumber || artist.PhoneNumber;
        artist.workingDays = workingDays || artist.workingDays;
        artist.services = services || artist.services;

        await artist.save();

        return res.status(200).json({
            success: true,
            data: artist,
            message: "Artist updated successfully",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in updating artist",
        });
    }
}

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
    
        await ArtistModel.findByIdAndDelete(artistId);

        return res.status(200).json({
            success: true,
            message: "Artist deleted successfully",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in deleting artist",
        });
    }
}

/**
 * @desc Get Artists by Salon
 * @method GET
 * @access Private
 * @route /api/artist/get-artists-by-salon
 */

const getArtistsBySalon = async (req, res) => {
    try {
      const user = req.user._id;
      const salon = await SalonModel.findOne({ OwnerId: user });
      if (!salon) {
        return res.status(404).json({ 
          success: false,
          message: "Salon not found" });
      }
      
      const artists = await ArtistModel.find({ salon: salon._id }).populate("services");
      
      return res.status(200).json({ 
        success: true,
        data:artists,
        message: "Artists fetched successfully",
    });
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
      console.log('Service IDs:', serviceIds);

      const { salonid } = req.params;
      console.log('Salon ID:', salonid);

      const salon = await SalonModel.findById(salonid);
      if (!salon) {
          return res.status(404).json({ 
              success: false,
              message: "Salon not found" 
          });
      }

      const artistService = await ServiceArtist.find({ Service: { $in: serviceIds } }).populate("Artist");

      if (!artistService.length) {
          return res.status(404).json({ 
              success: false,
              message: "No artists found" 
          });
      }
      const artists = artistService.map((service) => service.Artist);
      // // Use the $all operator to find artists who offer all of the specified services
      // const artists = await ArtistModel.find({ 
      //     services: { $all: serviceIds },
      //     salon: salonid
      // });

      return res.status(200).json({ artists });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ 
          success: false,
          message: "Error in fetching artists" 
      });
  }
};

const updateArtistServicePrice = async (req,res) => {
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
      const service = await ServiceArtist.findOne({ Artist: artist._id, Service: serviceId });
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
        data:service,
        message: "Service price updated successfully",
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false,
        message: "Error in updating service price",
      });
    }
}

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

      const artists = await ArtistModel.find({ salon: salon._id }).populate("appointments");

      if(!artists.length){
        return res.status(404).json({ 
          success: false,
          message: "No artists found",
         });
      }

      return res.status(200).json({ 
        success: true,
        data:artists,
        message: "Artists fetched successfully",
      });
    } catch (error) {
      
    }
  }

  const getArtistData = async (req, res) => {
    try {
      const artistId = req.user._id;

      const artist = await ArtistModel.findById(artistId).populate("services").populate("appointments").populate("salon");

      if (!artist) {
        return res.status(404).json({ 
          success: false,
          message: "Artist not found",
         });
      }

      return res.status(200).json({ 
        success: true,
        data:artist,
        message: "Artist fetched successfully",
      });

    }
    catch (error) {
      return res.status(500).json({ 
        success: false,
        message: "Error in fetching artist",
      });
    }
  }


export { createArtists, getArtistsBySalon, GetArtistbyService ,CreateArtistWithAllServices ,updateArtist,deleteArtist,updateArtistServicePrice, getArtistData };