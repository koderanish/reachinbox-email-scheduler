import { Router } from "express";

import {
  startSlackOAuth,
  slackOAuthCallback,
  getSlackStatus,
} from "../controllers/slack.controller";

import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

/*
 * Start Slack OAuth
 */

router.get(
  "/oauth",
  requireAuth,
  startSlackOAuth
);

/*
 * Slack OAuth callback
 *
 * This route must remain public because
 * Slack redirects the browser here after authorization.
 */

router.get(
  "/oauth/callback",
  slackOAuthCallback
);

/*
 * Slack connection status
 */

router.get(
  "/status",
  requireAuth,
  getSlackStatus
);

export default router;