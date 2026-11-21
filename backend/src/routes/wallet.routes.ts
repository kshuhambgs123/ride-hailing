import { Router } from "express";
import { getBalance, addMoney, getTransactions } from "../controllers/wallet.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/balance", authMiddleware, getBalance);
router.post("/add", authMiddleware, addMoney);
router.get("/transactions", authMiddleware, getTransactions);

export default router;
