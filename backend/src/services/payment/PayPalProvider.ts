import axios from "axios";
import { CustomerInfo, PaymentProvider, PaymentResponse } from "./PaymentProvider";

// Plain REST calls, not @paypal/checkout-server-sdk — PayPal itself marked
// that SDK deprecated in favor of @paypal/paypal-server-sdk, and pulling in
// either SDK buys nothing over calling the (stable, versioned) REST API
// directly for just "create an order, give me its approve link".
export class PayPalProvider implements PaymentProvider {
    private clientId: string;
    private clientSecret: string;
    private baseUrl: string;

    constructor(clientId: string, clientSecret: string, live: boolean = false) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.baseUrl = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    }

    getName() { return "paypal"; }

    private async getAccessToken(): Promise<string> {
        const response = await axios.post(
            `${this.baseUrl}/v1/oauth2/token`,
            "grant_type=client_credentials",
            {
                auth: { username: this.clientId, password: this.clientSecret },
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );
        return response.data.access_token;
    }

    async createIntent(amount: number, currency: string = "USD", _customer?: CustomerInfo): Promise<PaymentResponse> {
        const accessToken = await this.getAccessToken();

        const response = await axios.post(
            `${this.baseUrl}/v2/checkout/orders`,
            {
                intent: "CAPTURE",
                purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }],
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const approveLink = response.data.links?.find((l: any) => l.rel === "approve")?.href;

        return {
            id: response.data.id,
            status: response.data.status,
            amount,
            currency,
            checkoutUrl: approveLink,
        };
    }

    // Capturing (not just checking status) is what actually moves money —
    // approval alone does not. Called from the CHECKOUT.ORDER.APPROVED
    // webhook, server-side, never triggered by the client.
    async captureOrder(orderId: string): Promise<boolean> {
        const accessToken = await this.getAccessToken();
        const response = await axios.post(
            `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
            {},
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return response.data.status === "COMPLETED";
    }

    async verifyPayment(orderId: string): Promise<boolean> {
        const accessToken = await this.getAccessToken();
        const response = await axios.get(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data.status === "COMPLETED";
    }

    async verifyWebhookSignature(headers: Record<string, string>, body: unknown, webhookId: string): Promise<boolean> {
        const accessToken = await this.getAccessToken();
        const response = await axios.post(
            `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
            {
                auth_algo: headers["paypal-auth-algo"],
                cert_url: headers["paypal-cert-url"],
                transmission_id: headers["paypal-transmission-id"],
                transmission_sig: headers["paypal-transmission-sig"],
                transmission_time: headers["paypal-transmission-time"],
                webhook_id: webhookId,
                webhook_event: body,
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return response.data.verification_status === "SUCCESS";
    }
}
