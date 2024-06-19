import Service from "../Models/Services.js";
import SalonModel from "../Models/Salon.js";
import ArtistModel from "../Models/Artist.js";

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
        message: "Services data must be an array" 
      });
    }

    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });
    if (!salon) {
      return res.status(404).json({ 
        success: false,
        message: "Salon not found" 
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
            message: "All fields are required for each service" });
      }

      // Create the service
      const service = new Service({
        ServiceName,
        ServiceType,
        salon : salon._id,
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


    return res
      .status(201)
      .json({
        message: "Services created successfully",
        services: createdServices,
      });
  } catch (error) {
    return res.status(500).json({ 
        success: false,
        message: "Error in creating services"
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
    const {ServiceName,
        ServiceType,
        ServiceCost,
        ServiceTime,
        ServiceGender
     } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: "Service not found" });
    }

    const updateService = await Service.findById(serviceId)

    console.log(ServiceName,ServiceType,ServiceCost,ServiceTime,ServiceGender)

    updateService.ServiceName = ServiceName || updateService.ServiceName;
    updateService.ServiceType = ServiceType || updateService.ServiceType;
    updateService.ServiceCost = ServiceCost || updateService.ServiceCost;
    updateService.ServiceTime = ServiceTime || updateService.ServiceTime;
    updateService.ServiceGender = ServiceGender || updateService.ServiceGender;

    await updateService.save();

    return res.status(200).json({ 
        success: true,
        data:updateService 
    });
  } catch (error) {
    return res.status(500).json({ 
        success: false,
        message: "Error in updating service"
     });
  }
}

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
        const service = await Service.findById(serviceId);
        const artist = await ArtistModel.findOne({ services: serviceId });
        const salon = await SalonModel.findOne({ services: serviceId });
        if (!service) {
        return res.status(404).json({ 
          success: false,
          message: "Service not found" 
        });
        }
        if(artist){
          artist.services.pull(serviceId);
        }
        if(salon){
          salon.Services.pull(serviceId);
        }

        await artist.save();
        await salon.save();

        await service.deleteOne();
        return res.status(200).json({ 
            success: true,
            message: "Service deleted successfully" 
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false,
            message: "Error in deleting service"+error,
         });
    }
    }

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
    const Services = await SalonModel.findOne({ _id: SalonId }).populate("Services");
    return res.status(200).json({ Services });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
        success: false,
        message: "Error in fetching services"
     });
  }
};



export { createServices, getServices ,updateService,deleteService };
