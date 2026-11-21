import { Router } from "express";
import { upload, isUsingS3Storage } from "../middleware/upload";
import { authMiddleware } from "../middleware/auth.middleware";
import { SentinelService } from "../services/SentinelService";
import { AuditAction } from "../entities/AuditLog";

const router = Router();

// Requires auth: KYC documents must be tied to a real, authenticated user,
// never attributed to "anonymous".
router.post("/id-proof", authMiddleware, upload.single("idProof"), async (req: any, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id;
    // S3 storage: the bucket is private, so we persist the object key, not a
    // public URL. Serve it back only via a short-lived signed URL, never directly.
    const imageRef = isUsingS3Storage ? req.file.key : `/uploads/ids/${req.file.filename}`;

    // Record Audit (Volo Sentinel)
    await SentinelService.log(AuditAction.PROFILE_UPDATE, userId, { action: "ID_PROOF_UPLOAD", imageRef });

    res.status(200).json({
        message: "Identity proof uploaded successfully",
        imageRef,
    });
});

export default router;
