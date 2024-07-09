import ArtistModel from "../Models/Artist.js";
import moment from "moment";
import AppointmentModel from "../Models/Appointments.js";
import generator from "slot-generator";
import UserModel from "../Models/User.js";
import SalonModel from "../Models/Salon.js";
import CustomerModel from "../Models/Customer.js";
import Service from "../Models/Services.js";
import ServiceArtist from "../Models/ServiceArtist.js";
import OfferModel from "../Models/Offer.js";
import ReviewModel from "../Models/review.js";

moment.suppressDeprecationWarnings = true;

const getCost = async (req, res) => {
  try {
    const { artistId, services, salonid } = req.body;

    console.log(artistId, services);

    let cost = 0;

    for (let i = 0; i < services.length; i++) {
      const serviceArtist = await ServiceArtist.findOne({
        Artist: artistId,
        Service: services[i],
      });
      if (!serviceArtist) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }
      cost += serviceArtist.Price;
    }

    const allServices = await ServiceArtist.find({
      Artist: artistId,
      Service: services,
    }).populate("Service");

    const salon = await SalonModel.findById(salonid)
      .select("-Artists -Services -StorePhotos -appointments")
      .populate("Reviews");

    const data = {
      cost,
      services: allServices,
      salon,
    };

    return res.status(200).json({
      success: true,
      data: data,
      message: "data fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @desc Get Time Slots
 * @route POST /api/appointments/get-time-slots
 * @access Public
 * @request { artistId, timePeriod, services }
 * @response { data, duration, message }
 */

const getTimeSlots = async (req, res) => {
  try {
    const { artistId, timePeriod, services } = req.body;

    console.log(artistId, timePeriod, services);

    // Fetch artist data including appointments
    const artist = await ArtistModel.findById(artistId).populate("appointments");
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    // Calculate the total duration if timePeriod is not provided
    let timeDuration = timePeriod || 0;
    if (!timePeriod) {
      for (let serviceId of services) {
        const service = await Service.findById(serviceId);
        if (service) {
          timeDuration += service.ServiceTime;
        }
      }
    }

    // Define the start and end time as moment objects for the artist's working hours
    let startDate = moment().startOf("day");
    const endDate = moment().add(30, "days").endOf("day");

    // Extract the working hours (assuming they are provided as HH:mm)
    const startTime24 = artist.startTime.split("T")[1].split(":").slice(0, 2).join(":");
    const endTime24 = artist.endTime.split("T")[1].split(":").slice(0, 2).join(":");

    // Convert working days to numbers (0 = Sunday, 6 = Saturday)
    const workingDaysMap = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    const workingDaysInNumber = artist.workingDays.map(day => workingDaysMap[day]);

    const currentTime = moment();
    if (currentTime.isAfter(moment().set({ hour: endTime24.split(":")[0], minute: endTime24.split(":")[1] }))) {
      startDate = currentTime.add(1, 'days').startOf('day');
    }

    // Generate slots for each day within the date range
    let slots = [];
    for (let m = moment(startDate); m.isBefore(endDate); m.add(1, "days")) {
      if (workingDaysInNumber.includes(m.day())) {
        const dayStart = moment(m).set({
          hour: startTime24.split(":")[0],
          minute: startTime24.split(":")[1],
          second: 0,
          millisecond: 0,
        });
        const dayEnd = moment(m).set({
          hour: endTime24.split(":")[0],
          minute: endTime24.split(":")[1],
          second: 0,
          millisecond: 0,
        });

        const adjustedEnd = dayEnd.clone().subtract(timeDuration, 'minutes'); // Adjust end time by subtracting the duration

        let slot = moment(dayStart);
        while (slot.isBefore(dayEnd)) {
          if (slot.add(timeDuration, 'minutes').isBefore(dayEnd)) {
            slots.push(slot.clone().format("YYYY-MM-DDTHH:mm:ss.SSS"));
          }
          slot.add(15, "minutes");
        }
      }
    }


    // Filter out slots that conflict with existing appointments
    const conflictingSlots = artist.appointments.map((appointment) => ({
      start: moment(appointment.appointmentStartTime),
      end: moment(appointment.appointmentEndTime),
    }));

    slots = slots.filter((slot) => {
      const slotMoment = moment(slot);
      return !conflictingSlots.some((conflict) =>
        slotMoment.isBetween(conflict.start, conflict.end, null, "[)")
      );
    });

    // remove the time duration from the end of the day


    // Return the available slots
    return res.status(200).json({
      success: true,
      data: slots,
      duration: timeDuration,
      message: "Time slots generated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error" + error,
    });
  }
};


/**
 * @desc Create Appointment By Owner
 * @route POST /api/appointments/create-appointment
 * @access Public
 * @request { artistId, appointmentDate, appointmentStartTime, appointmentEndTime, name, phoneNumber }
 */

const createAppointmentByOwner = async (req, res) => {
  try {
    const {
      artistId,
      services,
      appointmentStartTime,
      duration,
      name,
      phoneNumber,
      gender,
    } = req.body;

    const artist = await ArtistModel.findById(artistId);

    const owner = req.user._id;

    let salon = await SalonModel.findOne({ userId: owner });

    if(req.user.role == "subAdmin"){
      const artist = await ArtistModel.findOne({ userId: owner });
      salon = await SalonModel.findOne({ Artists: artist._id });
    }

    const user = await UserModel.findOne({ phoneNumber });

    if (!user) {
      const newUser = new UserModel({ name, phoneNumber, role: "Customer" });
      await newUser.save();

      const newCustomer = new CustomerModel({
        userId: newUser._id,
        name,
        gender,
        phoneNumber,
      });
      await newCustomer.save();
    }

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    let cost = 0;

    for (let i = 0; i < services.length; i++) {
      const serviceArtist = await ServiceArtist.findOne({
        Artist: artistId,
        Service: services[i],
      });

      console.log(serviceArtist);

      if (!serviceArtist) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }
      cost += serviceArtist.Price;
    }

    const appointmentDate = moment(appointmentStartTime).format("YYYY-MM-DD");

    const customer = await CustomerModel.findOne({ phoneNumber });

    //remove z from the end of the date

    const appointmentEndTime = moment(appointmentStartTime)
      .add(duration, "minutes")
      .format("YYYY-MM-DDTHH:mm:ss.SSS");
    console.log(appointmentEndTime);

    const overlappingAppointments = await AppointmentModel.find({
      artist: artistId,
      appointmentDate,
      $or: [
        {
          appointmentStartTime: {
            $lt: appointmentEndTime,
            $gte: appointmentStartTime,
          },
        },
        {
          appointmentEndTime: {
            $gt: appointmentStartTime,
            $lte: appointmentEndTime,
          },
        },
        {
          appointmentStartTime: { $lte: appointmentStartTime },
          appointmentEndTime: { $gte: appointmentEndTime },
        },
      ],
    });

    if (overlappingAppointments.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Appointment time slot already booked",
      });
    }

    const appointment = new AppointmentModel({
      user: customer,
      appointmentDate,
      salon: salon,
      appointmentStartTime,
      appointmentEndTime,
      services: services,
      Duration: duration,
      artist: artistId,
      appointmentCost: cost,
      Status: "Booked",
      gender,
    });

    await appointment.save();

    artist.appointments.push(appointment);
    await artist.save();

    customer.appointments.push(appointment);
    await customer.save();

    salon.appointments.push(appointment);
    await salon.save();

    return res.status(201).json({
      success: true,
      message: "Appointment created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"+error ,
    });
  }
};

