"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSlackOAuth = startSlackOAuth;
exports.slackOAuthCallback = slackOAuthCallback;
exports.getSlackStatus = getSlackStatus;
const slack_service_1 = require("../services/slack.service");
async function startSlackOAuth(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const url = await (0, slack_service_1.createSlackOAuthUrl)(userId);
        return res.redirect(url);
    }
    catch (error) {
        console.error("Failed to start Slack OAuth:", error);
        return res.status(500).json({
            message: "Failed to start Slack OAuth",
        });
    }
}
async function slackOAuthCallback(req, res) {
    try {
        const code = typeof req.query.code === "string"
            ? req.query.code
            : "";
        const state = typeof req.query.state === "string"
            ? req.query.state
            : "";
        const error = typeof req.query.error === "string"
            ? req.query.error
            : "";
        if (error) {
            return res.status(400).send(`
        <h2>Slack authorization failed</h2>
        <p>${error}</p>
      `);
        }
        if (!code || !state) {
            return res.status(400).send(`
        <h2>Invalid Slack OAuth callback</h2>
        <p>Missing authorization code or state.</p>
      `);
        }
        const result = await (0, slack_service_1.handleSlackOAuthCallback)(code, state);
        return res.send(`
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h1>Slack Connected Successfully ✅</h1>

          <p>
            Workspace:
            <strong>${result.teamName}</strong>
          </p>

          <p>
            Channel:
            <strong>
              ${result.channel ??
            "Configured webhook channel"}
            </strong>
          </p>

          <p>You can close this window.</p>
        </body>
      </html>
    `);
    }
    catch (error) {
        console.error("Slack OAuth callback failed:", error);
        return res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h1>Slack connection failed ❌</h1>

          <p>
            ${error instanceof Error
            ? error.message
            : "Unknown error"}
          </p>
        </body>
      </html>
    `);
    }
}
async function getSlackStatus(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const connection = await (0, slack_service_1.getSlackConnection)(userId);
        if (!connection) {
            return res.json({
                connected: false,
                connection: null,
            });
        }
        /*
         * Never expose:
         * - access_token
         * - webhook_url
         */
        return res.json({
            connected: true,
            connection: {
                id: connection.id,
                team_id: connection.team_id,
                team_name: connection.team_name,
                created_at: connection.created_at,
                updated_at: connection.updated_at,
            },
        });
    }
    catch (error) {
        console.error("Failed to get Slack status:", error);
        return res.status(500).json({
            message: "Failed to get Slack status",
        });
    }
}
//# sourceMappingURL=slack.controller.js.map