import Razorpay from "razorpay";
import { CustomerInfo, PaymentProvider, PaymentResponse } from "./PaymentProvider";

// Uses Razorpay's Payment Links API rather than the lower-level Orders API:
// it returns a plain hosted checkout URL (`short_url`) the client just opens
// in a browser, with no native Razorpay Checkout SDK or WebView bridging
// needed. The client never decides payment success — only the
// `payment_link.paid` webhook (see webhook.controller.ts) does.
export class RazorpayProvider implements PaymentProvider {
    private client: Razorpay;

    constructor(keyId: string, keySecret: string) {
        this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }

    getName() { return "razorpay"; }

    async createIntent(amount: number, currency: string = "INR", customer?: CustomerInfo): Promise<PaymentResponse> {
        const link = await this.client.paymentLink.create({
            amount: Math.round(amount * 100),
            currency,
            accept_partial: false,
            customer: { name: customer?.name || "Rider", contact: customer?.contact || "" },
            notify: { sms: false, email: false },
        });

        return {
            id: link.id,
            status: link.status,
            amount,
            currency,
            checkoutUrl: link.short_url,
        };
    }

    async verifyPayment(paymentLinkId: string): Promise<boolean> {
        const link = await this.client.paymentLink.fetch(paymentLinkId);
        return link.status === "paid";
    }
}
