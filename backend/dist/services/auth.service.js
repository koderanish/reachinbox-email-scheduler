"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthToken = createAuthToken;
exports.verifyAuthToken = verifyAuthToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_EXPIRES_IN = "7d";
function createAuthToken(userId) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    return jsonwebtoken_1.default.sign({
        userId,
    }, secret, {
        expiresIn: JWT_EXPIRES_IN,
    });
}
function verifyAuthToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    const decoded = jsonwebtoken_1.default.verify(token, secret);
    if (typeof decoded !== "object" ||
        decoded === null ||
        typeof decoded.userId !== "string") {
        throw new Error("Invalid authentication token");
    }
    return {
        userId: decoded.userId,
    };
}
//# sourceMappingURL=auth.service.js.map