"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sender_controller_1 = require("../controllers/sender.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.requireAuth, sender_controller_1.createSenderController);
router.get("/", auth_middleware_1.requireAuth, sender_controller_1.getSendersController);
router.get("/:id", auth_middleware_1.requireAuth, sender_controller_1.getSenderController);
router.patch("/:id", auth_middleware_1.requireAuth, sender_controller_1.updateSenderController);
router.delete("/:id", auth_middleware_1.requireAuth, sender_controller_1.deleteSenderController);
exports.default = router;
//# sourceMappingURL=sender.routes.js.map