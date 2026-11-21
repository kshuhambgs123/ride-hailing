import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { Transaction, TransactionType, TransactionStatus } from "../entities/Transaction";
import { SentinelService } from "./SentinelService";
import { AuditAction } from "../entities/AuditLog";

export class WalletService {
    static async getBalance(userId: string): Promise<number> {
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOneBy({ id: userId });
        return Number(user?.walletBalance || 0);
    }

    static async creditWallet(userId: string, amount: number, referenceId?: string): Promise<number> {
        return await AppDataSource.transaction(async (manager) => {
            const user = await manager.findOneBy(User, { id: userId });
            if (!user) throw new Error("User not found");

            user.walletBalance = Number(user.walletBalance) + amount;
            await manager.save(user);

            const transaction = manager.create(Transaction, {
                user: { id: userId } as any,
                grossAmount: amount,
                netAmount: amount,
                currency: "USD",
                type: TransactionType.CREDIT,
                status: TransactionStatus.COMPLETED,
                externalId: referenceId
            });
            await manager.save(transaction);
            // Record Audit (Volo Sentinel)
            await SentinelService.log(AuditAction.WALLET_CREDIT, userId, { amount, referenceId });

            return user.walletBalance;
        });
    }

    static async debitWallet(userId: string, amount: number, referenceId?: string): Promise<number> {
        return await AppDataSource.transaction(async (manager) => {
            const user = await manager.findOneBy(User, { id: userId });
            if (!user) throw new Error("User not found");

            if (Number(user.walletBalance) < amount) throw new Error("Insufficient balance");

            user.walletBalance = Number(user.walletBalance) - amount;
            await manager.save(user);

            // Record Transaction
            const transaction = manager.create(Transaction, {
                user,
                grossAmount: -amount,
                netAmount: -amount,
                currency: "USD",
                type: TransactionType.DEBIT,
                status: TransactionStatus.COMPLETED,
                externalId: referenceId
            });
            await manager.save(transaction);

            // Record Audit (Volo Sentinel)
            await SentinelService.log(AuditAction.WALLET_DEBIT, userId, { amount, referenceId });

            return Number(user.walletBalance);
        });
    }
}
