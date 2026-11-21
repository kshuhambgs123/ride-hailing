import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import fs from "fs";
import { S3Client } from "@aws-sdk/client-s3";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Only images (.jpg, .jpeg, .png) are allowed"));
    }
};

const useS3 = !!process.env.AWS_S3_BUCKET;

function buildS3Storage() {
    const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
    return multerS3({
        s3,
        bucket: process.env.AWS_S3_BUCKET as string,
        // KYC documents must never be publicly readable.
        acl: "private",
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, `ids/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
    });
}

function buildDiskStorage() {
    const uploadDir = "uploads/ids";
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
    });
}

// Falls back to local disk storage only when no S3 bucket is configured (local dev).
// Production MUST set AWS_S3_BUCKET — local disk storage does not survive
// redeploys or work across more than one backend instance.
export const upload = multer({
    storage: useS3 ? buildS3Storage() : buildDiskStorage(),
    limits: { fileSize: FILE_SIZE_LIMIT },
    fileFilter,
});

export const isUsingS3Storage = useS3;
