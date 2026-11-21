import { Router } from "express";
import { createReview, getReviewsForUser } from "../controllers/review.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a review for a ride
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rideId: { type: string }
 *               revieweeId: { type: string }
 *               rating: { type: number, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 */
router.post("/", authMiddleware, createReview);

/**
 * @swagger
 * /reviews/user/{userId}:
 *   get:
 *     summary: Get reviews for a user
 *     tags: [Reviews]
 */
router.get("/user/:userId", getReviewsForUser);

export default router;
