import request from "supertest";
import express from "express";
import * as authController from "../src/controllers/auth.controller";
import { AppDataSource } from "../src/data-source";
import { User } from "../src/entities/User";

// Mock AppDataSource
jest.mock("../src/data-source", () => ({
    AppDataSource: {
        getRepository: jest.fn()
    }
}));

const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn()
};

const app = express();
app.use(express.json());
app.post("/api/auth/verify-otp", authController.verifyOtp);

describe("Auth Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);
    });

    test("should login successfully with mock-id-token", async () => {
        mockUserRepository.findOne.mockResolvedValue({ id: "1", phoneNumber: "+1234567890", role: "user" });

        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({
                idToken: "mock-id-token",
                role: "user"
            });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Login successful");
        expect(res.body.user.phoneNumber).toBe("+1234567890");
    });

    test("should handle invalid token correctly", async () => {
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({
                idToken: "invalid-token"
            });

        expect(res.status).toBe(401);
    });
});
