import { PaymentProvider, PaymentResponse } from "./PaymentProvider";

export class PayPalProvider implements PaymentProvider {
    getName() { return "paypal"; }

    async createIntent(amount: number, currency: string): Promise<PaymentResponse> {
        console.log(`PayPal: Creating Order for ${amount} ${currency}`);
        return {
            id: `pp_order_${Math.random().toString(36).substr(2, 9)}`,
            status: "CREATED",
            amount,
            currency
        };
    }

    async verifyPayment(paymentId: string): Promise<boolean> {
        return true;
    }
}
