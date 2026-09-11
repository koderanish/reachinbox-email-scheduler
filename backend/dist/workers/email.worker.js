"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const nodemailer_1 = __importDefault(require("nodemailer"));
const redis_1 = __importDefault(require("../config/redis"));
const db_1 = __importDefault(require("../config/db"));
const rate_limiter_service_1 = require("../services/rate-limiter.service");
const elasticsearch_service_1 = require("../services/elasticsearch.service");
const slack_service_1 = require("../services/slack.service");
const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 5);
const SMTP_RETRY_DELAY_SECONDS = Number(process.env.SMTP_RETRY_DELAY_SECONDS || 60);
const TRANSIENT_SMTP_CODES = new Set([
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ECONNRESET",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "ENOTFOUND",
    "EAI_AGAIN",
]);
function isTransientSmtpError(error) {
    const smtpError = error;
    if (smtpError.code &&
        TRANSIENT_SMTP_CODES.has(smtpError.code)) {
        return true;
    }
    const message = smtpError.message?.toLowerCase() || "";
    return [
        "timeout",
        "timed out",
        "connection refused",
        "connection reset",
        "socket hang up",
        "network error",
        "network is unreachable",
        "host is unreachable",
        "econnrefused",
        "econnreset",
        "etimedout",
        "enotfound",
        "eai_again",
    ].some((text) => message.includes(text));
}
const worker = new bullmq_1.Worker("email-scheduler", async (job, token) => {
    console.log(`Processing job ${job.id}`);
    const { emailId } = job.data;
    if (!emailId) {
        throw new Error("Job is missing emailId");
    }
    /*
     * ---------------------------------------------------------
     * 1. Load email + campaign + sender
     * ---------------------------------------------------------
     */
    const result = await db_1.default.query(`
      SELECT
        e.id,
        e.recipient_email,
        e.recipient_name,
        e.subject,
        e.body,
        e.status,
        e.attempts,

        c.user_id,

        s.id AS sender_id,
        s.email AS sender_email,
        s.smtp_host,
        s.smtp_port,
        s.smtp_user,
        s.smtp_password,
        s.hourly_limit,
        s.min_delay_seconds

      FROM emails e

      JOIN campaigns c
        ON e.campaign_id = c.id

      JOIN senders s
        ON c.sender_id = s.id

      WHERE e.id = $1
      `, [emailId]);
    if (result.rows.length === 0) {
        throw new Error(`Email ${emailId} not found`);
    }
    const email = result.rows[0];
    /*
     * ---------------------------------------------------------
     * 2. Idempotency checks
     * ---------------------------------------------------------
     */
    if (email.status === "sent") {
        console.log(`Email ${emailId} already sent. Skipping duplicate job.`);
        return {
            emailId,
            skipped: true,
            reason: "already_sent",
        };
    }
    if (email.status === "sending") {
        console.log(`Email ${emailId} is already being processed. Skipping.`);
        return {
            emailId,
            skipped: true,
            reason: "already_sending",
        };
    }
    if (email.status === "failed") {
        console.log(`Email ${emailId} is marked failed. Skipping automatic resend.`);
        return {
            emailId,
            skipped: true,
            reason: "already_failed",
        };
    }
    /*
     * ---------------------------------------------------------
     * 3. Rate limiting
     * ---------------------------------------------------------
     */
    const rateLimit = await (0, rate_limiter_service_1.acquireRateLimit)(email.sender_id, email.hourly_limit, email.min_delay_seconds);
    if (!rateLimit.allowed) {
        if (rateLimit.reason === "hourly_limit") {
            await (0, slack_service_1.notifySlackHourlyLimitReached)(email.user_id, email.sender_email, email.hourly_limit);
        }
        const retryAt = Date.now() +
            rateLimit.retryAfterMs;
        console.log(`Rate limit reached for sender ${email.sender_id}`);
        console.log(`Reason: ${rateLimit.reason}`);
        console.log(`Rescheduling job ${job.id} in ` +
            `${Math.ceil(rateLimit.retryAfterMs / 1000)} seconds`);
        await job.moveToDelayed(retryAt, token);
        throw new bullmq_1.DelayedError();
    }
    /*
     * ---------------------------------------------------------
     * 4. Atomically claim email
     * ---------------------------------------------------------
     */
    const claimResult = await db_1.default.query(`
      UPDATE emails
      SET
        status = 'sending',
        attempts = attempts + 1,
        updated_at = NOW()
      WHERE id = $1
        AND status = 'scheduled'
      RETURNING id, attempts
      `, [emailId]);
    if (claimResult.rowCount === 0) {
        console.log(`Email ${emailId} could not be claimed. ` +
            `Another worker may already be processing it.`);
        return {
            emailId,
            skipped: true,
            reason: "claim_failed",
        };
    }
    const attempt = claimResult.rows[0].attempts;
    console.log(`Email ${emailId} claimed successfully. ` +
        `Attempt #${attempt}`);
    /*
     * ---------------------------------------------------------
     * 5. Send email through Ethereal SMTP
     * ---------------------------------------------------------
     */
    let messageId;
    let previewUrl;
    try {
        const smtpPort = Number(email.smtp_port || 587);
        const transporter = nodemailer_1.default.createTransport({
            host: email.smtp_host ||
                "smtp.ethereal.email",
            port: smtpPort,
            /*
             * Ethereal SMTP port 587 uses STARTTLS.
             */
            secure: false,
            requireTLS: false,
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 30000,
            auth: {
                user: email.smtp_user,
                pass: email.smtp_password,
            },
        });
        console.log(`Connecting to Ethereal SMTP ` +
            `${email.smtp_host}:${smtpPort}`);
        const info = await transporter.sendMail({
            from: email.sender_email,
            to: email.recipient_email,
            subject: email.subject,
            text: email.body,
        });
        messageId = info.messageId;
        previewUrl =
            nodemailer_1.default.getTestMessageUrl(info);
        console.log(`Ethereal accepted email ${emailId}`);
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : "Unknown SMTP error";
        /*
         * -------------------------------------------------------
         * Temporary SMTP/network failure
         * -------------------------------------------------------
         *
         * Example:
         *
         * Railway
         *    ↓
         * SMTP port 587
         *    ↓
         * timeout
         *
         * DO NOT mark the email as permanently failed.
         */
        if (isTransientSmtpError(error)) {
            console.warn(`Temporary SMTP failure for email ${emailId}:`, errorMessage);
            await db_1.default.query(`
          UPDATE emails
          SET
            status = 'scheduled',
            error_message = $1,
            updated_at = NOW()
          WHERE id = $2
            AND status = 'sending'
          `, [
                `Temporary SMTP failure: ${errorMessage}`,
                emailId,
            ]);
            const retryDelayMs = SMTP_RETRY_DELAY_SECONDS *
                1000;
            const retryAt = Date.now() + retryDelayMs;
            console.log(`SMTP unavailable. ` +
                `Rescheduling job ${job.id} in ` +
                `${SMTP_RETRY_DELAY_SECONDS} seconds.`);
            await job.moveToDelayed(retryAt, token);
            throw new bullmq_1.DelayedError();
        }
        /*
         * -------------------------------------------------------
         * Permanent SMTP failure
         * -------------------------------------------------------
         */
        await db_1.default.query(`
        UPDATE emails
        SET
          status = 'failed',
          failed_at = NOW(),
          error_message = $1,
          updated_at = NOW()
        WHERE id = $2
          AND status = 'sending'
        `, [errorMessage, emailId]);
        console.error(`Email ${emailId} SMTP failed:`, errorMessage);
        throw error;
    }
    /*
     * ---------------------------------------------------------
     * 6. Mark email as sent
     * ---------------------------------------------------------
     */
    const sentResult = await db_1.default.query(`
      UPDATE emails
      SET
        status = 'sent',
        sent_at = NOW(),
        message_id = $1,
        preview_url = $2,
        error_message = NULL,
        failed_at = NULL,
        updated_at = NOW()
      WHERE id = $3
        AND status = 'sending'
      RETURNING id
      `, [
        messageId,
        previewUrl || null,
        emailId,
    ]);
    if (sentResult.rowCount === 0) {
        /*
         * SMTP accepted the email.
         *
         * NEVER resend it if the database update fails.
         */
        console.error(`Email ${emailId} was accepted by Ethereal, ` +
            `but database state could not be updated. ` +
            `NO RESEND will be attempted.`);
        return {
            emailId,
            messageId,
            previewUrl,
            warning: "smtp_sent_db_update_failed",
        };
    }
    console.log(`Email ${emailId} marked as sent in PostgreSQL.`);
    /*
     * ---------------------------------------------------------
     * 7. Elasticsearch indexing
     * ---------------------------------------------------------
     */
    try {
        await (0, elasticsearch_service_1.updateEmailIndex)(emailId, {
            status: "sent",
            sent_at: new Date(),
        });
        console.log(`Email ${emailId} indexed in Elasticsearch.`);
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : "Unknown Elasticsearch error";
        console.error(`Elasticsearch indexing failed for email ${emailId}:`, errorMessage);
        console.error(`Email ${emailId} remains SENT. ` +
            `No resend will be attempted.`);
    }
    /*
     * ---------------------------------------------------------
     * 8. Success
     * ---------------------------------------------------------
     */
    console.log("Email sent successfully!");
    console.log("Recipient:", email.recipient_email);
    console.log("Message ID:", messageId);
    console.log("Preview URL:", previewUrl);
    return {
        emailId,
        messageId,
        previewUrl,
    };
}, {
    connection: redis_1.default,
    concurrency: WORKER_CONCURRENCY,
});
/*
 * -------------------------------------------------------------
 * BullMQ events
 * -------------------------------------------------------------
 */
worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});
worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
});
worker.on("error", (error) => {
    console.error("BullMQ worker error:", error);
});
console.log(`Email worker started with concurrency ${WORKER_CONCURRENCY}`);
//# sourceMappingURL=email.worker.js.map