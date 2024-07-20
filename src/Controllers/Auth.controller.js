import CustomerModel from "../Models/Customer.js";
import UserModel from "../Models/User.js";
import generateToken from "../utils/generatetoken.js";
import otpGenerator from "otp-generator";
import bycrypt from "bcryptjs";
import { UserDetail } from "otpless-node-js-auth-sdk";
import Service from "../Models/Services.js";
import ServiceArtist from "../Models/ServiceArtist.js";
import ArtistModel from "../Models/Artist.js";
import AppointmentModel from "../Models/Appointments.js";
import ReviewModel from "../Models/review.js";
import SalonModel from "../Models/Salon.js";
import OfferModel from "../Models/Offer.js";
import messaging from "./fcmClient.js";
import axios from "axios";
import Statistic from "../Models/Statistics.js";



// const verifyToken = async (req, res) => {
//   try {
//       const {token,role} = req.body;

//       const userDetailUsingToken = await UserDetail.verifyToken(token,process.env.CLIENT_ID,process.env.CLIENT_SECRET);

//       const phoneNumber = userDetailUsingToken.national_phone_number;
//       const user = await UserModel.findOne({ phoneNumber });
//       if(userDetailUsingToken.success){
//         if (!user) {
//           const newUser = new UserModel({ phoneNumber , role});
//           await newUser.save();

//           if(role === "Customer"){
//             const newCustomer = new CustomerModel({ userId: newUser._id, phoneNumber });
//             await newCustomer.save();

//             generateToken(res, newUser);
//             return res.status(201).json({
//               success: true,
//               user:{
//                 _id: newUser._id,
//                 phoneNumber: newUser.phoneNumber,
//                 role: newUser.role,
//                 isSalon: newUser.isSalon,
//                 isNewUser: true
//               }
//             });
//           }

//           generateToken(res, newUser);
//           return res.status(201).json({
//             success: true,
//             user:{
//               _id: newUser._id,
//               phoneNumber: newUser.phoneNumber,
//               role: newUser.role,
//               isSalon: newUser.isSalon,
//             }
//           });
//         }

//         if(user.role === "Customer" && role === "Owner"){
//           const customer = await CustomerModel.findOne({ userId: user._id });
//           await CustomerModel.findByIdAndDelete(customer._id);

//           user.role = role;
//           await user.save();

//           generateToken(res, user);
//           return res.status(201).json({
//             success: true,
//             user:{
//               _id: user._id,
//               phoneNumber: user.phoneNumber,
//               role: user.role,
//               isSalon: user.isSalon,
//             }
//           });
//         }

//         if(user.role === "Customer"){
//           const customer = await CustomerModel.findOne({ userId: user._id });

//           generateToken(res, user);
//           return res.status(201).json({
//             success: true,
//             user:{
//               _id: user._id,
//               name: customer.name,
//               phoneNumber: user.phoneNumber,
//               role: user.role,
//               isSalon: user.isSalon,
//             }
//           });

//         }

//         generateToken(res, user);
//         return res.status(201).json({
//           success: true,
//           user:{
//             _id: user._id,
//             phoneNumber: user.phoneNumber,
//             role: user.role,
//             isSalon: user.isSalon,
//           }
//         });
//       }
//   } catch (error) {
//       console.error('Error:', error.message);
//       res.status(500).json({ error: 'An error occurred in verify-token' });
//   }
// };

