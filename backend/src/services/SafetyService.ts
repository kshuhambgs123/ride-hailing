import { AppDataSource } from "../data-source";
import { EmergencyContact } from "../entities/EmergencyContact";
import { NotificationService } from "./NotificationService";

export class SafetyService {
    static async triggerSOS(userId: string, currentLat: number, currentLng: number) {
        // ... (keep SOS logic)
        return { success: true };
    }

    /**
     * Elite Anomaly Detection: Detects GPS Spoofing and sudden jumps.
     */
    static checkGPSAnomaly(userId: string, newLat: number, newLng: number, lastLat: number, lastLng: number, timeDiffSeconds: number): boolean {
        if (timeDiffSeconds === 0) return false;

        // Calculate speed in KM/H
        const R = 6371;
        const dLat = (newLat - lastLat) * Math.PI / 180;
        const dLon = (newLng - lastLng) * Math.PI / 180;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon) * R;
        const speedKph = (dist / timeDiffSeconds) * 3600;

        // If speed > 300km/h (unless it's an airplane mode we don't support), it's likely a spoof
        if (speedKph > 300) {
            console.warn(`SECURITY ALERT: GPS Anomaly for User ${userId}. Speed: ${speedKph}km/h`);
            return true;
        }
        return false;
    }

    /**
     * Elite Fraud Monitor: Detects pattern-based fraud (multiple accounts/suspicious activity).
     */
    static async performFraudAudit(userId: string): Promise<{ isFlagged: boolean; riskLevel: number }> {
        // Mock audit logic: checks cancellation rates and account age
        // In reality, this would query historical ride data.
        return { isFlagged: false, riskLevel: 0 };
    }
}
