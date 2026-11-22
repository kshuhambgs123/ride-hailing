import { Request, Response } from "express";
import Stripe from "stripe";
import Razorpay from "razorpay";
import { AppDataSource } from "../data-source";
import { Transaction, TransactionStatus } from "../entities/Transaction";
import { Ride, PaymentStatus } from "../entities/Ride";
import { PaymentService } from "../services/PaymentService";
import { PayPalProvider } from "../services/payment/PayPalProvider";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_...", {
    apiVersion: "2024-12-18.acacia" as any,
});

// Shared by every gateway's webhook: this is the only place any of them is
// ever allowed to mark a ride "paid" — never a client-reported call, which
// can lie, be skipped, or fail after the API response was already sent.
async function settleTransaction(externalId: string, status: TransactionStatus) {
    const txRepo = AppDataSource.getRepository(Transaction);
    const rideRepo = AppDataSource.getRepository(Ride);

    const tx = await txRepo.findOne({ where: { externalId }, relations: ["ride"] });
    if (!tx) return;

    tx.status = status;
    await txRepo.save(tx);

    if (tx.ride) {
        await rideRepo.update(tx.ride.id, {
            paymentStatus: status === TransactionStatus.COMPLETED ? PaymentStatus.PAID : PaymentStatus.FAILED,
        });
    }
}

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

    try {
        switch (event.type) {
            case "payment_intent.succeeded": {
                const intent = event.data.object as Stripe.PaymentIntent;
                await settleTransaction(intent.id, TransactionStatus.COMPLETED);
                break;
            }
            case "payment_intent.payment_failed": {
                const intent = event.data.object as Stripe.PaymentIntent;
                await settleTransaction(intent.id, TransactionStatus.FAILED);
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

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("RAZORPAY_WEBHOOK_SECRET not set — refusing to process unverifiable webhook");
        return res.status(500).send("Webhook not configured");
    }

    // req.body is the raw Buffer here (see the express.raw() mount in
    // webhook.routes.ts) — Razorpay's HMAC is computed over the exact raw
    // bytes, same reasoning as Stripe's above.
    const rawBody = (req.body as Buffer).toString();
    const isValid = Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
        console.error("Razorpay webhook signature verification failed");
        return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(rawBody);

    try {
        switch (event.event) {
            case "payment_link.paid": {
                const linkId = event.payload?.payment_link?.entity?.id;
                if (linkId) await settleTransaction(linkId, TransactionStatus.COMPLETED);
                break;
            }
            case "payment_link.cancelled":
            case "payment_link.expired": {
                const linkId = event.payload?.payment_link?.entity?.id;
                if (linkId) await settleTransaction(linkId, TransactionStatus.FAILED);
                break;
            }
            default:
                break;
        }

        res.json({ received: true });
    } catch (err) {
        console.error("Razorpay webhook handling failed", err);
        res.status(500).send("Webhook handler error");
    }
};

export const handlePayPalWebhook = async (req: Request, res: Response) => {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId || !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        console.error("PayPal webhook not configured — refusing to process unverifiable webhook");
        return res.status(500).send("Webhook not configured");
    }

    const provider = PaymentService.getProvider("paypal") as PayPalProvider;

    try {
        // PayPal verifies via an API call (headers + the parsed event body),
        // not a local HMAC over raw bytes — req.body is JSON-parsed here
        // (see the express.json() mount in webhook.routes.ts), which is
        // exactly what that verification call expects.
        const isValid = await provider.verifyWebhookSignature(req.headers as Record<string, string>, req.body, webhookId);
        if (!isValid) {
            console.error("PayPal webhook signature verification failed");
            return res.status(400).send("Invalid signature");
        }

        const event = req.body;
        switch (event.event_type) {
            case "CHECKOUT.ORDER.APPROVED": {
                // Approval alone doesn't move money — still need to capture.
                const orderId = event.resource?.id;
                if (orderId) await provider.captureOrder(orderId);
                break;
            }
            case "PAYMENT.CAPTURE.COMPLETED": {
                const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
                if (orderId) await settleTransaction(orderId, TransactionStatus.COMPLETED);
                break;
            }
            case "PAYMENT.CAPTURE.DENIED": {
                const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
                if (orderId) await settleTransaction(orderId, TransactionStatus.FAILED);
                break;
            }
            default:
                break;
        }

        res.json({ received: true });
    } catch (err) {
        console.error("PayPal webhook handling failed", err);
        res.status(500).send("Webhook handler error");
    }
};