const verifyToken = async (req, res) => {
  try {
    const { token, role, fcmToken } = req.body;

    const FcmTokenDetails = fcmToken ? fcmToken : null;

    const userDetailUsingToken = await UserDetail.verifyToken(
      token,
      "XI43XR8TV3OD7VGKK08DJS3224D7J2BC",
      "dz7dhmhbkbv329sqf90r6uovpztiz700"
    );

    const phoneNumber = userDetailUsingToken.national_phone_number;
    const user = await UserModel.findOne({ phoneNumber });
    if (userDetailUsingToken.success) {
      if (!user) {
        const newUser = new UserModel({ phoneNumber, role, token: FcmTokenDetails });
        await newUser.save();

        if (role === "Customer") {
          const newCustomer = new CustomerModel({
            userId: newUser._id,
            phoneNumber,
          });
          await newCustomer.save();

          generateToken(res, newUser);
          return res.status(201).json({
            success: true,
            user: {
              _id: newUser._id,
              phoneNumber: newUser.phoneNumber,
              role: newUser.role,
              isSalon: newUser.isSalon,
              isNewUser: true,
            },
          });
        }

        if (role === "Owner") {
          generateToken(res, newUser);
          return res.status(201).json({
            success: true,
            user: {
              _id: newUser._id,
              phoneNumber: newUser.phoneNumber,
              role: newUser.role,
              isSalon: newUser.isSalon,
            },
          });
        }
      }

      if (user.role === "Artist" && role === "Owner") {

        user.token = FcmTokenDetails;
        await user.save();
        generateToken(res, user);
        return res.status(201).json({
          success: true,
          user: {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            role: user.role,
            isSalon: user.isSalon,
          },
        });
      } else if (user.role === "Artist" && role === "Customer") {
        const customer = await CustomerModel.findOne({ userId: user._id });
        const artist = await ArtistModel.findOne({ userId: user._id });
        if (!customer) {
          const newCustomer = new CustomerModel({
            userId: user._id,
            phoneNumber,
            name: artist.ArtistName,
          });
          await newCustomer.save();
        }

        generateToken(res, user);
        return res.status(201).json({
          success: true,
          user: {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            role: user.role,
            name: artist.ArtistName,
            gender: user.gender,
            isSalon: user.isSalon,
          },
        });
      }

      if (user.role === "Owner" && role === "Owner") {
        user.token = FcmTokenDetails;
        await user.save();
        generateToken(res, user);
        return res.status(201).json({
          success: true,
          user: {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            role: user.role,
            isSalon: user.isSalon,
          },
        });
      } else if (user.role === "Owner" && role === "Customer") {
        const customer = await CustomerModel.findOne({ userId: user._id });
        if (!customer) {
          const newCustomer = new CustomerModel({
            userId: user._id,
            phoneNumber,
            name: user.name,
            gender: user.gender,
          });
          await newCustomer.save();
        }

        generateToken(res, user);
        return res.status(201).json({
          success: true,
          user: {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            role: user.role,
            name: user.name,
            isSalon: user.isSalon,
          },
        });
      }

      if (user.role === "Customer" && role === "Customer") {
        const customer = await CustomerModel.findOne({ userId: user._id });
        if (!customer) {
          const newCustomer = new CustomerModel({
            userId: user._id,
            phoneNumber,
            name: user.name,
            gender: user.gender,
          });
          await newCustomer.save();
        }

        user.token = FcmTokenDetails;
        await user.save();
        generateToken(res, user);
        return res.status(201).json({
          success: true,
          user: {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            role: user.role,
            name: customer.name,
            isSalon: user.isSalon,
          },
        });
      } else if (user.role === "Customer" && role === "Owner") {
        user.role = role;
        user.token = FcmTokenDetails;
        await user.save();
        generateToken(res, user);
        return res.status(201).json({
          success: true,
          user: {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            role: user.role,
            isSalon: user.isSalon,
          },
        });
      }

      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isSalon: user.isSalon,
        },
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "An error occurred in verify-token" });
  }
};

/**
 * @desc Send OTP to the user
 * @route POST /api/auth/send-otp
 * @access Public
 * @request { phoneNumber, role }
 */

