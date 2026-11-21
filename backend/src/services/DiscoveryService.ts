import { AppDataSource } from "../data-source";
import { Ride } from "../entities/Ride";

export interface Recommendation {
    title: string;
    description: string;
    lat: number;
    lng: number;
    category: string;
    image?: string;
}

export class DiscoveryService {
    /**
     * Recommends places to visit based on user history.
     */
    static async getRecommendations(userId: string): Promise<Recommendation[]> {
        console.log(`[Volo Discovery] Analyzing history for user: ${userId}`);

        const rideRepo = AppDataSource.getRepository(Ride);
        const history = await rideRepo.find({
            where: { passenger: { id: userId } },
            take: 20
        });

        // 1. Analyze Category Persona
        let foodScore = 0;
        let workScore = 0;
        let parkScore = 0;

        history.forEach(r => {
            const addr = (r.destinationAddress || "").toLowerCase();
            if (addr.includes("restaurant") || addr.includes("cafe") || addr.includes("eat")) foodScore++;
            if (addr.includes("office") || addr.includes("hq") || addr.includes("corp")) workScore++;
            if (addr.includes("park") || addr.includes("lake") || addr.includes("garden")) parkScore++;
        });

        // 2. Generate specialized recommendations
        const recs: Recommendation[] = [];

        if (foodScore > 2) {
            recs.push({
                title: "Gourmet Street",
                description: "You love dining out! Try the new artisan hub in Chelsea.",
                lat: 40.748,
                lng: -74.004,
                category: "Foodie"
            });
        }

        if (parkScore > 1) {
            recs.push({
                title: "High Line Park",
                description: "Perfect weather for a walk. Explore the elevated gardens.",
                lat: 40.7484,
                lng: -74.0048,
                category: "Explorer"
            });
        }

        // Global trending spots for everyone
        recs.push({
            title: "Volo Premium Lounge",
            description: "Exclusive for elite users. Relax before your next trip.",
            lat: 40.758,
            lng: -73.985,
            category: "Elite"
        });

        return recs;
    }
}
