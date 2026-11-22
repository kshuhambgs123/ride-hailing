import { Router } from "express";
import express from "express";
import { handleStripeWebhook, handleRazorpayWebhook, handlePayPalWebhook } from "../controllers/webhook.controller";

const router = Router();

// Stripe and Razorpay both verify an HMAC over the exact raw request body,
// so both must be mounted before app.use(express.json()) — a parsed-then-
// re-serialized body would not byte-for-byte match what each gateway signed.
router.post("/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);
router.post("/razorpay", express.raw({ type: "application/json" }), handleRazorpayWebhook);

// PayPal verifies via an API call against the parsed event body instead of
// a local HMAC, so this one wants normal JSON parsing.
router.post("/paypal", express.json(), handlePayPalWebhook);

export default router;
