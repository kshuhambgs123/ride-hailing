import { Router } from "express";
import {
    getPlatformStats, getTenantConfig, verifyKyc, setupReferral, createSupportTicket, getMyTickets,
    getEmergencyContacts, addEmergencyContact, removeEmergencyContact, triggerSos,
} from "../controllers/platform.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/stats", getPlatformStats);
router.get("/tenant-config", getTenantConfig);
router.post("/verify-kyc", authMiddleware, verifyKyc);
router.post("/referral", authMiddleware, setupReferral);
router.post("/support/tickets", authMiddleware, createSupportTicket);
router.get("/support/tickets", authMiddleware, getMyTickets);
router.get("/emergency-contacts", authMiddleware, getEmergencyContacts);
router.post("/emergency-contacts", authMiddleware, addEmergencyContact);
router.delete("/emergency-contacts/:contactId", authMiddleware, removeEmergencyContact);
router.post("/sos", authMiddleware, triggerSos);

export default router;
