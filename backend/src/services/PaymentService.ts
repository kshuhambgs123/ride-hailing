import { PaymentProvider } from "./payment/PaymentProvider";
import { StripeProvider } from "./payment/StripeProvider";
import { RazorpayProvider } from "./payment/RazorpayProvider";
import { PayPalProvider } from "./payment/PayPalProvider";
import { UniversalProvider } from "./payment/UniversalProvider";
import { AppDataSource } from "../data-source";
import { Transaction, TransactionType, TransactionStatus } from "../entities/Transaction";

export class PaymentService {
    private static providers: Record<string, PaymentProvider> = {
        stripe: new StripeProvider(process.env.STRIPE_SECRET_KEY || "sk_test_..."),
        razorpay: new RazorpayProvider(),
        paypal: new PayPalProvider(),
        cash: new UniversalProvider("cash"),
        other: new UniversalProvider("other")
    };

    static getProvider(name: string = "stripe"): PaymentProvider {
        const providerName = name.toLowerCase();
        if (this.providers[providerName]) return this.providers[providerName];

        // Dynamic provider for any other app
        return new UniversalProvider(providerName);
    }

    static async createPaymentIntent(amount: number, currency: string = "usd", providerName: string = "stripe", rideId?: string, userId?: string) {
        const provider = this.getProvider(providerName);
        try {
            const result = await provider.createIntent(amount, currency);

            // Record as PENDING in ledger
            if (userId) {
                const txRepo = AppDataSource.getRepository(Transaction);
                const tx = txRepo.create({
                    user: { id: userId },
                    ride: rideId ? { id: rideId } : undefined,
                    type: TransactionType.PAYMENT,
                    grossAmount: amount,
                    taxAmount: amount * 0.05, // 5% tax example
                    feeAmount: amount * 0.1,  // 10% platform fee example
                    netAmount: amount * 0.85,
                    currency,
                    status: TransactionStatus.PENDING,
                    externalId: result.id,
                    provider: providerName
                });
                await txRepo.save(tx);
            }

            return result;
        } catch (error) {
            console.error(`${provider.getName()} Error:`, error);
            throw error;
        }
    }

    static async verifyPayment(paymentId: string, providerName: string = "stripe") {
        const provider = this.getProvider(providerName);
        try {
            const success = await provider.verifyPayment(paymentId);

            // Update ledger status
            const txRepo = AppDataSource.getRepository(Transaction);
            const tx = await txRepo.findOneBy({ externalId: paymentId });
            if (tx) {
                tx.status = success ? TransactionStatus.COMPLETED : TransactionStatus.FAILED;
                await txRepo.save(tx);
            }

            return success;
        } catch (error) {
            return false;
        }
    }

    static async processRefund(paymentId: string, amount: number) {
        // Multi-provider refund logic here
        const txRepo = AppDataSource.getRepository(Transaction);
        const originalTx = await txRepo.findOneBy({ externalId: paymentId });

        if (originalTx) {
            const refund = txRepo.create({
                user: originalTx.user,
                ride: originalTx.ride,
                type: TransactionType.REFUND,
                grossAmount: -amount,
                netAmount: -amount,
                currency: originalTx.currency,
                status: TransactionStatus.COMPLETED,
                externalId: `ref_${paymentId}`,
                provider: originalTx.provider
            });
            await txRepo.save(refund);
        }
        return true;
    }
}
