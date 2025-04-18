import Service from "../Models/Services.js";
import SalonModel from "../Models/Salon.js";
import ArtistModel from "../Models/Artist.js";
import ServiceArtist from "../Models/ServiceArtist.js";
import AppointmentModel from "../Models/Appointments.js";


/**
 * @desc Create services with customizations
 * @method POST
 * @route /api/service/create-services-with-customizations
 * @access Private
  * @requestBody { servicesData: [ { ServiceName, ServiceType, ServiceCost, ServiceTime, ServiceGender, CustomizationOptions } ] }
  * CustomizationOptions: [ { OptionName, OptionPrice } ]
  **/
 
const createServicesWithCustomizations = async (req, res) => {
  try {
    const servicesData = req.body;
    // Validate if servicesData is an array
    if (!Array.isArray(servicesData)) {
      return res.status(400).json({
        success: false,
        message: "Services data must be an array",
      });
    }

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

    const createdServices = [];
    // Loop through each service data and create services
    for (const serviceData of servicesData) {
      const {
        ServiceName,
        ServiceType,
        ServiceCost,
        ServiceTime,
        ServiceGender,
        CustomizationOptions = [], // Default to empty array if not provided
      } = serviceData;

      // Validate inputs for each service
      if (
        !ServiceName ||
        !ServiceType ||
        !ServiceCost ||
        !ServiceTime ||
        !ServiceGender
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required for each service",
        });
      }

      // Validate customization options if provided
      if (CustomizationOptions.length > 0) {
        for (const option of CustomizationOptions) {
          if (!option.OptionName || option.OptionPrice === undefined) {
            return res.status(400).json({
              success: false,
              message: "Each customization option must have a name and price",
            });
          }
        }
      }

      // Create the service
      const service = new Service({
        ServiceName,
        ServiceType,
        salon: salon._id,
        ServiceCost,
        ServiceTime,
        ServiceGender,
        CustomizationOptions,
      });
      
      await service.save();

      // Add created service to the array
      createdServices.push(service);
    }

    // Update the salon with the new services
    salon.Services.push(...createdServices.map(service => service._id));
    await salon.save();

    return res.status(201).json({
      success: true,
      message: "Services created successfully",
      services: createdServices,
    });
  } catch (error) {
    console.error("Error creating services:", error);
    return res.status(500).json({
      success: false,
      message: "Error in creating services: " + error.message,
    });
  }
};

/**
 * @desc Create services
 * @method POST
 * @route /api/services/create-services
 * @access Private
 * @requestBody { servicesData: [ { ServiceName, ServiceType, ServiceCost, ServiceTime, ServiceGender } ] }
 */

const createServices = async (req, res) => {
  try {
    const servicesData = req.body;
    // Validate if servicesData is an array
    if (!Array.isArray(servicesData)) {
      return res.status(400).json({
        success: false,
        message: "Services data must be an array",
      });
    }

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

    const createdServices = [];
    // Loop through each service data and create services
    for (const serviceData of servicesData) {
      const {
        ServiceName,
        ServiceType,
        ServiceCost,
        ServiceTime,
        ServiceGender,
      } = serviceData;

      // Validate inputs for each service
      if (
        !ServiceName ||
        !ServiceType ||
        !ServiceCost ||
        !ServiceTime ||
        !ServiceGender
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required for each service",
        });
      }

      // Create the service
      const service = new Service({
        ServiceName,
        ServiceType,
        salon: salon._id,
        ServiceCost,
        ServiceTime,
        ServiceGender,
      });
      await service.save();

      // Add created service to the array
      createdServices.push(service);
    }

    // Update the salon with the new services
    salon.Services.push(...createdServices);
    await salon.save();

    const artists = await ArtistModel.find({ salon: salon._id });
    if (artists) {
      for (const artist of artists) {
        for (const service of createdServices) {
          const serviceArtist = new ServiceArtist({
            Service: service._id,
            Artist: artist._id,
            Price: service.ServiceCost,
          });
          await serviceArtist.save();
        }

        artist.services.push(...createdServices);
        await artist.save();
      }
    }

    return res.status(201).json({
      message: "Services created successfully",
      services: createdServices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in creating services" + error,
    });
  }
};

