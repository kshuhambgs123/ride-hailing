export interface PaymentResponse {
    id: string;
    clientSecret?: string;
    status: string;
    amount: number;
    currency: string;
}

export interface PaymentProvider {
    getName(): string;
    createIntent(amount: number, currency: string): Promise<PaymentResponse>;
    verifyPayment(paymentId: string): Promise<boolean>;
}