const sendOTP = async (req, res) => {
  try {
    const { phoneNumber, role } = req.body;
    console.log(phoneNumber, role);
    let user = await UserModel.findOne({ phoneNumber });

    console.log(user);

    const otp = otpGenerator.generate(4, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    const otpExpiration = new Date();
    otpExpiration.setMinutes(otpExpiration.getMinutes() + 1);

    if (!user) {
      user = new UserModel({ phoneNumber, role, otp, otpExpiration });
      await user.save();
    } else {
      user.otp = otp;
      user.otpExpiration = otpExpiration;
      await user.save();
    }

    // `https://www.fast2sms.com/dev/bulkV2?authorization=e9Oj3HC7B0EAltLkdYTrJZboQzmcihP24DpMwgRX5ynsIW6qfGud6AiNZyS41cqjxogQVhIOXUBvGPk3&route=dlt&sender_id=MACVEN&message=171048&variables_values=${otp}%7C&flash=0&numbers=${phoneNumber}`

    const Url = `https://www.fast2sms.com/dev/bulkV2?authorization=e9Oj3HC7B0EAltLkdYTrJZboQzmcihP24DpMwgRX5ynsIW6qfGud6AiNZyS41cqjxogQVhIOXUBvGPk3&route=dlt&sender_id=MACVEN&message=171048&variables_values=${otp}%7C&flash=0&numbers=${phoneNumber}`;

    const response = await axios.get(Url);

    
    if(response.data.return){
    await Statistic.findOneAndUpdate(
      { _id: "Statistic" },
      { $inc: { OtpCount: 1 } },
    );
  }
    // fast2sms
    //   .sendMessage(options)
    //   .then((response) => {
    //     console.log("otp sent successfully", response);
    //   })
    //   .catch((error) => {
    //     console.log(error);
    //   });

    console.log("OTP sent:", otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent:",
      otp,
    });
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

/**
 * @desc Verify OTP
 * @route POST /api/auth/verify-otp
 * @access Public
 * @request { phoneNumber, enteredOTP }
 * @response { _id, phoneNumber, role }
 */

const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, enteredOTP,role,fcmToken } = req.body;
    const FcmTokenDetails = fcmToken ? fcmToken : null;

    console.log(phoneNumber, enteredOTP);
    const user = await UserModel.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    if (enteredOTP !== user.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const currentDateTime = new Date();

    console.log(currentDateTime)
    if (currentDateTime > user.otpExpiration) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (user.role === "Artist" && role === "Owner") {

      user.token = FcmTokenDetails;
      await user.save();
      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isSalon: user.isSalon,
        },
      });
    } else if (user.role === "Artist" && role === "Customer") {
      const customer = await CustomerModel.findOne({ userId: user._id });
      const artist = await ArtistModel.findOne({ userId: user._id });
      if (!customer) {
        const newCustomer = new CustomerModel({
          userId: user._id,
          phoneNumber,
          name: artist.ArtistName,
        });
        await newCustomer.save();
      }

      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          name: artist.ArtistName,
          gender: user.gender,
          isSalon: user.isSalon,
        },
      });
    }

    if (user.role === "Owner" && role === "Owner") {
      user.token = FcmTokenDetails;
      await user.save();
      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isSalon: user.isSalon,
        },
      });
    } else if (user.role === "Owner" && role === "Customer") {
      const customer = await CustomerModel.findOne({ userId: user._id });
      if (!customer) {
        const newCustomer = new CustomerModel({
          userId: user._id,
          phoneNumber,
          name: user.name,
        });
        await newCustomer.save();
      }

      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          name: user.name,
          gender: user.gender,
          isSalon: user.isSalon,
        },
      });
    }

    if (user.role === "Customer" && role === "Customer") {
      const customer = await CustomerModel.findOne({ userId: user._id });
      if (!customer) {
        const newCustomer = new CustomerModel({
          userId: user._id,
          phoneNumber,
          name: user.name,
        });
        await newCustomer.save();
      }

      user.token = FcmTokenDetails;
      await user.save();
      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          name: user.name,
          gender: user.gender,
          isSalon: user.isSalon,
        },
      });
    } else if (user.role === "Customer" && role === "Owner") {
      user.role = role;
      user.token = FcmTokenDetails;
      await user.save();
      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isSalon: user.isSalon,
        },
      });
    }

    user.otp = null;
    user.otpExpiration = null;
    await user.save();

    generateToken(res, user);
    return res.status(201).json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      gender: user.gender,
      isSalon: user.isSalon,
      name: user.name,
    });
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

/**
 * @desc Verify Owner
 * @route POST /api/auth/verifyOwner
 * @access Public
 * @request { phoneNumber, password }
 * @response { _id, phoneNumber, role }
 */

const verifyOwner = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    const user = await UserModel.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = bycrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
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
    return res.status(500).json({
      success: false,
      message: "Failed to verify Owner",
    });
  }
};

