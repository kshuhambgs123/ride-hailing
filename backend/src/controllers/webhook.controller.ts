import { Request, Response } from "express";
import Stripe from "stripe";
import { AppDataSource } from "../data-source";
import { Transaction, TransactionStatus } from "../entities/Transaction";
import { Ride, PaymentStatus } from "../entities/Ride";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_...", {
    apiVersion: "2024-12-18.acacia" as any,
});

// This is the only source of truth for whether a card payment actually
// succeeded — the client's PaymentIntent confirmation can lie, be skipped,
// or fail after the API response was already sent, so ride.paymentStatus
// must never be set to "paid" from a client-reported call.
export const handleStripeWebhook = async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET not set — refusing to process unverifiable webhook");
        return res.status(500).send("Webhook not configured");
    }

    let event: Stripe.Event;
    try {
        // req.body is the raw Buffer here (see the express.raw() mount in
        // index.ts) — constructEvent needs the raw bytes, not parsed JSON,
        // to verify the signature.
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
        console.error("Stripe webhook signature verification failed", err);
        return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    const txRepo = AppDataSource.getRepository(Transaction);
    const rideRepo = AppDataSource.getRepository(Ride);

    try {
        switch (event.type) {
            case "payment_intent.succeeded": {
                const intent = event.data.object as Stripe.PaymentIntent;
                const tx = await txRepo.findOne({ where: { externalId: intent.id }, relations: ["ride"] });
                if (tx) {
                    tx.status = TransactionStatus.COMPLETED;
                    await txRepo.save(tx);

                    if (tx.ride) {
                        await rideRepo.update(tx.ride.id, { paymentStatus: PaymentStatus.PAID });
                    }
                }
                break;
            }
            case "payment_intent.payment_failed": {
                const intent = event.data.object as Stripe.PaymentIntent;
                const tx = await txRepo.findOne({ where: { externalId: intent.id }, relations: ["ride"] });
                if (tx) {
                    tx.status = TransactionStatus.FAILED;
                    await txRepo.save(tx);

                    if (tx.ride) {
                        await rideRepo.update(tx.ride.id, { paymentStatus: PaymentStatus.FAILED });
                    }
                }
                break;
            }
            default:
                break;
        }

        res.json({ received: true });
    } catch (err) {
        console.error("Stripe webhook handling failed", err);
        res.status(500).send("Webhook handler error");
    }
};
