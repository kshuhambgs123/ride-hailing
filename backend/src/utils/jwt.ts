import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

const SECRET = process.env.JWT_SECRET || "fallbacksecret";

export const generateToken = (payload: object) => {
    return jwt.sign(payload, SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, SECRET);
};
