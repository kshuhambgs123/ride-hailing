import { Router } from "express";
import express from "express";
import { handleStripeWebhook } from "../controllers/webhook.controller";

const router = Router();

// Stripe requires the raw request body (not JSON-parsed) to verify the
// webhook signature, so this must be mounted before app.use(express.json()).
router.post("/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

export default router;