const createService = async (req, res) => {
  try {
    const {
      ServiceName,
      ServiceType,
      ServiceCost,
      ServiceTime,
      ServiceGender,
    } = req.body;

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

    const service = new Service({
      ServiceName,
      ServiceType,
      salon: salon._id,
      ServiceCost,
      ServiceTime,
      ServiceGender,
    });

    await service.save();

    salon.Services.push(service);

    await salon.save();

    // const artists = await ArtistModel.find({ salon: salon._id });

    // if (artists) {
    //   for (const artist of artists) {
    //     const serviceArtist = new ServiceArtist({
    //       Service: service._id,
    //       Artist: artist._id,
    //       Price: service.ServiceCost,
    //     });
    //     await serviceArtist.save();
    //     artist.services.push(service);
    //     await artist.save();
    //   }
    // }

    return res.status(201).json({
      success: true,  
      data: service,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in creating service" + error,
    });
  }
};

/**
 * @desc Update services
 * @method PUT
 * @route /api/services/update-service/:serviceId
 * @access Private
 * @requestBody { ServiceName, ServiceType, ServiceCost, ServiceTime, ServiceGender }
 */

const updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const {
      ServiceName,
      ServiceType,
      ServiceCost,
      ServiceTime,
      ServiceGender,
    } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const updateService = await Service.findById(serviceId);
    const ServicArtist = await ServiceArtist.find({ Service: serviceId });

    for (const sa of ServicArtist) {
      sa.Price = ServiceCost || sa.Price;
      await sa.save();
    }

    updateService.ServiceName = ServiceName || updateService.ServiceName;
    updateService.ServiceType = ServiceType || updateService.ServiceType;
    updateService.ServiceCost = ServiceCost || updateService.ServiceCost;
    updateService.ServiceTime = ServiceTime || updateService.ServiceTime;
    updateService.ServiceGender = ServiceGender || updateService.ServiceGender;

    await updateService.save();

    return res.status(200).json({
      success: true,
      data: updateService,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in updating service" + error,
    });
  }
};

/**
 * @desc Delete service
 * @method DELETE
 * @route /api/services/delete-service/:serviceId
 * @access Private
 * @requestParams { serviceId: String }
 */

const deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    // Find the service by ID
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Find artist and salon that reference this service
    const artists = await ArtistModel.find({ services: serviceId });
    const salon = await SalonModel.findOne({ Services: serviceId });

    // Find all service-artist relationships
    const serviceArtist = await ServiceArtist.find({ Service: serviceId });

    const appointments = await AppointmentModel.find({ services: serviceId });

    for (const appointment of appointments) {
      if (appointment.Status === "Booked") {
        return res.status(400).json({
          success: false,
          message: "Service is in use",
        });
      }
    }

    // Delete all service-artist relationships
    for (const sa of serviceArtist) {
      await sa.deleteOne();
    }

    // Remove service reference from artist, if it exists
    if (artists) {
      for (const artist of artists) {
        artist.services = artist.services.filter(
          (id) => id.toString() !== serviceId
        );
        await artist.save();
      }
    }

    // Remove service reference from salon, if it exists
    if (salon) {
      salon.Services = salon.Services.filter(
        (id) => id.toString() !== serviceId
      );
      await salon.save();
    }

    // Delete the service
    await service.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in deleting service: " + error,
    });
  }
};

/**
 * @desc Get services
 * @method GET
 * @route /api/services/get-services/:SalonId
 * @access Public
 * @requestParams { SalonId: String }
 */

