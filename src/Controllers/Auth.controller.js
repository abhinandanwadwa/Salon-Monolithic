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
import { db, messaging } from "./fcmClient.js";
import WalletModel from "../Models/wallet.js";
import axios from "axios";
import Statistic from "../Models/Statistics.js";
import dotenv from "dotenv";

dotenv.config();

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
        const newUser = new UserModel({
          phoneNumber,
          role,
          token: FcmTokenDetails,
        });
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
    const { phoneNumber, role, reCaptcha } = req.body;
    let user = await UserModel.findOne({ phoneNumber });

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

    const API = process.env.FAST2SMS_AUTH_KEY;

    const Url = `https://www.fast2sms.com/dev/bulkV2?authorization=${API}&route=dlt&sender_id=MACVEN&message=171246&variables_values=${otp}%7C&flash=0&numbers=${phoneNumber}`;
    const response = await axios.get(Url);
    // console.log(otp)

    if (response.data.return) {
      await Statistic.findOneAndUpdate(
        { _id: "Statistic" },
        { $inc: { OtpCount: 1 } }
      );
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent:",
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
    const { phoneNumber, enteredOTP, role, fcmToken } = req.body;

    const FcmTokenDetails = fcmToken ? fcmToken : null;

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

    console.log(currentDateTime);
    if (currentDateTime > user.otpExpiration) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // if (user.role === "Artist" && role === "Owner") {
    //   user.token = FcmTokenDetails;
    //   await user.save();
    //   generateToken(res, user);
    //   return res.status(201).json({
    //     success: true,
    //     user: {
    //       _id: user._id,
    //       phoneNumber: user.phoneNumber,
    //       role: user.role,
    //       isSalon: user.isSalon,
    //     },
    //   });
    // } else if (user.role === "Artist" && role === "Customer") {
    //   const customer = await CustomerModel.findOne({ userId: user._id });
    //   const artist = await ArtistModel.findOne({ userId: user._id });
    //   if (!customer) {
    //     const newCustomer = new CustomerModel({
    //       userId: user._id,
    //       phoneNumber,
    //       name: artist.ArtistName,
    //     });
    //     await newCustomer.save();
        
    //     // Check if user has a wallet and create one if not
    //     const wallet = await WalletModel.findOne({ userId: user._id });
    //     if (!wallet) {
    //       // Create new wallet with 0 balance
    //       const newWallet = new WalletModel({
    //         userId: user._id,
    //         balance: 0,
    //       });
    //       await newWallet.save();
          
    //       // Save wallet reference to user document
    //       user.Wallet = newWallet._id;
    //       console.log("New wallet created for artist as customer");
    //     }
    //   }

    //   // Set FCM token for artist as customer
    //   user.token = FcmTokenDetails;
    //   await user.save();

    //   generateToken(res, user);
    //   return res.status(201).json({
    //     success: true,
    //     user: {
    //       _id: user._id,
    //       phoneNumber: user.phoneNumber,
    //       role: user.role,
    //       name: artist.ArtistName,
    //       gender: user.gender,
    //       isSalon: user.isSalon,
    //     },
    //   });
    // }

    if (user.role === "Owner" && role === "Owner") {

      if(user.token !== FcmTokenDetails){
        user.token = FcmTokenDetails;

        messaging.subscribeToTopic(FcmTokenDetails, "owners")
        .then((response) => {
          console.log("Successfully subscribed to topic:", response);
        })
        .catch((error) => {
          console.log("Error subscribing to topic:", error);
        });

        messaging.subscribeToTopic(FcmTokenDetails, "all_users")
        .then((response) => {
          console.log("Successfully subscribed to topic:", response);
        })
        .catch((error) => {
          console.log("Error subscribing to topic:", error);
        });

      }


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
      //create a user wallet
      if (!customer) {
        const newCustomer = new CustomerModel({
          userId: user._id,
          phoneNumber,
          name: user.name,
        });
        await newCustomer.save();
        
        // Check if user has a wallet and create one if not
        const wallet = await WalletModel.findOne({ userId: user._id });
        if (!wallet) {
          // Create new wallet with 0 balance
          const newWallet = new WalletModel({
            userId: user._id,
            balance: 0,
          });
          await newWallet.save();
          
          // Save wallet reference to user document
          user.Wallet = newWallet._id;
          console.log("New wallet created for owner as customer");
        }
      }

      // Set FCM token for owner as customer
      
      if(user.token !== FcmTokenDetails){
        user.token = FcmTokenDetails;

        messaging.subscribeToTopic(FcmTokenDetails, "customers")
        .then((response) => {
          console.log("Successfully subscribed to topic:", response);
        })
        .catch((error) => {
          console.log("Error subscribing to topic:", error);
        });

        messaging.subscribeToTopic(FcmTokenDetails, "all_users")
        .then((response) => {
          console.log("Successfully subscribed to topic:", response);
        })
        .catch((error) => {
          console.log("Error subscribing to topic:", error);
        });
      }

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
        
        // Check if user has a wallet and create one if not
        const wallet = await WalletModel.findOne({ userId: user._id });
        if (!wallet) {
          // Create new wallet with 0 balance
          const newWallet = new WalletModel({
            userId: user._id,
            balance: 0,
          });
          await newWallet.save();
          
          // Save wallet reference to user document
          user.Wallet = newWallet._id;
          console.log("New wallet created for customer");
        }
      }

      // Set FCM token for customer
      if(user.token !== FcmTokenDetails){
        user.token = FcmTokenDetails;

        messaging.subscribeToTopic(FcmTokenDetails, "customers")
        .then((response) => {
          console.log("Successfully subscribed to topic:", response);
        })
        .catch((error) => {
          console.log("Error subscribing to topic:", error);
        });

        messaging.subscribeToTopic(FcmTokenDetails, "all_users")
        .then((response) => {
          console.log("Successfully subscribed to topic:", response);
        })
        .catch((error) => {
          console.log("Error subscribing to topic:", error);
        });
      }
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
        if(user.token !== FcmTokenDetails){
        user.token = FcmTokenDetails;

        messaging.subscribeToTopic(FcmTokenDetails, "owners")
        .then((response) => {
          console.log("Successfully subscribed to topic:", response);
        })
        .catch((error) => {
          console.log("Error subscribing to topic:", error);
        });

        messaging.subscribeToTopic(FcmTokenDetails, "all_users")
        .then((response) => {
          console.log("Successfully subscribed to topic:", response);
        })
        .catch((error) => {
          console.log("Error subscribing to topic:", error);
        });
      }
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

    // if (user.role === "subAdmin" && role === "Owner") {
    //   user.token = FcmTokenDetails;
    //   await user.save();
    //   generateToken(res, user);
    //   return res.status(201).json({
    //     success: true,
    //     user: {
    //       _id: user._id,
    //       phoneNumber: user.phoneNumber,
    //       role: user.role,
    //       isSalon: user.isSalon,
    //     },
    //   });
    // } else if (user.role === "subAdmin" && role === "Customer") {
    //   const customer = await CustomerModel.findOne({ userId: user._id });
    //   const artist = await ArtistModel.findOne({ userId: user._id });
    //   if (!customer) {
    //     const newCustomer = new CustomerModel({
    //       userId: user._id,
    //       phoneNumber,
    //       name: artist.ArtistName,
    //     });
    //     await newCustomer.save();
        
    //     // Check if user has a wallet and create one if not
    //     const wallet = await WalletModel.findOne({ userId: user._id });
    //     if (!wallet) {
    //       // Create new wallet with 0 balance
    //       const newWallet = new WalletModel({
    //         userId: user._id,
    //         balance: 0,
    //       });
    //       await newWallet.save();
          
    //       // Save wallet reference to user document
    //       user.Wallet = newWallet._id;
    //       console.log("New wallet created for subAdmin as customer");
    //     }
    //   }

    //   // Set FCM token for subAdmin as customer
    //   await user.save();

    //   generateToken(res, user);
    //   return res.status(201).json({
    //     success: true,
    //     user: {
    //       _id: user._id,
    //       phoneNumber: user.phoneNumber,
    //       role: user.role,
    //       name: artist.ArtistName,
    //       gender: user.gender,
    //       isSalon: user.isSalon,
    //     },
    //   });
    // }

    user.otp = null;
    user.otpExpiration = null;
    // Set FCM token for any other case
    user.token = FcmTokenDetails;
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


// const verifyOTP = async (req, res) => {
//   try {
//     const { phoneNumber, enteredOTP, role, fcmToken } = req.body;
//     console.log(req.body);
//     console.log(fcmToken);
//     const FcmTokenDetails = fcmToken ? fcmToken : null;

//     console.log(phoneNumber, enteredOTP);
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

//     console.log(currentDateTime);
//     if (currentDateTime > user.otpExpiration) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP expired",
//       });
//     }

//     if (user.role === "Artist" && role === "Owner") {
//       user.token = FcmTokenDetails;
//       await user.save();
//       generateToken(res, user);
//       return res.status(201).json({
//         success: true,
//         user: {
//           _id: user._id,
//           phoneNumber: user.phoneNumber,
//           role: user.role,
//           isSalon: user.isSalon,
//         },
//       });
//     } else if (user.role === "Artist" && role === "Customer") {
//       const customer = await CustomerModel.findOne({ userId: user._id });
//       const artist = await ArtistModel.findOne({ userId: user._id });
//       if (!customer) {
//         const newCustomer = new CustomerModel({
//           userId: user._id,
//           phoneNumber,
//           name: artist.ArtistName,
//         });
//         await newCustomer.save();
//       }

//       generateToken(res, user);
//       return res.status(201).json({
//         success: true,
//         user: {
//           _id: user._id,
//           phoneNumber: user.phoneNumber,
//           role: user.role,
//           name: artist.ArtistName,
//           gender: user.gender,
//           isSalon: user.isSalon,
//         },
//       });
//     }

//     if (user.role === "Owner" && role === "Owner") {
//       user.token = FcmTokenDetails;
//       await user.save();
//       generateToken(res, user);
//       return res.status(201).json({
//         success: true,
//         user: {
//           _id: user._id,
//           phoneNumber: user.phoneNumber,
//           role: user.role,
//           isSalon: user.isSalon,
//         },
//       });
//     } else if (user.role === "Owner" && role === "Customer") {
//       const customer = await CustomerModel.findOne({ userId: user._id });
//       //create a user wallet
//       if (!customer) {
//         const newCustomer = new CustomerModel({
//           userId: user._id,
//           phoneNumber,
//           name: user.name,
//         });
//         await newCustomer.save();
//       }

//       generateToken(res, user);
//       return res.status(201).json({
//         success: true,
//         user: {
//           _id: user._id,
//           phoneNumber: user.phoneNumber,
//           role: user.role,
//           name: user.name,
//           gender: user.gender,
//           isSalon: user.isSalon,
//         },
//       });
//     }

//     if (user.role === "Customer" && role === "Customer") {
//       const customer = await CustomerModel.findOne({ userId: user._id });
//       if (!customer) {
//         const newCustomer = new CustomerModel({
//           userId: user._id,
//           phoneNumber,
//           name: user.name,
//         });
//         await newCustomer.save();
//       }



//       user.token = FcmTokenDetails;
//       await user.save();
//       generateToken(res, user);
//       return res.status(201).json({
//         success: true,
//         user: {
//           _id: user._id,
//           phoneNumber: user.phoneNumber,
//           role: user.role,
//           name: user.name,
//           gender: user.gender,
//           isSalon: user.isSalon,
//         },
//       });
//     } else if (user.role === "Customer" && role === "Owner") {
//       user.role = role;
//       user.token = FcmTokenDetails;
//       await user.save();
//       generateToken(res, user);
//       return res.status(201).json({
//         success: true,
//         user: {
//           _id: user._id,
//           phoneNumber: user.phoneNumber,
//           role: user.role,
//           isSalon: user.isSalon,
//         },
//       });
//     }

//     if (user.role === "subAdmin" && role === "Owner") {
//       user.token = FcmTokenDetails;
//       await user.save();
//       generateToken(res, user);
//       return res.status(201).json({
//         success: true,
//         user: {
//           _id: user._id,
//           phoneNumber: user.phoneNumber,
//           role: user.role,
//           isSalon: user.isSalon,
//         },
//       });
//     } else if (user.role === "subAdmin" && role === "Customer") {
//       const customer = await CustomerModel.findOne({ userId: user._id });
//       const artist = await ArtistModel.findOne({ userId: user._id });
//       if (!customer) {
//         const newCustomer = new CustomerModel({
//           userId: user._id,
//           phoneNumber,
//           name: artist.ArtistName,
//         });
//         await newCustomer.save();
//       }

//       generateToken(res, user);
//       return res.status(201).json({
//         success: true,
//         user: {
//           _id: user._id,
//           phoneNumber: user.phoneNumber,
//           role: user.role,
//           name: artist.ArtistName,
//           gender: user.gender,
//           isSalon: user.isSalon,
//         },
//       });
//     }

//     user.otp = null;
//     user.otpExpiration = null;
//     await user.save();

//     generateToken(res, user);
//     return res.status(201).json({
//       _id: user._id,
//       phoneNumber: user.phoneNumber,
//       role: user.role,
//       gender: user.gender,
//       isSalon: user.isSalon,
//       name: user.name,
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
 * @desc Verify Owner
 * @route POST /api/auth/verifyOwner
 * @access Public
 * @request { phoneNumber, password }
 * @response { _id, phoneNumber, role }
 */

const verifyOwner = async (req, res) => {
  try {
    const { phoneNumber, password, fcmToken } = req.body;

    const FcmTokenDetails = fcmToken ? fcmToken : null;

    const user = await UserModel.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bycrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    await user.save();

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


const getUserDetails = async (req, res) => {
  try {
    const user = req.user._id;
    const userDetails = await UserModel.findById(user).select("-password -otp -otpExpiration").populate("Wallet")
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: userDetails,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in getting user details",
    });
  }
}

/**
 * @desc Verify User
 * @route POST /api/auth/verifyUser
 * @access Public
 * @request { phoneNumber, verified ,role }
 * @response { _id, phoneNumber, role }
 */

const verifyUser = async (req, res) => {
  try {
    const { phoneNumber, verified, role, fcmToken } = req.body;

    const FcmTokenDetails = fcmToken ? fcmToken : null;

    const user = await UserModel.findOne({ phoneNumber });
    if (!user) {
      const newUser = new UserModel({
        phoneNumber,
        role,
        token: FcmTokenDetails,
      });
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
      salon.subAdmins.push(user._id);

      await user.save();
      await salon.save();

      if (user.token) {
        const message = {
          notification: {
            title: "Role Changed",
            body: `Your role has been changed to subAdmin`,
          },
          token: user.token,
        };

        messaging
          .send(message)
          .then((response) => {
            console.log("Successfully sent message:", response);
          })
          .catch((error) => {
            console.error("Error sending message:", error);
          });
      }

      db.collection("Notification")
        .add({
          title: "Role Changed",
          body: `Your role has been changed to subAdmin`,
          Ids: [user._id.toString()],
          read: false,
          related: user.name,
          createdAt: new Date().toISOString(),
        })
        .then((docRef) => {
          console.log("Document written with ID: ", docRef.id);
        })
        .catch((error) => {
          console.error("Error adding document: ", error);
        });
    }

    // db.collection("Notification").add({
    //   title: "Appointment Completed",
    //   body: `Your appointment on ${date} at ${TIME} has been completed`,
    //   Ids: Ids.map(id => id.toString()),
    //   read: false,
    //   createdAt: new Date(),
    // }).then((docRef) => {
    //   console.log("Document written with ID: ", docRef.id);
    // }).catch((error) => {
    //   console.error("Error adding document: ", error);
    // });

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
    await user1.save();

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
    const isMatch = await bycrypt.compare(password, user.password);

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

    salon.subAdmins = salon.subAdmins.filter(
      (subAdmin) => subAdmin.toString() !== user1._id.toString()
    );

    if (user1.token) {
      const message = {
        notification: {
          title: "Role Changed",
          body: `Your role has been changed to Artist`,
        },
        token: user1.token,
      };

      messaging
        .send(message)
        .then((response) => {
          console.log("Successfully sent message:", response);
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }

    db.collection("Notification")
      .add({
        title: "Role Changed",
        body: `Your role has been changed to Artist`,
        Ids: [user1._id.toString()],
        read: false,
        related: user1.name,
        createdAt: new Date().toISOString(),
      })
      .then((docRef) => {
        console.log("Document written with ID: ", docRef.id);
      })
      .catch((error) => {
        console.error("Error adding document: ", error);
      });

    await user1.save();
    await salon.save();

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
  const userId = req.user._id;
  const user = await UserModel.findById(userId);

  //remove user.token

  user.token = null;
  await user.save();

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
  getUserDetails,
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
