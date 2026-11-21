export class TrustService {
    static calculateTrustScore(user: {
        isEmailVerified: boolean;
        isFacebookLinked: boolean;
        isLinkedInLinked: boolean;
        isKycVerified: boolean;
        rating: number;
        rideCount: number;
    }): number {
        let score = 0;

        if (user.isEmailVerified) score += 10;
        if (user.isFacebookLinked) score += 15;
        if (user.isLinkedInLinked) score += 25; // Professional verification is high trust
        if (user.isKycVerified) score += 30;

        // Add rating weight
        score += (user.rating * 4); // Max 20

        return Math.min(score, 100);
    }

    static getTrustLevel(score: number): "BASIC" | "VERIFIED" | "GOLD" | "ELITE" {
        if (score >= 90) return "ELITE";
        if (score >= 70) return "GOLD";
        if (score >= 40) return "VERIFIED";
        return "BASIC";
    }
}
