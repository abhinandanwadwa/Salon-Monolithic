import CustomerModel from "../Models/Customer.js";
import UserModel from "../Models/User.js";
import generateToken from "../utils/generatetoken.js";
import otpGenerator from "otp-generator";
import fast2sms from "fast-two-sms";

// /**
//  * @desc Send OTP to the user
//  * @route POST /api/auth/send-otp
//  * @access Public
//  * @request { phoneNumber, role }
//  */

// const sendOTP = async (req, res) => {
//   try {
//     const { phoneNumber, role } = req.body;

//     let user = await UserModel.findOne({ phoneNumber });

//     const otp = otpGenerator.generate(4, {
//       upperCaseAlphabets: false,
//       specialChars: false,
//       lowerCaseAlphabets: false,
//     });

//     const otpExpiration = new Date();
//     otpExpiration.setMinutes(otpExpiration.getMinutes() + 1);

//     if (!user) {
//       user = new UserModel({ phoneNumber, role, otp, otpExpiration });
//       await user.save();
//     } else {
//       user.otp = otp;
//       user.otpExpiration = otpExpiration;
//       await user.save();
//     }

//     const options = {
//       authorization: process.env.FAST2SMS_API_KEY,
//       message: `your OTP verification code is ${otp}`,
//       numbers: [phoneNumber],
//     };

//     fast2sms
//       .sendMessage(options)
//       .then((response) => {
//         console.log("otp sent successfully", response);
//       })
//       .catch((error) => {
//         console.log(error);
//       });

//     return res.status(200).json({ message: "OTP sent:", otp });
//   } catch (error) {
//     console.log("Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to send OTP",
//     });
//   }
// };

// /**
//  * @desc Verify OTP
//  * @route POST /api/auth/verify-otp
//  * @access Public
//  * @request { phoneNumber, enteredOTP }
//  * @response { _id, phoneNumber, role }
//  */

// const verifyOTP = async (req, res) => {
//   try {
//     const { phoneNumber, enteredOTP, name } = req.body;
//     const user = await UserModel.findOne({ phoneNumber });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "user not found",
//       });
//     }

//     if (enteredOTP !== user.otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }

//     const currentDateTime = new Date();
//     if (currentDateTime > user.otpExpiration) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP expired",
//       });
//     }

//     if (user.role === "Customer") {
//       const customer = await CustomerModel.findOne({ userId: user._id });
//       if (!customer) {
//         const newCustomer = new CustomerModel({
//           userId: user._id,
//           name,
//           phoneNumber,
//         });
//         await newCustomer.save();
//       }
//     }

//     user.otp = null;
//     user.otpExpiration = null;
//     await user.save();

//     generateToken(res, user);
//     return res.status(201).json({
//       _id: user._id,
//       phoneNumber: user.phoneNumber,
//       role: user.role,
//     });
//   } catch (error) {
//     console.log("Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to verify OTP",
//     });
//   }
// };


/**
 * @desc Verify User
 * @route POST /api/auth/verifyUser
 * @access Public
 * @request { phoneNumber, verified ,role }
 * @response { _id, phoneNumber, role }
 */


const verifyUser = async (req, res) => {
  try {
    const { phoneNumber, verified,role } = req.body;

    const user = await UserModel.findOne({ phoneNumber });

    if (!user  && verified) {
      const newUser = new UserModel({ phoneNumber , role});
      await newUser.save();

      generateToken(res, newUser);
      return res.status(201).json({
        _id: newUser._id,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        isSalon: newUser.isSalon,
      });
    }

    generateToken(res, user);
    return res.status(201).json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isSalon: user.isSalon,
    });

  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify User",
    });
  }
};

/**
 * @desc Change Role
 * @route POST /api/auth/changeRole
 * @access Private
 * @request { artists }
 */

const ChangeRole = async (req, res) => {
  try {
    const { artists } = req.body;
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    for (let artistid of artists) {
      const artist = await ArtistModel.findById(artistid);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: "Artist not found",
        });
      }

      const user = await UserModel.findOneAndUpdate(
        { _id: artist.userId },
        { role: "subAdmin" }
      );

      await user.save();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in changing role",
    });
  }
};

/**
 * @desc Logout
 * @route POST /api/auth/logout
 * @access Private
 */

const logout = async (req, res) => {
  res.cookie("jwt", "", {
    expires: new Date(0),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: "User Logged Out",
  });
};

export { verifyUser, ChangeRole, logout };
