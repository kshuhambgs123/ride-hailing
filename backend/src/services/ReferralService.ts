import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

export class ReferralService {
    private static userRepository = AppDataSource.getRepository(User);

    static generateReferralCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    static async applyReferral(newUser: User, referralCode: string) {
        if (!referralCode) return;

        // referralCode is only unique per tenant (see User.ts) — without
        // this, a code collision between two different operators' users
        // could reward/link the wrong tenant's account entirely.
        const referrer = await this.userRepository.findOne({ where: { referralCode, tenantId: newUser.tenantId } });
        if (referrer) {
            newUser.referredBy = referralCode;

            // Reward system: Add 50 units to both wallets
            referrer.walletBalance = Number(referrer.walletBalance) + 50;
            newUser.walletBalance = Number(newUser.walletBalance) + 50;

            await this.userRepository.save(referrer);
            await this.userRepository.save(newUser);
        }
    }
}
