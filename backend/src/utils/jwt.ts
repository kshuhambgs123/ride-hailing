import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

// A missing JWT_SECRET must fail loudly, not silently sign tokens with a
// guessable fallback that anyone can forge requests against in production.
if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET must be set in production");
    }
    console.warn("JWT_SECRET not set — using an insecure dev-only fallback. Do not deploy like this.");
}

const SECRET = process.env.JWT_SECRET || "fallbacksecret";

export const generateToken = (payload: object) => {
    return jwt.sign(payload, SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, SECRET);
};
