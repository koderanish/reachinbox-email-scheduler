"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSlackOAuthUrl = createSlackOAuthUrl;
exports.handleSlackOAuthCallback = handleSlackOAuthCallback;
exports.getSlackConnection = getSlackConnection;
exports.notifySlackHourlyLimitReached = notifySlackHourlyLimitReached;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = __importDefault(require("../config/redis"));
const db_1 = __importDefault(require("../config/db"));
const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_ACCESS_URL = "https://slack.com/api/oauth.v2.access";
// OAuth state remains valid for 30 minutes.
const STATE_TTL_SECONDS = 1800;
/**
 * Create Slack OAuth authorization URL
 */
async function createSlackOAuthUrl(userId) {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;
    if (!clientId || !redirectUri) {
        throw new Error("Slack OAuth environment variables are missing");
    }
    // Generate a cryptographically secure OAuth state.
    const state = crypto_1.default.randomBytes(32).toString("hex");
    const stateKey = `slack:oauth:state:${state}`;
    /*
     * Store the state in Redis instead of application memory.
     *
     * This is important for Railway because:
     * - API can restart
     * - multiple instances can exist
     * - OAuth callback may reach another process
     *
     * Redis keeps the state shared and persistent.
     */
    await redis_1.default.set(stateKey, userId, "EX", STATE_TTL_SECONDS);
    /*
     * Verify that Redis actually stored the state.
     * This is temporary diagnostic logging and does not expose
     * the Slack client secret, access token, or webhook URL.
     */
    const storedUserId = await redis_1.default.get(stateKey);
    console.log("Slack OAuth state created:", {
        state,
        userId,
        storedSuccessfully: storedUserId === userId,
        ttlSeconds: STATE_TTL_SECONDS,
    });
    const params = new URLSearchParams({
        client_id: clientId,
        scope: "incoming-webhook",
        redirect_uri: redirectUri,
        state,
    });
    const authorizationUrl = `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
    return authorizationUrl;
}
/**
 * Handle Slack OAuth callback
 */
async function handleSlackOAuthCallback(code, state) {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI;
    if (!clientId ||
        !clientSecret ||
        !redirectUri) {
        throw new Error("Slack OAuth environment variables are missing");
    }
    if (!state) {
        throw new Error("Slack OAuth state is missing");
    }
    const stateKey = `slack:oauth:state:${state}`;
    /*
     * Retrieve the user ID associated with this OAuth state.
     */
    const userId = await redis_1.default.get(stateKey);
    console.log("Slack OAuth state checked:", {
        state,
        stateFound: Boolean(userId),
    });
    if (!userId) {
        throw new Error("Invalid or expired Slack OAuth state");
    }
    /*
     * OAuth state is single-use.
     *
     * Delete it immediately after successful lookup so that
     * the same callback cannot be replayed.
     */
    await redis_1.default.del(stateKey);
    /*
     * Exchange Slack authorization code for access token.
     */
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(SLACK_ACCESS_URL, {
        method: "POST",
        headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            code,
            redirect_uri: redirectUri,
        }),
    });
    const data = (await response.json());
    if (!response.ok || !data.ok) {
        throw new Error(`Slack OAuth failed: ${data.error ?? "Unknown error"}`);
    }
    /*
     * Validate required Slack response fields.
     */
    if (!data.access_token ||
        !data.team?.id ||
        !data.team?.name) {
        throw new Error("Slack OAuth response is missing required information");
    }
    /*
     * The incoming-webhook scope should provide the
     * webhook URL.
     */
    const webhookUrl = data.incoming_webhook?.url ?? null;
    if (!webhookUrl) {
        throw new Error("Slack did not return an incoming webhook URL");
    }
    /*
     * Save/update Slack connection in PostgreSQL.
     */
    await db_1.default.query(`
    INSERT INTO slack_connections
      (
        user_id,
        team_id,
        team_name,
        access_token,
        webhook_url,
        updated_at
      )
    VALUES
      ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      team_id = EXCLUDED.team_id,
      team_name = EXCLUDED.team_name,
      access_token = EXCLUDED.access_token,
      webhook_url = EXCLUDED.webhook_url,
      updated_at = NOW()
    `, [
        userId,
        data.team.id,
        data.team.name,
        data.access_token,
        webhookUrl,
    ]);
    console.log("Slack OAuth connection saved successfully:", {
        userId,
        teamId: data.team.id,
        teamName: data.team.name,
    });
    return {
        teamId: data.team.id,
        teamName: data.team.name,
        channel: data.incoming_webhook?.channel ?? null,
    };
}
/**
 * Get Slack connection for a user
 */
async function getSlackConnection(userId) {
    const result = await db_1.default.query(`
    SELECT
      id,
      user_id,
      team_id,
      team_name,
      webhook_url,
      created_at,
      updated_at
    FROM slack_connections
    WHERE user_id = $1
    `, [userId]);
    return result.rows[0] ?? null;
}
/**
 * Send Slack notification when sender hourly
 * email limit is reached.
 */
async function notifySlackHourlyLimitReached(userId, senderEmail, hourlyLimit) {
    try {
        const connectionResult = await db_1.default.query(`
        SELECT webhook_url
        FROM slack_connections
        WHERE user_id = $1
        `, [userId]);
        const webhookUrl = connectionResult.rows[0]?.webhook_url;
        /*
         * Slack is not connected.
         *
         * Email processing must continue normally.
         */
        if (!webhookUrl) {
            console.log(`Slack not connected for user ${userId}. Skipping notification.`);
            return;
        }
        /*
         * Create an hourly bucket.
         *
         * This prevents multiple workers from sending
         * duplicate notifications during the same hour.
         */
        const hourBucket = Math.floor(Date.now() /
            (60 * 60 * 1000));
        const notificationKey = `slack:hourly-limit-notified:${userId}:${senderEmail}:${hourBucket}`;
        /*
         * NX means:
         * Only the first worker gets the lock.
         */
        const acquired = await redis_1.default.set(notificationKey, "1", "EX", 3700, "NX");
        /*
         * Another worker already sent the notification.
         */
        if (!acquired) {
            return;
        }
        const message = {
            text: `🚨 *Hourly email limit reached*\n\n` +
                `Sender: ${senderEmail}\n` +
                `Hourly limit: ${hourlyLimit}\n\n` +
                `Queued emails will continue in the next available hour.`,
        };
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });
        if (!response.ok) {
            console.error(`Slack notification failed: ${response.status}`);
            return;
        }
        console.log(`Slack hourly limit notification sent for ${senderEmail}`);
    }
    catch (error) {
        /*
         * Slack failures must NEVER crash
         * the email worker.
         */
        console.error("Slack notification error:", error);
    }
}
//# sourceMappingURL=slack.service.js.map