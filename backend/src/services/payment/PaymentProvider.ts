export interface CustomerInfo {
    name?: string;
    email?: string;
    contact?: string;
}

export interface PaymentResponse {
    id: string;
    clientSecret?: string;
    // Set by providers (Razorpay, PayPal) that use a hosted checkout page
    // instead of an in-app SDK — the client just opens this URL in a
    // browser. The real source of truth for success is still the
    // provider's webhook, never the client returning from that browser.
    checkoutUrl?: string;
    status: string;
    amount: number;
    currency: string;
}

export interface PaymentProvider {
    getName(): string;
    createIntent(amount: number, currency: string, customer?: CustomerInfo): Promise<PaymentResponse>;
    verifyPayment(paymentId: string): Promise<boolean>;
}
