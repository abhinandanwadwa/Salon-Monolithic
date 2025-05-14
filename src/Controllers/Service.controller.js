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
    const salon = await SalonModel.findOne({ Services: serviceId });

    // Find all service-artist relationships

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


export const CreateServiceByExcel = async (req, res) => {
  try {
    const servicesData = req.body; // Expecting an array of service objects
    const SalonId = req.params.salonId;

    // Validate SalonId
    if (!mongoose.Types.ObjectId.isValid(SalonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Salon ID format",
      });
    }

    // Validate if servicesData is an array and not empty
    if (!Array.isArray(servicesData) || servicesData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Services data must be a non-empty array",
      });
    }

    const salon = await SalonModel.findById(SalonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const createdServices = [];
    const errors = []; // To collect any validation errors per service

    // Loop through each service data and create services
    for (let i = 0; i < servicesData.length; i++) {
      const serviceData = servicesData[i];
      const {
        ServiceName,
        ServiceType,
        ServiceCost,
        ServiceTime,
        ServiceGender,
        isFeatured, // Optional, defaults to false in schema
        ServiceDefaultDiscount, // Optional, defaults to 0 in schema
        CustomizationOptions, // This is new, expect an array of { OptionName, OptionPrice }
      } = serviceData;

      if (
        !ServiceName ||
        !ServiceType ||
        ServiceCost === undefined || // Check for undefined as 0 is a valid cost
        ServiceTime === undefined || // Check for undefined as 0 might be a (though unlikely) valid time
        !ServiceGender
      ) {
        errors.push({
          index: i,
          message: `Service at index ${i}: Missing required fields (ServiceName, ServiceType, ServiceCost, ServiceTime, ServiceGender).`,
          data: serviceData,
        });
        continue; // Skip this service and try the next one
      }

      // Validate CustomizationOptions if provided
      let processedCustomizationOptions = [];
      if (CustomizationOptions && Array.isArray(CustomizationOptions)) {
        for (const opt of CustomizationOptions) {
          if (
            !opt.OptionName ||
            typeof opt.OptionName !== "string" ||
            opt.OptionPrice === undefined ||
            typeof opt.OptionPrice !== "number"
          ) {
            errors.push({
              index: i,
              message: `Service at index ${i} ('${ServiceName}'): Invalid CustomizationOption. Each option must have OptionName (string) and OptionPrice (number).`,
              optionData: opt,
            });
            // If one option is bad, you might want to invalidate all options for this service
            // or skip this service entirely. For now, let's make options invalid for this service.
            processedCustomizationOptions = undefined; // Mark as invalid
            break; // Stop processing options for this service
          }
          processedCustomizationOptions.push({
            OptionName: opt.OptionName,
            OptionPrice: opt.OptionPrice,
          });
        }
        if(processedCustomizationOptions === undefined) continue; // Skip service due to bad option
      }


      // Create the service payload
      const servicePayload = {
        ServiceName,
        ServiceType,
        salon: salon._id, // Link to the salon
        ServiceCost,
        ServiceTime,
        ServiceGender,
        isFeatured: isFeatured !== undefined ? isFeatured : false, // Use provided or schema default
        ServiceDefaultDiscount: ServiceDefaultDiscount !== undefined ? ServiceDefaultDiscount : 0, // Use provided or schema default
        CustomizationOptions: processedCustomizationOptions || [], // Use processed or default to empty array
        // ServiceCount will default to 0 as per schema
      };

      try {
        const service = new Service(servicePayload);
        await service.save();
        createdServices.push(service);
      } catch (saveError) {
        // Catch Mongoose validation errors (e.g., enum validation for ServiceGender)
        errors.push({
          index: i,
          message: `Service at index ${i} ('${ServiceName}'): Error saving - ${saveError.message}`,
          data: serviceData,
        });
      }
    }

    // If there were errors processing some services but others were successful
    if (errors.length > 0 && createdServices.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to create any services due to validation errors.",
        errors: errors,
      });
    }
    
    // Update the salon with the new services (assuming salon.Services stores ObjectIds)
    if (createdServices.length > 0) {
      salon.Services.push(...createdServices.map((s) => s._id));
      await salon.save();
    }

    if (errors.length > 0) {
      // Partial success
      return res.status(207).json({ // 207 Multi-Status
        success: true, // Operation partially succeeded
        message: "Some services created successfully, but some had errors.",
        services: createdServices,
        errors: errors,
      });
    }

    return res.status(201).json({
      success: true,
      message: "All services created successfully",
      services: createdServices,
    });

  } catch (error) {
    console.error("Error in CreateServiceByExcel:", error); // Log the full error for debugging
    return res.status(500).json({
      success: false,
      message: "Server error while creating services. " + error.message, // Send a cleaner error message
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
