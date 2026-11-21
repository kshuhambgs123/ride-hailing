import { Router } from "express";
import { checkHealth } from "../controllers/health.controller";

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Volo Ecosystem Health Telemetry
 *     tags: [Platform]
 *     responses:
 *       200:
 *         description: System is at Elite status
 */
router.get("/", checkHealth);

export default router;
