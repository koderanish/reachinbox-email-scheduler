"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLogin = googleLogin;
exports.getCurrentUser = getCurrentUser;
exports.logout = logout;
const google_auth_service_1 = require("../services/google-auth.service");
const auth_service_1 = require("../services/auth.service");
const db_1 = __importDefault(require("../config/db"));
const AUTH_COOKIE_NAME = "auth_token";
async function googleLogin(req, res) {
    try {
        const { credential } = req.body;
        if (typeof credential !== "string" ||
            !credential.trim()) {
            return res.status(400).json({
                message: "Google credential is required",
            });
        }
        // Verify Google ID token
        const googleUser = await (0, google_auth_service_1.verifyGoogleToken)(credential);
        // Find existing user or create a new user
        const user = await (0, google_auth_service_1.findOrCreateGoogleUser)(googleUser);
        // Create application JWT
        const token = (0, auth_service_1.createAuthToken)(user.id);
        /*
         * Store JWT in an HTTP-only cookie.
         */
        res.cookie(AUTH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production"
                ? "none"
                : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });
        return res.status(200).json({
            message: "Google login successful",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (error) {
        console.error("Google login failed:", error);
        return res.status(401).json({
            message: "Google authentication failed",
        });
    }
}
/*
 * ---------------------------------------------------------
 * Get Current Authenticated User
 * ---------------------------------------------------------
 */
async function getCurrentUser(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const result = await db_1.default.query(`
      SELECT
        id,
        email,
        name,
        created_at
      FROM users
      WHERE id = $1
      `, [userId]);
        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "User not found",
            });
        }
        return res.status(200).json({
            user: result.rows[0],
        });
    }
    catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({
            message: "Failed to fetch current user",
        });
    }
}
function logout(req, res) {
    res.clearCookie(AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
    });
    return res.status(200).json({
        message: "Logged out successfully",
    });
}
//# sourceMappingURL=auth.controller.js.map