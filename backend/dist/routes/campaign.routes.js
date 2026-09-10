"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const campaign_controller_1 = require("../controllers/campaign.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
/*
 * JSON campaign API
 */
router.post("/", auth_middleware_1.requireAuth, campaign_controller_1.createCampaignController);
/*
 * CSV campaign API
 */
router.post("/csv", auth_middleware_1.requireAuth, upload.single("file"), campaign_controller_1.createCampaignFromCsvController);
exports.default = router;
//# sourceMappingURL=campaign.routes.js.map