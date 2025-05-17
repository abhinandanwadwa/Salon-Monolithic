import { messaging } from "./fcmClient.js";
import UserModel from "../Models/User.js"; // Ensure this path is correct

const topics = {
  all: "/topics/all_users",
  customers: "/topics/customers",
  salons: "/topics/owners",
};

const sendNotifications = async (req, res) => {
  try {
    const { type, title, body } = req.body;

    if (!type || !title || !body) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields. Please provide 'type', 'title', and 'body'.",
      });
    }

    // Validate type
    if (!topics[type]) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Valid types are 'all', 'customers', 'salons'.",
      });
    }

    // Get the topic string
    const topic = topics[type];

    // Construct message payload
    const messagePayload = {
      topic, // sending to the topic
      notification: {
        title,
        body,
      },
      android: {
        priority: "high",
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
      },
    };

    // Send message via FCM
    const response = await messaging.send(messagePayload);

    res.status(200).json({
      success: true,
      message: "Notification sent successfully.",
      fcmResponse: response,
    });

  } catch (error) {
    console.error("Error sending notification:", error);
    let errorMessage = "Failed to send notification.";
    if (error.code && error.message) {
      errorMessage = `Firebase error: ${error.code} - ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    res
      .status(500)
      .json({ success: false, message: errorMessage, error: error.toString() });
  }
};

export default sendNotifications;
