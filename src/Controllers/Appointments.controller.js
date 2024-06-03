import ArtistModel from "../Models/Artist.js";
import moment from "moment";
import AppointmentModel from "../Models/Appointments.js";
import generator from 'slot-generator';
import UserModel from "../Models/User.js";
import CustomerModel from "../Models/Customer.js";

moment.suppressDeprecationWarnings = true;

const getTimeSlots = async (req, res) => {
    const { artistId, timePeriod } = req.body;
    const artist = await ArtistModel.findById(artistId).populate('appointments');

    if (!artist) {
        return res.status(404).json({ 
            success: false,
            message: "Artist not found"
         });
    }

    const { workingDays, startTime, endTime } = artist;

    

    const date = moment();
    const startTimeDate = moment(`${date.format('YYYY-MM-DD')}T${startTime}:00.000+00:00`);
    const endDate = moment().add(10, 'days');
    const endTimeDate = moment(`${endDate.format('YYYY-MM-DD')}T${endTime}:00.000+00:00`);

    const WorkingDaysInNumber = workingDays.map((day) => {
        switch (day) {
            case 'Sunday': return 0;
            case 'Monday': return 1;
            case 'Tuesday': return 2;
            case 'Wednesday': return 3;
            case 'Thursday': return 4;
            case 'Friday': return 5;
            case 'Saturday': return 6;
        }
    });

    const params = {
        start: startTimeDate.toISOString(),
        step: timePeriod,
        end: endTimeDate.toISOString(),
        period: 'm',
        daysInWeek: WorkingDaysInNumber,
        gap: 0
    };

    let slots = generator(params);

    const conflictingSlots = artist.appointments.map((appointment) => {
        return {
            start: moment(appointment.appointmentStartTime),
            end: moment(appointment.appointmentEndTime)
        };
    });

    slots = slots.filter((slot) => {
        const slotMoment = moment(slot);
        return !conflictingSlots.some((conflict) => {
            return slotMoment.isBetween(conflict.start, conflict.end, null, '[)');
        });
    });

    return res.status(200).json({
        success: true,
        data: slots,
        message: "Time slots generated successfully"
    });
}


const createAppointmentByOwner = async (req, res) => {
    const { artistId, appointmentDate, appointmentStartTime, appointmentEndTime, name, phoneNumber } = req.body;
    const artist = await ArtistModel.findById(artistId);

    const user = await UserModel.findOne({ phoneNumber });

    if (!user) {
        const newUser = new UserModel({ name, phoneNumber, role: 'Customer' });
        await newUser.save();
        user = newUser;

        const newCustomer = new CustomerModel({ userId: newUser._id ,name,phoneNumber});
        await newCustomer.save();
    }


    if (!artist) {
        return res.status(404).json({
            success: false,
            message: "Artist not found"
         });
    }

    const cusomter = await CustomerModel.findOne({ userId: user });

    const Duration = moment.duration(appointmentEndTime).asMinutes() - moment.duration(appointmentStartTime).asMinutes();

    const appointment = new AppointmentModel({
        user: user,
        appointmentDate,
        appointmentStartTime,
        appointmentEndTime,
        Duration,
        artist : artistId
    });

    await appointment.save();

    artist.appointments.push(appointment);
    await artist.save();

    cusomter.appointments.push(appointment);
    await cusomter.save();

    return res.status(201).json({ 
        success: true,
        message: "Appointment created successfully" 
    });
}


const createAppointmentLock = async (req, res) => {
    const { artistId, appointmentDate, appointmentStartTime, appointmentEndTime} = req.body;
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    const artist = await ArtistModel.findById(artistId);

    if (!artist) {
        return res.status(404).json({ 
            success: false,
            message: "Artist not found" 
        });
    }

    const Duration = moment.duration(appointmentEndTime).asMinutes() - moment.duration(appointmentStartTime).asMinutes();

    const appointment = new AppointmentModel({
        user: user,
        appointmentDate,
        appointmentStartTime,
        appointmentEndTime,
        Duration,
        Status: 'Locked',
        lockExpires: moment().add(10, 'minutes'),
        artist : artistId
    });

    await appointment.save();

    artist.appointments.push(appointment);
    await artist.save();

    return res.status(201).json({ 
        success: true,
        message: "Appointment created successfully" });
}

const BookAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const {appointmentCost} = req.body;
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    const appointment = await AppointmentModel.findOne({
        _id: appointmentId,
        user: user,
        Status: 'Locked',
    });

    const artist = await ArtistModel.findById(appointment.artist);

    if (!appointment) {
        return res.status(404).json({
            success: false,
            message: "Appointment not found or Session Expired" 
        });
    }

    if(appointment.lockExpires < moment()){
        await appointment.remove();
        await artist.appointments.pull(appointment);
        return res.status(400).json({ 
            success: false,
            message: "Session Expired" 
        });
    }

    appointment.Status = 'Booked';
    appointment.lockExpires = null;
    appointment.appointmentCost = appointmentCost;

    await appointment.save();

    const customer = await CustomerModel.findOne({ userId: user });
    customer.appointments.push(appointment);
    await customer.save();

    return res.status(200).json({ 
        success: true,
        message: "Appointment Booked Successfully" 
    });
}

const releaseExpiredLocks = async () => {
    try {
        const expiredLocks = await AppointmentModel.find({
            Status: 'Locked',
            lockExpires: { $lt: moment() }
        });

        for (const lock of expiredLocks) {
            const artist = await ArtistModel.findById(lock.artist);
            await lock.remove();
            await artist.appointments.pull(lock);
            await artist.save();
        }

    } catch (error) {
      console.error('Error releasing expired locks:', error);
    }
};

setInterval(releaseExpiredLocks, 600000 );

export {getTimeSlots,createAppointmentByOwner};
