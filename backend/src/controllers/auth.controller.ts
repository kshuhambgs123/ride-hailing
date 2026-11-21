import { Request, Response } from "express";
import admin from "../firebase";
import { AppDataSource } from "../data-source";
import { User, UserRole } from "../entities/User";
import { DriverVerification, VerificationStatus } from "../entities/DriverVerification";
import { generateToken } from "../utils/jwt";
import { TrustService } from "../services/TrustService";
import { WalletService } from "../services/WalletService";
import { SentinelService } from "../services/SentinelService";
import { AuditAction } from "../entities/AuditLog";

export const verifyOtp = async (req: Request, res: Response) => {
    const userRepository = AppDataSource.getRepository(User);
    const { idToken, role } = req.body;

    try {
        let phoneNumber: string | undefined;

        if (idToken === "mock-id-token" && process.env.NODE_ENV !== "production") {
            // Dev/test-only bypass so the app works before real Firebase phone
            // auth is wired on the client. Gated out of production — otherwise
            // anyone could POST this literal string and mint a valid session
            // for the fixed mock phone number with no OTP check at all.
            phoneNumber = "+1234567890"; // Default mock number
        } else {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            phoneNumber = decodedToken.phone_number;
        }

        if (!phoneNumber) {
            return res.status(400).json({ message: "Phone number not found in token" });
        }

        let user = await userRepository.findOne({ where: { phoneNumber } });

        if (!user) {
            user = userRepository.create({
                phoneNumber,
                role: role || UserRole.USER,
                isVerified: true,
            });
            await userRepository.save(user);

            // VOLO WELCOME: First-time credit
            try {
                await WalletService.creditWallet(user.id, 10, "WELCOME_BONUS");
                user.walletBalance = 10; // Reflect in the response
            } catch (e) {
                console.error("Welcome credit failed", e);
            }
        }

        const token = generateToken({ id: user.id, role: user.role });

        // Record Audit (Volo Sentinel)
        await SentinelService.log(AuditAction.USER_LOGIN, user.id, { ip: req.ip }, req.ip);

        res.status(200).json({
            message: "Login successful",
            token,
            user,
            isNewUser: !user.createdAt // Simple flag for onboarding
        });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(401).json({ message: "Invalid token" });
    }
};

export const register = async (req: Request, res: Response) => {
    // Mock register logic
    res.json({ message: "Registration successful" });
};

export const login = async (req: Request, res: Response) => {
    // Mock login logic
    res.json({ message: "Login successful" });
};

export const getMe = async (req: Request, res: Response) => {
    const user = (req as any).user;
    res.json(user);
};

export const updateProfile = async (req: Request, res: Response) => {
    const userRepository = AppDataSource.getRepository(User);
    const userId = (req as any).user.id;
    const updates = req.body;

    await userRepository.update(userId, updates);
    const updatedUser = await userRepository.findOneBy({ id: userId });

    // Record Audit (Volo Sentinel)
    await SentinelService.log(AuditAction.PROFILE_UPDATE, userId, { updates });

    res.json(updatedUser);
};

export const linkSocialAccount = async (req: Request, res: Response) => {
    const userRepository = AppDataSource.getRepository(User);
    const userId = (req as any).user.id;
    const { provider } = req.body; // e.g. "facebook", "linkedin"

    const user = await userRepository.findOneBy({ id: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (provider === "facebook") user.isFacebookLinked = true;
    if (provider === "linkedin") user.isLinkedInLinked = true;

    // Recalculate Trust Score (Elite Layer)
    user.trustScore = TrustService.calculateTrustScore(user as any);

    await userRepository.save(user);
    res.json({ message: `${provider} linked successfully`, trustScore: user.trustScore });
};

export const verifyEmail = async (req: Request, res: Response) => {
    const userRepository = AppDataSource.getRepository(User);
    const userId = (req as any).user.id;
    const { email } = req.body;

    const user = await userRepository.findOneBy({ id: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.email = email;
    user.isEmailVerified = true;
    user.trustScore = TrustService.calculateTrustScore(user as any);

    await userRepository.save(user);
    res.json({ message: "Email verified successfully", trustScore: user.trustScore });
};

export const driverVerification = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const verificationRepo = AppDataSource.getRepository(DriverVerification);
    const userRepo = AppDataSource.getRepository(User);

    const data = req.body;

    // Create or Update Verification
    let verification = await verificationRepo.findOne({ where: { user: { id: userId } } });
    if (!verification) {
        verification = verificationRepo.create({ user: { id: userId } as any });
    }

    Object.assign(verification, {
        ...data,
        status: VerificationStatus.PENDING,
        appliedAt: new Date()
    });

    await verificationRepo.save(verification);

    // Update user status
    await userRepo.update(userId, { role: UserRole.DRIVER }); // Placeholder for promotion

    // Record Audit
    await SentinelService.log(AuditAction.PROFILE_UPDATE, userId, { action: "DRIVER_VERIFICATION_SUBMIT", data });

    res.json({ message: "Verification application submitted", verification });
};