/**
 * @desc Verify User
 * @route POST /api/auth/verifyUser
 * @access Public
 * @request { phoneNumber, verified ,role }
 * @response { _id, phoneNumber, role }
 */

const verifyUser = async (req, res) => {
  try {
    const { phoneNumber, verified, role,fcmToken } = req.body;

    const FcmTokenDetails = fcmToken ? fcmToken : null;

    const user = await UserModel.findOne({ phoneNumber });
    if (!user) {
      const newUser = new UserModel({ phoneNumber, role ,token: FcmTokenDetails});
      await newUser.save();

      if (role === "Customer") {
        const newCustomer = new CustomerModel({
          userId: newUser._id,
          phoneNumber,
        });
        await newCustomer.save();

        generateToken(res, newUser);
        return res.status(201).json({
          success: true,
          user: {
            _id: newUser._id,
            phoneNumber: newUser.phoneNumber,
            role: newUser.role,
            isSalon: newUser.isSalon,
            isNewUser: true,
          },
        });
      }

      if (role === "Owner") {

        user.token = FcmTokenDetails;
        await user.save();

        generateToken(res, newUser);
        return res.status(201).json({
          success: true,
          user: {
            _id: newUser._id,
            phoneNumber: newUser.phoneNumber,
            role: newUser.role,
            isSalon: newUser.isSalon,
          },
        });
      }
    }

    if (user.role === "Artist" && role === "Owner") {

      user.token = FcmTokenDetails;
      await user.save();

      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isSalon: user.isSalon,
        },
      });
    } else if (user.role === "Artist" && role === "Customer") {
      const customer = await CustomerModel.findOne({ userId: user._id });
      const artist = await ArtistModel.findOne({ userId: user._id });
      if (!customer) {
        const newCustomer = new CustomerModel({
          userId: user._id,
          phoneNumber,
          name: artist.ArtistName,
        });
        await newCustomer.save();
      }



      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          name: artist.ArtistName,
          isSalon: user.isSalon,
        },
      });
    }

    if (user.role === "Owner" && role === "Owner") {

      user.token = FcmTokenDetails;
      await user.save();

      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isSalon: user.isSalon,
        },
      });
    } else if (user.role === "Owner" && role === "Customer") {
      const customer = await CustomerModel.findOne({ userId: user._id });
      if (!customer) {
        const newCustomer = new CustomerModel({
          userId: user._id,
          phoneNumber,
          name: user.name,
        });
        await newCustomer.save();
      }

      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          name: user.name,
          isSalon: user.isSalon,
        },
      });
    }

    if (user.role === "Customer" && role === "Customer") {
      const customer = await CustomerModel.findOne({ userId: user._id });
      if (!customer) {
        const newCustomer = new CustomerModel({
          userId: user._id,
          phoneNumber,
          name: user.name,
        });
        await newCustomer.save();
      }

      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          name: customer.name,
          isSalon: user.isSalon,
        },
      });
    } else if (user.role === "Customer" && role === "Owner") {
      user.role = role;
      await user.save();
      user.token = FcmTokenDetails;
      await user.save();

      generateToken(res, user);
      return res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          name: user.name,
          isSalon: user.isSalon,
        },
      });
    }

    user.token = FcmTokenDetails;
    await user.save();

    generateToken(res, user);
    return res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isSalon: user.isSalon,
      },
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
    console.log(artists);
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    for (let i = 0; i < artists.length; i++) {
      const artist = await ArtistModel.findById(artists[i]);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: "Artist not found",
        });
      }

      const user = await UserModel.findById(artist.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.role === "Owner" || user.role === "subAdmin") {
        return res.status(400).json({
          success: false,
          message: "You can't change role of owner or subAdmin",
        });
      }

      user.role = "subAdmin";

      await user.save();

      if(user.token){
        const message = {
          notification: {
            title: "Role Changed",
            body: `Your role has been changed to subAdmin`,
          },
          token: user.token,
        };

        messaging.send(message);
      }

    }

    return res.status(200).json({
      success: true,
      message: "Role changed successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in changing role",
    });
  }
};

