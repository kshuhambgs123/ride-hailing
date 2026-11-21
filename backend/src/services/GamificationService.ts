import { AppDataSource } from "../data-source";
import { Badge } from "../entities/Badge";
import { Ride } from "../entities/Ride";

export class GamificationService {
    static async calculateSavings(userId: string) {
        const rideRepo = AppDataSource.getRepository(Ride);
        const rides = await rideRepo.find({ where: { passenger: { id: userId }, status: "completed" as any } });

        const totalKm = rides.reduce((acc, r) => acc + (parseFloat(r.distance || "0")), 0);
        const co2Saved = totalKm * 0.12; // 120g per km saved by carpooling
        const moneySaved = rides.reduce((acc, r) => acc + (Number(r.fare) * 0.4), 0); // 40% vs private taxi

        return { co2Saved, moneySaved, totalKm };
    }

    static async checkAndAwardBadges(userId: string) {
        const { totalKm } = await this.calculateSavings(userId);
        const badgeRepo = AppDataSource.getRepository(Badge);

        if (totalKm >= 100) {
            // Award "Century Traveler" badge if not already owned
        }
    }
}
