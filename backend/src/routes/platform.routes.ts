import { Router } from "express";
import { getPlatformStats, verifyKyc, setupReferral, createSupportTicket, getMyTickets } from "../controllers/platform.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/stats", getPlatformStats);
router.post("/verify-kyc", authMiddleware, verifyKyc);
router.post("/referral", authMiddleware, setupReferral);
router.post("/support/tickets", authMiddleware, createSupportTicket);
router.get("/support/tickets", authMiddleware, getMyTickets);

export default router;
