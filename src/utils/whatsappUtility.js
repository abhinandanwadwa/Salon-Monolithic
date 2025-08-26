import 'dotenv/config'; // Simplified import for dotenv
import axios from 'axios';

// Retrieve the API key and define the base URL from your documentation
const API_KEY = process.env.FAST2SMS_API_KEY;
const BASE_URL = 'https://www.fast2sms.com/dev/whatsapp';

/**
 * A private helper function to send messages via the Fast2SMS API.
 * This function is not exported and is only used internally by this module.
 * @param {number} messageId - The template ID.
 * @param {string} recipientNumber - The 10-digit mobile number with country code (e.g., '919876543210').
 * @param {string[]} variables - An array of values to replace the variables in the template.
 * @returns {Promise<object|null>} The API response data or null if an error occurs.
 */
const sendMessage = async (messageId, recipientNumber, variables) => {
  // Check if the API key is configured
  if (!API_KEY) {
    console.error('Error: FAST2SMS_API_KEY is not defined in your .env file.');
    return null;
  }

  // Format the variables by joining them with a pipe '|'
  const variablesValues = variables.join('|');

  // Construct the full API URL with parameters
  const params = {
    authorization: API_KEY,
    message_id: messageId,
    numbers: recipientNumber,
    variables_values: variablesValues,
  };

  try {
    console.log(`Sending message ID ${messageId} to ${recipientNumber}...`);
    const response = await axios.get(BASE_URL, { params });
    console.log('API Response:', response.data);
    return response.data; // Return the response from the API
  } catch (error) {
    console.error(`Error sending message ID ${messageId}:`, error.response ? error.response.data : error.message);
    return null; // Return null to indicate failure
  }
};

// --- Exportable Functions for Each Template ---

/**
 * Sends a verification OTP.
 * @param {string} recipientNumber - The user's mobile number.
 * @param {string} otpCode - The one-time password.
 */
export const sendOtp = async (recipientNumber, otpCode) => {
  return await sendMessage(4002, recipientNumber, [otpCode]);
};

/**
 * Notifies user of a pending appointment request.
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} serviceName 
 * @param {string} salonName 
 * @param {string} date 
 * @param {string} time 
 */
export const sendPendingAppointment = async (recipientNumber, customerName, serviceName, salonName, date, time) => {
  const variables = [customerName, serviceName, salonName, date, time];
  return await sendMessage(4162, recipientNumber, variables);
};

/**
 * Sends a welcome message to a new user.
 * @param {string} recipientNumber 
 * @param {string} customerName 
 */
export const sendWelcomeMessage = async (recipientNumber, customerName) => {
  return await sendMessage(4163, recipientNumber, [customerName]);
};

/**
 * Confirms an appointment cancellation by the customer.
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} serviceName 
 * @param {string} salonName 
 * @param {string} date 
 * @param {string} time 
 */
export const sendCancelAppointmentCustomer = async (recipientNumber, customerName, serviceName, salonName, date, time) => {
  const variables = [customerName, serviceName, salonName, date, time];
  return await sendMessage(4165, recipientNumber, variables);
};

/**
 * Notifies a user that the salon owner cancelled their appointment.
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} serviceName 
 * @param {string} salonName 
 * @param {string} date 
 * @param {string} time 
 */
export const sendCancelAppointmentOwner = async (recipientNumber, customerName, serviceName, salonName, date, time) => {
  const variables = [customerName, serviceName, salonName, date, time];
  return await sendMessage(4166, recipientNumber, variables);
};

/**
 * Notifies user of a rescheduled appointment.
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} serviceName 
 * @param {string} salonName 
 * @param {string} newDate 
 * @param {string} newTime 
 */
export const sendRescheduledAppointment = async (recipientNumber, customerName, serviceName, salonName, newDate, newTime) => {
  const variables = [customerName, serviceName, salonName, newDate, newTime];
  return await sendMessage(4167, recipientNumber, variables);
};

/**
 * Confirms a booked appointment. ✅
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} serviceName 
 * @param {string} salonName 
 * @param {string} date 
 * @param {string} time 
 */
export const sendConfirmedAppointment = async (recipientNumber, customerName, serviceName, salonName, date, time) => {
  const variables = [customerName, serviceName, salonName, date, time];
  return await sendMessage(4168, recipientNumber, variables);
};

/**
 * Confirms a successful payment. 💳
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} amount 
 * @param {string} serviceName 
 * @param {string} salonName 
 */
