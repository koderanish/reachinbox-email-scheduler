"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_controller_1 = require("../controllers/email.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.requireAuth, email_controller_1.getEmailsController);
router.get("/search", auth_middleware_1.requireAuth, email_controller_1.searchEmails);
exports.default = router;
//# sourceMappingURL=email.routes.js.map