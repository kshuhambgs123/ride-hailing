import { Router } from "express";
import { requestRide, acceptRide, getPendingRideRequests, publishRide, searchRides, getSmartSuggestions, parseVoiceBooking, payRide, confirmCashPayment, searchPlaces, getRecommendations, scheduleRide, cancelRide, getFareEstimate } from "../controllers/ride.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /rides/request:
 *   post:
 *     summary: Request a new ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pickupLat: { type: number }
 *               pickupLng: { type: number }
 *               destinationLat: { type: number }
 *               destinationLng: { type: number }
 *               fare: { type: number }
 */
router.post("/request", authMiddleware, requestRide);

/**
 * @swagger
 * /rides/accept/{rideId}:
 *   post:
 *     summary: Driver accepts a ride
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 */
router.post("/accept/:rideId", authMiddleware, acceptRide);

/**
 * @swagger
 * /rides/pending:
 *   get:
 *     summary: List on-demand ride requests waiting for a driver
 *     tags: [Rides]
 */
router.get("/pending", authMiddleware, getPendingRideRequests);

/**
 * @swagger
 * /rides/publish:
 *   post:
 *     summary: Driver publishes a ride offer (Carpooling)
 *     tags: [Rides]
 */
router.post("/publish", authMiddleware, publishRide);

/**
 * @swagger
 * /rides/search:
 *   get:
 *     summary: Search for carpooling matches
 *     tags: [Rides]
 */
router.get("/search", authMiddleware, searchRides);

/**
 * @swagger
 * /rides/suggestions:
 *   get:
 *     summary: Get AI-powered destination suggestions
 *     tags: [Rides]
 */
router.get("/suggestions", authMiddleware, getSmartSuggestions);

/**
 * @swagger
 * /rides/voice-parse:
 *   post:
 *     summary: Parse natural language voice command into booking intent
 *     tags: [Rides]
 */
router.post("/voice-parse", authMiddleware, parseVoiceBooking);

/**
 * @swagger
 * /rides/pay:
 *   post:
 *     summary: Process payment for a ride
 *     tags: [Rides]
 */
router.post("/pay", authMiddleware, payRide);

/**
 * @swagger
 * /rides/confirm-cash/{rideId}:
 *   post:
 *     summary: Driver confirms they received cash for this ride
 *     tags: [Rides]
 */
router.post("/confirm-cash/:rideId", authMiddleware, confirmCashPayment);

/**
 * @swagger
 * /rides/search-places:
 *   get:
 *     summary: Search for locations/addresses
 *     tags: [Rides]
 */
router.get("/search-places", authMiddleware, searchPlaces);
router.get("/recommendations", authMiddleware, getRecommendations);
router.post("/fare-estimate", authMiddleware, getFareEstimate);
router.post("/schedule", authMiddleware, scheduleRide);
router.post("/cancel", authMiddleware, cancelRide);

export default router;
