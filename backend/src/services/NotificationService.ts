import * as admin from "firebase-admin";

export class NotificationService {
    static async sendPushNotification(token: string, title: string, body: string, data?: any) {
        if (!token) return;

        const message = {
            notification: { title, body },
            data: data || {},
            token: token
        };

        try {
            const response = await admin.messaging().send(message);
            console.log("Successfully sent push notification:", response);
            return response;
        } catch (error) {
            console.error("Error sending push notification:", error);
        }
    }

    static async sendToTopic(topic: string, title: string, body: string, data?: any) {
        const message = {
            notification: { title, body },
            data: data || {},
            topic: topic
        };

        try {
            const response = await admin.messaging().send(message);
            console.log(`Successfully sent notification to topic ${topic}:`, response);
            return response;
        } catch (error) {
            console.error(`Error sending notification to topic ${topic}:`, error);
        }
    }
}
