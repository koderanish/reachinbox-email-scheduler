"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const auth_service_1 = require("../services/auth.service");
function requireAuth(req, res, next) {
    try {
        let token = req.cookies?.auth_token;
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith("Bearer ")) {
                token = authHeader
                    .substring(7)
                    .trim();
            }
        }
        if (!token) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const payload = (0, auth_service_1.verifyAuthToken)(token);
        req.user = {
            id: payload.userId,
        };
        next();
    }
    catch (error) {
        console.error("Authentication failed:", error);
        return res.status(401).json({
            message: "Invalid or expired authentication token",
        });
    }
}
//# sourceMappingURL=auth.middleware.js.map