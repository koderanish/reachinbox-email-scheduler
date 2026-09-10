"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCampaignEmails = scheduleCampaignEmails;
exports.reconcileScheduledEmails = reconcileScheduledEmails;
const db_1 = __importDefault(require("../config/db"));
const email_queue_1 = require("../queues/email.queue");
async function scheduleCampaignEmails(campaignId) {
    const result = await db_1.default.query(`
    SELECT
      id,
      recipient_email,
      subject,
      body,
      scheduled_at,
      campaign_id
    FROM emails
    WHERE campaign_id = $1
      AND status = 'scheduled'
    ORDER BY scheduled_at ASC, id ASC
    `, [campaignId]);
    for (const email of result.rows) {
        await scheduleEmailJob(email.id, email.scheduled_at);
    }
    return result.rows.length;
}
async function scheduleEmailJob(emailId, scheduledAt) {
    const delay = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
    await email_queue_1.emailQueue.add("send-email", {
        emailId,
    }, {
        jobId: emailId,
        delay,
        removeOnComplete: false,
        removeOnFail: false,
    });
}
/**
 * Reconcile PostgreSQL scheduled emails with BullMQ.
 *
 * PostgreSQL is treated as the source of truth.
 * This makes scheduled emails recoverable after
 * an API/worker restart.
 */
async function reconcileScheduledEmails() {
    const result = await db_1.default.query(`
    SELECT
      id,
      scheduled_at
    FROM emails
    WHERE status = 'scheduled'
    ORDER BY scheduled_at ASC, id ASC
    `);
    let scheduled = 0;
    for (const email of result.rows) {
        try {
            await scheduleEmailJob(email.id, email.scheduled_at);
            scheduled++;
        }
        catch (error) {
            // A job with the same deterministic jobId may
            // already exist in BullMQ. That's okay.
            const message = error instanceof Error
                ? error.message
                : "Unknown error";
            if (message.includes("Job") &&
                message.includes("already exists")) {
                continue;
            }
            console.error(`Failed to reconcile email ${email.id}:`, error);
        }
    }
    console.log(`Scheduler reconciliation completed. ` +
        `${scheduled} scheduled emails checked.`);
    return scheduled;
}
//# sourceMappingURL=email-scheduler.service.js.map