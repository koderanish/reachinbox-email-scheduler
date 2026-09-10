"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const slack_controller_1 = require("../controllers/slack.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/*
 * Start Slack OAuth
 */
router.get("/oauth", auth_middleware_1.requireAuth, slack_controller_1.startSlackOAuth);
/*
 * Slack OAuth callback
 *
 * This route must remain public because
 * Slack redirects the browser here after authorization.
 */
router.get("/oauth/callback", slack_controller_1.slackOAuthCallback);
/*
 * Slack connection status
 */
router.get("/status", auth_middleware_1.requireAuth, slack_controller_1.getSlackStatus);
exports.default = router;
//# sourceMappingURL=slack.routes.js.map