const addName = async (req, res) => {
  try {
    const { name, gender } = req.body;
    const user = req.user._id;
    const customer = await CustomerModel.findOne({ userId: user });
    const user1 = await UserModel.findById(user);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    customer.name = name || customer.name;
    customer.gender = gender || customer.gender;
    user1.name = name || user1.name;
    user1.gender = gender || user1.gender;

    await customer.save();

    return res.status(200).json({
      success: true,
      data: {
        _id: user1._id,
        name: user1.name,
        phoneNumber: user1.phoneNumber,
        gender: user1.gender,
        role: user1.role,
        isSalon: user1.isSalon,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in adding name",
    });
  }
};

const LoginAdmin = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    const user = await UserModel.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const isMatch = bycrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
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
    return res.status(500).json({
      success: false,
      message: "Failed to verify Owner",
    });
  }
};

const RegisterAdmin = async (req, res) => {
  try {
    const { phoneNumber, password, role } = req.body;

    let user = await UserModel.findOne({ phoneNumber, role: "Admin" });

    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const salt = await bycrypt.genSalt(10);
    const hashedPassword = await bycrypt.hash(password, salt);

    user = new UserModel({ phoneNumber, password: hashedPassword, role });

    await user.save();

    generateToken(res, user);
    return res.status(201).json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isSalon: user.isSalon,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to register",
    });
  }
};

const getSalonsubAdmins = async (req, res) => {
  try {
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });
   

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const artists = await ArtistModel.find({ salon: salon._id });

    const users = [];

    for (let i = 0; i < artists.length; i++) {
      const user = await UserModel.findById(artists[i].userId);
      if (user.role === "subAdmin") {
        users.push(artists[i]);
      }
    }

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in getting subAdmins",
    });
  }
};

const removesubAdmin = async (req, res) => {
  try {
    const { artistId } = req.params;
    const user = req.user._id;
    const salon = await SalonModel.findOne({ userId: user });

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

    const user1 = await UserModel.findById(artist.userId);

    if (user1.role === "Owner") {
      return res.status(400).json({
        success: false,
        message: "You can't remove owner",
      });
    }

    user1.role = "Artist";
    
    if(user1.token){
      const message = {
        notification: {
          title: "Role Changed",
          body: `Your role has been changed to Artist`,
        },
        token: user1.token,
      };

      messaging.send(message);
    }

    await user1.save();

    return res.status(200).json({
      success: true,
      message: "subAdmin removed successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in removing subAdmin",
    });
  }
};

const deleteOwner = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const salon = await SalonModel.findOne({ phoneNumber });

    if (salon) {
      const services = await Service.find({ salon: salon._id });

      const serviceArtist = await ServiceArtist.find({
        Service: { $in: services.map((service) => service._id) },
      });

      if (serviceArtist.length) {
        await ServiceArtist.deleteMany({
          Service: { $in: services.map((service) => service._id) },
        });
      }

      if (services.length) {
        await Service.deleteMany({ salon: salon._id });
      }

      const artists = await ArtistModel.find({ salon: salon._id });
      const users = await UserModel.find({
        _id: { $in: artists.map((artist) => artist.userId) },
      });

      if (users.length) {
        await UserModel.deleteMany({
          _id: { $in: artists.map((artist) => artist.userId) },
        });
      }

      if (artists.length) {
        await ArtistModel.deleteMany({ salon: salon._id });
      }

      if (salon.appointments.length) {
        await AppointmentModel.deleteMany({ _id: { $in: salon.appointments } });
      }

      if (salon.Reviews.length) {
        await ReviewModel.deleteMany({ _id: { $in: salon.Reviews } });
      }

      if (salon.offers.length) {
        await OfferModel.deleteMany({ _id: { $in: salon.offers } });
      }

      await SalonModel.findOneAndDelete({ _id: salon._id });
    }
    await UserModel.findOneAndDelete({ phoneNumber });

    return res.status(200).json({
      success: true,
      message: "Owner deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in deleting Owner",
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

export {
  verifyUser,
  ChangeRole,
  logout,
  verifyOwner,
  sendOTP,
  verifyOTP,
  verifyToken,
  addName,
  LoginAdmin,
  RegisterAdmin,
  getSalonsubAdmins,
  removesubAdmin,
  deleteOwner,
};
