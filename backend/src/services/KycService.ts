import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

export class KycService {
    private static userRepository = AppDataSource.getRepository(User);

    static async verifyIdentity(userId: string, governmentId: string, idType: string): Promise<boolean> {
        // Mock verification logic - in reality, this would call an external global identity API
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) return false;

        // Dummy universal validation: ensure ID is at least 6 characters
        if (governmentId.length < 6) return false;

        user.governmentId = governmentId;
        user.idType = idType;
        user.isKycVerified = true;
        await this.userRepository.save(user);

        return true;
    }
}
