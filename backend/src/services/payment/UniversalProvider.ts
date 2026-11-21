import { PaymentProvider, PaymentResponse } from "./PaymentProvider";

export class UniversalProvider implements PaymentProvider {
    private name: string;

    constructor(name: string = "universal") {
        this.name = name;
    }

    getName() { return this.name; }

    async createIntent(amount: number, currency: string): Promise<PaymentResponse> {
        return {
            id: `univ_${Math.random().toString(36).substr(2, 9)}`,
            status: "pending_verification",
            amount,
            currency
        };
    }

    async verifyPayment(paymentId: string): Promise<boolean> {
        // Manual verification or webhook confirmation
        return true;
    }
}
