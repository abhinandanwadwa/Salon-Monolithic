import { initializeApp,applicationDefault } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();
import serviceAccount from "../../salondekho-55d7c-firebase-adminsdk-s6yy5-768fa5b955.json" assert { type: "json" };

const app = initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
});

const messaging = getMessaging(app);




export default messaging;