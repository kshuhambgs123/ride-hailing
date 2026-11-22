import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminOnly } from "../middleware/admin.middleware";
import { listDriverApplications, approveDriverApplication, rejectDriverApplication } from "../controllers/admin.controller";

const router = Router();

router.use(authMiddleware, adminOnly);

router.get("/driver-applications", listDriverApplications);
router.post("/driver-applications/:id/approve", approveDriverApplication);
router.post("/driver-applications/:id/reject", rejectDriverApplication);

export default router;
