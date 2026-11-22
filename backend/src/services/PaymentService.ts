import { CustomerInfo, PaymentProvider } from "./payment/PaymentProvider";
import { StripeProvider } from "./payment/StripeProvider";
import { RazorpayProvider } from "./payment/RazorpayProvider";
import { PayPalProvider } from "./payment/PayPalProvider";
import { UniversalProvider } from "./payment/UniversalProvider";
import { AppDataSource } from "../data-source";
import { Transaction, TransactionType, TransactionStatus } from "../entities/Transaction";

export class PaymentService {
    // Built lazily (not at module load) so the app can still boot when a
    // gateway's credentials aren't configured yet — the clear error only
    // surfaces when that specific provider is actually used, not for every
    // request regardless of payment method.
    private static instances: Partial<Record<string, PaymentProvider>> = {};

    private static buildProvider(name: string): PaymentProvider {
        switch (name) {
            case "stripe":
                if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");
                return new StripeProvider(process.env.STRIPE_SECRET_KEY);
            case "razorpay":
                if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured");
                }
                return new RazorpayProvider(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET);
            case "paypal":
                if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
                    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not configured");
                }
                return new PayPalProvider(
                    process.env.PAYPAL_CLIENT_ID,
                    process.env.PAYPAL_CLIENT_SECRET,
                    process.env.NODE_ENV === "production"
                );
            case "cash":
            case "other":
                return new UniversalProvider(name);
            default:
                return new UniversalProvider(name);
        }
    }

    static getProvider(name: string = "stripe"): PaymentProvider {
        const providerName = name.toLowerCase();
        if (!this.instances[providerName]) {
            this.instances[providerName] = this.buildProvider(providerName);
        }
        return this.instances[providerName]!;
    }

    static async createPaymentIntent(
        amount: number,
        currency: string = "usd",
        providerName: string = "stripe",
        rideId?: string,
        userId?: string,
        customer?: CustomerInfo
    ) {
        const provider = this.getProvider(providerName);
        try {
            const result = await provider.createIntent(amount, currency, customer);

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
