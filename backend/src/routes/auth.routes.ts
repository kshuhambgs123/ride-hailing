import express, { Router } from "express";
import { verifyOtp, register, login, getMe, updateProfile, linkSocialAccount, verifyEmail, driverVerification } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify Firebase ID Token (OTP) and login/signup
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, driver]
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/verify-otp", verifyOtp);
router.post("/driver-verification", authMiddleware, driverVerification);

export default router;
