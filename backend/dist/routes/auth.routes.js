"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/*
 * Google login
 */
router.post("/google", auth_controller_1.googleLogin);
/*
 * Current authenticated user
 */
router.get("/me", auth_middleware_1.requireAuth, auth_controller_1.getCurrentUser);
router.post("/logout", auth_middleware_1.requireAuth, auth_controller_1.logout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map