const getServices = async (req, res) => {
  try {
    const { SalonId } = req.params;
    const Services = await SalonModel.findOne({ _id: SalonId }).populate(
      "Services"
    );   
    return res.status(200).json({ 
      success: true,
      message: "Services fetched successfully",
      Services : Services.Services,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in fetching services",
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    const userId = req.user._id;

    let salon2;

    if(req.user.role === 'subAdmin'){
      const artist = await ArtistModel.findOne({ userId: userId });
      salon2 = await SalonModel.findOne({ Artists: artist._id });
    }else{
      salon2 = await SalonModel.findOne({ userId: userId });
    }


    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }
    const services = await Service.find({
      ServiceType: categoryName,
      salon: salon2._id,
    });
    if (!services) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const servicesIds = services.map((service) => service._id);

    const appointments = await AppointmentModel.find({
      services: { $in: servicesIds },
    });

    for (const appointment of appointments) {
      if (appointment.Status === "Booked") {
        return res.status(400).json({
          success: false,
          message: "Category-service is in use",
        });
      }
    }
    const serviceArtist = await ServiceArtist.find({
      Service: { $in: servicesIds },
    });

    for (const service of serviceArtist) {
      await service.deleteOne();
    }

    const Artists = await ArtistModel.find({ services: { $in: servicesIds } });

    for (const artist of Artists) {
      artist.services.pull(...servicesIds);
      await artist.save();
    }

    const salon = await SalonModel.findOne({ services: { $in: servicesIds } });

    if (salon) {
      salon.Services.pull(...servicesIds);
      await salon.save();
    }

    for (const service of services) {
      await service.deleteOne();
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in deleting category",
    });
  }
};

const CreateServiceByExcel = async (req, res) => {
  try {
    const servicesData = req.body;
    const SalonId = req.params.salonId;
    // Validate if servicesData is an array
    if (!Array.isArray(servicesData)) {
      return res.status(400).json({
        success: false,
        message: "Services data must be an array",
      });
    }

    let salon = await SalonModel.findOne({ _id: SalonId });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const createdServices = [];
    // Loop through each service data and create services
    for (const serviceData of servicesData) {
      const {
        ServiceName,
        ServiceType,
        ServiceCost,
        ServiceTime,
        ServiceGender,
        isFeatured,
        ServiceDefaultDiscount,
      } = serviceData;

      // Validate inputs for each service
      if (
        !ServiceName ||
        !ServiceType ||
        !ServiceCost ||
        !ServiceTime ||
        !ServiceGender
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required for each service",
        });
      }

      // Create the service
      const service = new Service({
        ServiceName,
        ServiceType,
        salon: salon._id,
        ServiceCost,
        ServiceTime,
        ServiceGender,
        isFeatured,
        ServiceDefaultDiscount,
      });
      await service.save();

      // Add created service to the array
      createdServices.push(service);
    }

    // Update the salon with the new services
    salon.Services.push(...createdServices);
    await salon.save();

    const artists = await ArtistModel.find({ salon: salon._id });
    if (artists) {
      for (const artist of artists) {
        for (const service of createdServices) {
          const serviceArtist = new ServiceArtist({
            Service: service._id,
            Artist: artist._id,
            Price: service.ServiceCost,
          });
          await serviceArtist.save();
        }

        artist.services.push(...createdServices);
        await artist.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: "Services created successfully",
      services: createdServices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in creating services" + error,
    });
  }
};

const DeleteAllServices = async (req, res) => {
  try {
    const { salonId } = req.params;
    const services = await Service.find({ salon: salonId });
    const salon = await SalonModel.findOne({ _id: salonId });

    if (!services) {
      return res.status(404).json({
        success: false,
        message: "Services not found",
      });
    }

    const servicesIds = services.map((service) => service._id);

    const appointments = await AppointmentModel.find({
      services: { $in: servicesIds },
    });

    for (const appointment of appointments) {
      if (appointment.Status === "Booked") {
        return res.status(400).json({
          success: false,
          message: "Service is in use",
        });
      }
    }


    const Artists = await ArtistModel.find({ services: { $in: servicesIds } });

    for (const artist of Artists) {
      artist.services = [];
      await artist.save();
    }


    const serviceArtist = await ServiceArtist.find({
      Service: { $in: servicesIds },
    });

    for (const service of serviceArtist) {
      await service.deleteOne();
    }

    salon.Services = [];
    await salon.save();

    await Service.deleteMany({ salon: salonId });


    return res.status(200).json({
      success: true,
      message: "Services deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in deleting services",
    });
  }
};

export {
  createServices,
  getServices,
  DeleteAllServices,
  createServicesWithCustomizations,
  updateService,
  deleteService,
  deleteCategory,
  createService,
  CreateServiceByExcel,
};