const editAppointment = async (req, res) => {
  try {
    const {
      appointmentId,
      artistId,
      appointmentStartTime,
      duration,
      services,
    } = req.body;
 
    const appointment = await AppointmentModel.findById(appointmentId);
    const artist = await ArtistModel.findById(appointment.artist);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    artist.appointments.pull(appointment);

    await artist.save();

    let cost = 0;

    for (let i = 0; i < services.length; i++) {
      const serviceArtist = await ServiceArtist.findOne({
        Artist: artistId,
        Service: services[i],
      });
      if (!serviceArtist) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }
      cost += serviceArtist.Price;
    }

    const appointmentDate = moment(appointmentStartTime).format("YYYY-MM-DD");

    const newArtist = await ArtistModel.findById(artistId);

    // const appointmentStart = appointmentStartTime.slice(0, -1);

    const appointmentEndTime = moment(appointmentStartTime)
      .add(duration, "minutes")
      .format("YYYY-MM-DDTHH:mm:ss.SSS");

    appointment.appointmentDate =
      appointmentDate || appointment.appointmentDate;
    appointment.appointmentStartTime =
      appointmentStartTime || appointment.appointmentStartTime;
    appointment.appointmentEndTime =
      appointmentEndTime || appointment.appointmentEndTime;
    appointment.Duration = duration || appointment.Duration;
    appointment.services = services || appointment.services;
    appointment.appointmentCost = cost || appointment.appointmentCost;
    appointment.artist = artistId || appointment.artist;

    await appointment.save();

    newArtist.appointments.push(appointment);

    await newArtist.save();

    return res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"+error,
    });
  }
};

