import crypto from "crypto";
import redis from "../config/redis";
import pool from "../config/db";

const SLACK_AUTHORIZE_URL =
  "https://slack.com/oauth/v2/authorize";

const SLACK_ACCESS_URL =
  "https://slack.com/api/oauth.v2.access";

const STATE_TTL_SECONDS = 600;

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;

  access_token?: string;

  team?: {
    id: string;
    name: string;
  };

  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
}

export async function createSlackOAuthUrl(
  userId: string
) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "Slack OAuth environment variables are missing"
    );
  }

  const state = crypto.randomBytes(32).toString("hex");

  await redis.set(
    `slack:oauth:state:${state}`,
    userId,
    "EX",
    STATE_TTL_SECONDS
  );

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "incoming-webhook",
    redirect_uri: redirectUri,
    state,
  });

  return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
}

export async function handleSlackOAuthCallback(
  code: string,
  state: string
) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Slack OAuth environment variables are missing"
    );
  }

  const stateKey = `slack:oauth:state:${state}`;

  const userId = await redis.get(stateKey);

  if (!userId) {
    throw new Error(
      "Invalid or expired Slack OAuth state"
    );
  }

  // OAuth state can only be used once.
  await redis.del(stateKey);

  const basicAuth = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const response = await fetch(SLACK_ACCESS_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type":
        "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data =
    (await response.json()) as SlackOAuthResponse;

  if (!response.ok || !data.ok) {
    throw new Error(
      `Slack OAuth failed: ${
        data.error ?? "Unknown error"
      }`
    );
  }

  if (
    !data.access_token ||
    !data.team?.id ||
    !data.team?.name
  ) {
    throw new Error(
      "Slack OAuth response is missing required information"
    );
  }

  const webhookUrl =
    data.incoming_webhook?.url ?? null;

  if (!webhookUrl) {
    throw new Error(
      "Slack did not return an incoming webhook URL"
    );
  }

  await pool.query(
    `
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
    `,
    [
      userId,
      data.team.id,
      data.team.name,
      data.access_token,
      webhookUrl,
    ]
  );

  return {
    teamId: data.team.id,
    teamName: data.team.name,
    channel:
      data.incoming_webhook?.channel ?? null,
  };
}

export async function getSlackConnection(
  userId: string
) {
  const result = await pool.query(
    `
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
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}
export async function notifySlackHourlyLimitReached(
  userId: string,
  senderEmail: string,
  hourlyLimit: number
) {
  try {
    const connectionResult = await pool.query(
      `
      SELECT webhook_url
      FROM slack_connections
      WHERE user_id = $1
      `,
      [userId]
    );

    const webhookUrl = connectionResult.rows[0]?.webhook_url;

    // Slack is not connected.
    // Do not break email processing.
    if (!webhookUrl) {
      console.log(
        `Slack not connected for user ${userId}. Skipping notification.`
      );
      return;
    }

    // Prevent duplicate notifications from multiple jobs/workers.
    const hourBucket = Math.floor(
      Date.now() / (60 * 60 * 1000)
    );

    const notificationKey =
      `slack:hourly-limit-notified:${userId}:${senderEmail}:${hourBucket}`;

    const acquired = await redis.set(
      notificationKey,
      "1",
      "EX",
      3700,
      "NX"
    );

    // Another worker already sent this notification.
    if (!acquired) {
      return;
    }

    const message = {
      text:
        `🚨 *Hourly email limit reached*\n\n` +
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
      console.error(
        `Slack notification failed: ${response.status}`
      );
      return;
    }

    console.log(
      `Slack hourly limit notification sent for ${senderEmail}`
    );
  } catch (error) {
    // Slack failure must never crash the email worker.
    console.error(
      "Slack notification error:",
      error
    );
  }
}