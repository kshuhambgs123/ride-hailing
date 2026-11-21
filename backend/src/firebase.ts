import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
        });
    }
} else {
    console.warn("Firebase credentials missing. Auth features will not work.");
}

export default admin;