/**
 * @desc Reschedule Appointment
 * @route PUT /api/appointments/reschedule-appointment
 * @access Public
 * @request { appointmentId, appointmentDate, appointmentStartTime, appointmentEndTime }
 * @response { message }
 */

const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId, appointmentStartTime, duration } = req.body;
    console.log(appointmentId, appointmentStartTime, duration);
    const userId = req.user._id;
    const user = await UserModel.findById(userId);

    const appointment = await AppointmentModel.findById(appointmentId);

    const appointmentDate = moment(appointmentStartTime).format("YYYY-MM-DD");

    const appointmentEndTime = moment(appointmentStartTime)
      .add(duration, "minutes")
      .format("YYYY-MM-DDTHH:mm:ss.SSS");

    appointment.appointmentDate = appointmentDate;
    appointment.appointmentStartTime = appointmentStartTime;
    appointment.appointmentEndTime = appointmentEndTime;
    appointment.Duration = duration;

    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"+error,
    });
  }
};

const CompleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await AppointmentModel.findById(appointmentId);

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment Id is required",
      });
    }

    appointment.Status = "Completed";

    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment Completed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error" + error,
    });
  }
};

/**
 * @desc Cancel Appointment
 * @route DELETE /api/appointments/cancel-appointment/:appointmentId
 * @access Public
 * @response { message }
 * @errors Appointment not found
 */

const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;
    const user = await UserModel.findById(userId);

    if (user.role === "Owner" || user.role === "subAdmin" || user.role === "Artist") {
      const appointment = await AppointmentModel.findOne({
        _id: appointmentId,
      });
      const artist = await ArtistModel.findById(appointment.artist);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      if (appointment.Status === "Cancelled") {
        return res.status(400).json({
          success: false,
          message: "Appointment already cancelled",
        });
      }

      appointment.Status = "Cancelled";

      await appointment.save();

      return res.status(200).json({
        success: true,
        message: "Appointment cancelled successfully",
      });
    }

    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      user: user,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    appointment.Status = "Cancelled";

    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment Cancelled successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error" + error,
    });
  }
};

const CreateAppointment = async (req, res) => {
  try {
    const {
      artistId,
      appointmentDate,
      appointmentStartTime,
      duration,
      services,
      cost,
      offer,
    } = req.body;
    const userId = req.user._id;
    const customer = await CustomerModel.findOne({ userId: userId });
    const artist = await ArtistModel.findById(artistId);
    const salon = await SalonModel.findOne({ Artists: artistId });
    const offerId = await OfferModel.findOne({ OfferName: offer });

    //appointment start time is in 9:00 format
    //appointment date is in 2024-06-16 format

    console.log(appointmentStartTime);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    const appointmentEndTime = moment(appointmentStartTime)
      .add(duration, "minutes")
      .format("YYYY-MM-DDTHH:mm:ss.SSS");

    const overlappingAppointments = await AppointmentModel.find({
      artist: artistId,
      appointmentDate,
      $or: [
        {
          appointmentStartTime: {
            $lt: appointmentEndTime,
            $gte: appointmentStartTime,
          },
        },
        {
          appointmentEndTime: {
            $gt: appointmentStartTime,
            $lte: appointmentEndTime,
          },
        },
        {
          appointmentStartTime: { $lte: appointmentStartTime },
          appointmentEndTime: { $gte: appointmentEndTime },
        },
      ],
    });

    if (overlappingAppointments.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Appointment time slot already booked",
      });
    }

    const appointment = new AppointmentModel({
      user: customer,
      artist: artistId,
      appointmentDate,
      appointmentStartTime,
      salon: salon,
      appointmentEndTime,
      Duration: duration,
      services,
      gender:customer.gender,
      appointmentCost: cost,
      Status: "Booked",
    });

    await appointment.save();

    salon.appointments.push(appointment);
    await salon.save();
    artist.appointments.push(appointment);
    await artist.save();
    customer.appointments.push(appointment);
    if (offerId) {
      customer.offers.push(offerId._id);
    }
    await customer.save();

    return res.status(201).json({
      success: true,
      data: appointment._id,
      message: "Appointment created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error" + error,
    });
  }
};

const getAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    const customer = await CustomerModel.findOne({ userId: user });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const appointments = await AppointmentModel.find({ user: customer })
      .populate("services")
      .populate({
        path: "salon",
        select: "-Artists -Services -StorePhotos -appointments",
      })
      .populate("Review");

    if (!appointments.length) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No appointments found",
      });
    }

    return res.status(200).json({
      success: true,
      data: appointments,
      message: "Appointments fetched successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAppointmentsById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    const customer = await CustomerModel.findOne({ userId: user });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      user: customer,
    })
      .populate("services")
      .populate({
        path: "salon",
        populate: {
          path: "Reviews",
        },
        select: "-Artists -Services -StorePhotos -appointments",
      });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: appointment,
      message: "Appointment fetched successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export {
  getTimeSlots,
  createAppointmentByOwner,
  cancelAppointment,
  rescheduleAppointment,
  editAppointment,
  CompleteAppointment,
  getCost,
  CreateAppointment,
  getAppointments,
  getAppointmentsById,
};

// /**
//  * @desc Create Appointment Lock
//  * @route POST /api/appointments/create-appointment-lock
//  * @access Public
//  * @request { artistId, appointmentDate, appointmentStartTime, appointmentEndTime }
//  */

// const createAppointmentLock = async (req, res) => {
//     const { artistId, appointmentDate, appointmentStartTime, duration,services} = req.body;
//     const userId = req.user._id;
//     const user = await UserModel.findById(userId);
//     const artist = await ArtistModel.findById(artistId);

//     if (!artist) {
//         return res.status(404).json({
//             success: false,
//             message: "Artist not found"
//         });
//     }

//     const appointmentEndTime = moment(appointmentStartTime).add(duration, 'minutes').toISOString();

//     const appointment = new AppointmentModel({
//         user: user,
//         appointmentDate,
//         appointmentStartTime,
//         appointmentEndTime,
//         Duration: duration,
//         services: services,
//         Status: 'Locked',
//         lockExpires: moment().add(10, 'minutes'),
//         artist : artistId
//     });

//     await appointment.save();

//     artist.appointments.push(appointment);
//     await artist.save();

//     return res.status(201).json({
//         success: true,
//         message: "Appointment created successfully" });
// }

// /**
//  * @desc Book Appointment
//  * @route POST /api/appointments/book-appointment
//  * @access Public
//  * @params { appointmentId }
//  * @request { appointmentCost }
//  * @response { message }
//  */

// const BookAppointment = async (req, res) => {
//     const { appointmentId } = req.params;
//     const {appointmentCost} = req.body;
//     const userId = req.user._id;
//     const user = await UserModel.findById(userId);
//     const appointment = await AppointmentModel.findOne({
//         _id: appointmentId,
//         user: user,
//         Status: 'Locked',
//     });

//     const artist = await ArtistModel.findById(appointment.artist);

//     if (!appointment) {
//         return res.status(404).json({
//             success: false,
//             message: "Appointment not found or Session Expired"
//         });
//     }

//     if(appointment.lockExpires < moment()){
//         await appointment.remove();
//         await artist.appointments.pull(appointment);
//         return res.status(400).json({
//             success: false,
//             message: "Session Expired"
//         });
//     }

//     appointment.Status = 'Booked';
//     appointment.lockExpires = null;
//     appointment.appointmentCost = appointmentCost;

//     await appointment.save();

//     const customer = await CustomerModel.findOne({ userId: user });
//     customer.appointments.push(appointment);
//     await customer.save();

//     return res.status(200).json({
//         success: true,
//         message: "Appointment Booked Successfully"
//     });
// }

// const releaseExpiredLocks = async () => {
//     try {
//         const expiredLocks = await AppointmentModel.find({
//             Status: 'Locked',
//             lockExpires: { $lt: moment() }
//         });

//         for (const lock of expiredLocks) {
//             const artist = await ArtistModel.findById(lock.artist);
//             await lock.remove();
//             await artist.appointments.pull(lock);
//             await artist.save();
//         }

//     } catch (error) {
//       console.error('Error releasing expired locks:', error);
//     }
// };

// setInterval(releaseExpiredLocks, 60000 );
