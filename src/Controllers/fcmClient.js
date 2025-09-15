import { initializeApp,applicationDefault } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const app = initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ignoreUndefinedProperties: true
});

const messaging = getMessaging(app);
const db = admin.firestore();


export { messaging, db }; 