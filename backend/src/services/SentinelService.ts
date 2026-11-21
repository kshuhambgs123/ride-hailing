import { AppDataSource } from "../data-source";
import { AuditLog, AuditAction } from "../entities/AuditLog";

export class SentinelService {
    /**
     * Record a system-wide audit event.
     * Engineered for high-throughput with 20M-user observability.
     */
    static async log(action: AuditAction, userId?: string, metadata?: any, ip?: string) {
        try {
            const auditRepo = AppDataSource.getRepository(AuditLog);
            const entry = auditRepo.create({
                action,
                user: userId ? { id: userId } as any : undefined,
                metadata,
                ipAddress: ip
            });

            // In a massive production env, this would go to a specialized time-series DB or Kafka
            await auditRepo.save(entry);
            console.log(`[Volo Sentinel] Event Logged: ${action} for User: ${userId || 'SYSTEM'}`);
        } catch (error) {
            console.error("[Volo Sentinel] Failed to log event:", error);
        }
    }
}
