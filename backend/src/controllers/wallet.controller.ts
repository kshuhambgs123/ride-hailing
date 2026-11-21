import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { WalletService } from "../services/WalletService";
import { AppDataSource } from "../data-source";
import { Transaction } from "../entities/Transaction";

export const getBalance = async (req: AuthRequest, res: Response) => {
    try {
        const balance = await WalletService.getBalance(req.user.id);
        res.json({ balance });
    } catch (error) {
        res.status(500).json({ message: "Error fetching balance", error });
    }
};

export const addMoney = async (req: AuthRequest, res: Response) => {
    const { amount, referenceId } = req.body;
    try {
        const newBalance = await WalletService.creditWallet(req.user.id, Number(amount), referenceId);
        res.json({ message: "Money added successfuly", newBalance });
    } catch (error) {
        res.status(500).json({ message: "Error adding money", error });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    try {
        const transactions = await transactionRepo.find({
            where: { user: { id: req.user.id } },
            order: { createdAt: "DESC" }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching transactions", error });
    }
};
