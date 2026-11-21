import Stripe from "stripe";
import { PaymentProvider, PaymentResponse } from "./PaymentProvider";

export class StripeProvider implements PaymentProvider {
    private stripe: Stripe;

    constructor(secretKey: string) {
        this.stripe = new Stripe(secretKey, {
            apiVersion: "2024-12-18.acacia" as any,
        });
    }

    getName() { return "stripe"; }

    async createIntent(amount: number, currency: string): Promise<PaymentResponse> {
        const intent = await this.stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
        });
        return {
            id: intent.id,
            clientSecret: intent.client_secret || undefined,
            status: intent.status,
            amount: intent.amount / 100,
            currency: intent.currency
        };
    }

    async verifyPayment(paymentId: string): Promise<boolean> {
        const intent = await this.stripe.paymentIntents.retrieve(paymentId);
        return intent.status === "succeeded";
    }
}
