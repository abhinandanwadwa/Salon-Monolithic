import baileys from "baileys";
const { makeWASocket, DisconnectReason, Browsers, fetchLatestBaileysVersion } =
  baileys; // Correctly destructure from the default import
import { getBaileysAuthStore } from "../utils/baileysAuthStore.js";
import P from "pino";
import qrcode from "qrcode-terminal";
import fs from "fs";
import WhatsAppSession from "../Models/WhatsAppSession.js"; // Import session model

let sock;
const SESSION_ID = "salon-wa-session"; // Define a unique session ID

async function connectToWhatsApp() {
  const { state, saveCreds } = await getBaileysAuthStore(SESSION_ID);

  const logger = P({ level: process.env.LOG_LEVEL || "silent" });
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We handle QR display manually
    logger: logger,
    browser: Browsers.macOS("Desktop"), // Simulate a browser
    syncFullHistory: false, // Optional: set to true to sync all history
    version, // Use the fetched latest version
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("------------------------------------------------");
      console.log("Scan the QR code below with your WhatsApp app:");
      qrcode.generate(qr, { small: true });
      console.log("------------------------------------------------");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect.error?.output?.statusCode;
      // Treat HTTP 401 Unauthorized as permanent logout
      const unauthorized = statusCode === 401;
      const shouldReconnect =
        !unauthorized && statusCode !== DisconnectReason.loggedOut;
      console.log(
        "Connection closed due to:",
        lastDisconnect.error,
        ", statusCode:",
        statusCode,
        ", unauthorized:",
        unauthorized,
        ", reconnecting:",
        shouldReconnect
      );

      if (shouldReconnect) {
        connectToWhatsApp(); // Attempt to reconnect
      } else {
        console.error(
          "Connection closed permanently (logged out or unauthorized). Clearing session and restarting."
        );
        await WhatsAppSession.deleteOne({ sessionId: SESSION_ID }); // Clear stored auth
        console.log(
          "Auth session cleared from DB. Initiating fresh connection..."
        );
        connectToWhatsApp(); // Prompt new QR scan
      }
    } else if (connection === "open") {
      console.log("WhatsApp connection opened!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

async function sendWhatsAppMessage(recipientJid, messageText) {
  if (!sock) {
    console.error("WhatsApp socket is not initialized. Trying to connect...");
    await connectToWhatsApp(); // Ensure connection if not already established
    if (!sock) {
      throw new Error(
        "WhatsApp socket not initialized after attempting reconnection."
      );
    }
  }
  if (!recipientJid || !messageText) {
    console.error("Recipient JID and message text are required.");
    throw new Error("Recipient JID and message text are required.");
  }

  try {
    // Basic JID validation (can be enhanced)
    if (
      !recipientJid.endsWith("@s.whatsapp.net") &&
      !recipientJid.endsWith("@g.us")
    ) {
      console.warn(
        `Recipient JID "${recipientJid}" might be invalid. Appending @s.whatsapp.net if it looks like a phone number.`
      );
      if (/^\d+$/.test(recipientJid)) {
        recipientJid += "@s.whatsapp.net";
        console.log(`Corrected JID to: ${recipientJid}`);
      } else {
        console.error("Invalid JID format after attempting correction.");
        // throw new Error("Invalid JID format."); // Or handle more gracefully
        return; // Stop if JID is still not good
      }
    }

    console.log(
      `Sending WhatsApp message to ${recipientJid}: "${messageText}"`
    );
    const messageResult = await sock.sendMessage(recipientJid, {
      text: messageText,
    });
    console.log(
      `Message successfully sent to ${recipientJid}. ID: ${messageResult?.key.id}`
    );
    return messageResult;
  } catch (error) {
    console.error(`Error sending WhatsApp message to ${recipientJid}:`, error);
    // If error is due to not being connected, try to reconnect and send again (optional, can lead to loops)
    // if (error.message.includes('Socket not open')) {
    //     console.log('Socket was not open, attempting to reconnect and resend...');
    //     await connectToWhatsApp();
    //     // Potentially retry sending the message here, with a limit to avoid infinite loops
    // }
    throw error; // Re-throw the error for further handling if needed
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log(
    "\nCaught interrupt signal. Shutting down WhatsApp connection..."
  );
  if (sock) {
    // await sock.logout("User initiated shutdown"); // Use logout for a clean disconnect
    sock.end(new Error("User initiated shutdown"));
    console.log("WhatsApp connection closed.");
  }
  process.exit(0);
});

export { connectToWhatsApp, sendWhatsAppMessage, sock as whatsappSocket };