export const sendPaymentComplete = async (recipientNumber, customerName, amount, serviceName, salonName) => {
  const variables = [customerName, amount, serviceName, salonName];
  return await sendMessage(4171, recipientNumber, variables);
};

/**
 * Notifies user of a failed payment. ⚠️
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} amount 
 * @param {string} serviceName 
 * @param {string} salonName 
 */
export const sendPaymentFailed = async (recipientNumber, customerName, amount, serviceName, salonName) => {
  const variables = [customerName, amount, serviceName, salonName];
  return await sendMessage(4172, recipientNumber, variables);
};

/**
 * Sends a review request after a service. ⭐
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} salonName 
 * @param {string} reviewLink - A link to the review page.
 */
export const sendReviewRequest = async (recipientNumber, customerName, salonName, reviewLink) => {
  const variables = [customerName, salonName, reviewLink];
  return await sendMessage(4173, recipientNumber, variables);
};

/**
 * Sends a special offer or promotion. ✨
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} salonName 
 * @param {string} discount - e.g., "20%".
 * @param {string} couponCode 
 */
export const sendOfferNotification = async (recipientNumber, customerName, salonName, discount, couponCode) => {
  const variables = [customerName, salonName, discount, couponCode];
  return await sendMessage(4174, recipientNumber, variables);
};

/**
 * Sends an appointment reminder. 🔔
 * @param {string} recipientNumber 
 * @param {string} customerName 
 * @param {string} serviceName 
 * @param {string} salonName 
 * @param {string} date 
 * @param {string} time 
 */
export const sendAppointmentReminder = async (recipientNumber, customerName, serviceName, salonName, date, time) => {
  const variables = [customerName, serviceName, salonName, date, time];
  return await sendMessage(4175, recipientNumber, variables);
};

/**
 * Notifies the salon owner of a new booking. ✅
 * @param {string} recipientNumber - The owner's mobile number.
 * @param {string} ownerName 
 * @param {string} customerName 
 * @param {string} customerPhone 
 * @param {string} serviceName 
 * @param {string} date 
 * @param {string} time 
 * @param {string} amount 
 */
export const sendNewBookingToOwner = async (recipientNumber, ownerName, customerName, customerPhone, serviceName, date, time, amount) => {
  const variables = [ownerName, customerName, customerPhone, serviceName, date, time, amount];
  return await sendMessage(4665, recipientNumber, variables);
};

/**
 * Notifies the salon owner that they have rescheduled an appointment. 🔄
 * @param {string} recipientNumber - The owner's mobile number.
 * @param {string} ownerName 
 * @param {string} customerName 
 * @param {string} customerPhone 
 * @param {string} serviceName 
 * @param {string} newDate 
 * @param {string} newTime 
 * @param {string} amount 
 */
export const sendRescheduleByOwnerToOwner = async (recipientNumber, ownerName, customerName, customerPhone, serviceName, newDate, newTime, amount) => {
  const variables = [ownerName, customerName, customerPhone, serviceName, newDate, newTime, amount];
  return await sendMessage(4666, recipientNumber, variables);
};

/**
 * Notifies the salon owner that a customer has cancelled an appointment. ❌
 * @param {string} recipientNumber - The owner's mobile number.
 * @param {string} ownerName 
 * @param {string} customerName 
 * @param {string} customerPhone 
 * @param {string} serviceName 
 * @param {string} date 
 * @param {string} time 
 * @param {string} amount 
 */
export const sendCancelByCustomerToOwner = async (recipientNumber, ownerName, customerName, customerPhone, serviceName, date, time, amount) => {
  const variables = [ownerName, customerName, customerPhone, serviceName, date, time, amount];
  return await sendMessage(4667, recipientNumber, variables);
};

/**
 * Notifies the salon owner of a reschedule request from a customer. 🔄
 * @param {string} recipientNumber - The owner's mobile number.
 * @param {string} ownerName 
 * @param {string} customerName 
 * @param {string} customerPhone 
 * @param {string} serviceName 
 * @param {string} newDate 
 * @param {string} newTime 
 * @param {string} amount 
 */
export const sendRescheduleByCustomerToOwner = async (recipientNumber, ownerName, customerName, customerPhone, serviceName, newDate, newTime, amount) => {
  const variables = [ownerName, customerName, customerPhone, serviceName, newDate, newTime, amount];
  return await sendMessage(4668, recipientNumber, variables);
};
