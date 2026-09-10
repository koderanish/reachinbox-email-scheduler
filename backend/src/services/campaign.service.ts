import pool from "../config/db";
import { scheduleCampaignEmails } from "./email-scheduler.service";
import { indexEmail } from "./elasticsearch.service";

interface CreateCampaignInput {
  userId: string;
  senderId: string;
  name: string;
  subject: string;
  body: string;
  scheduledAt: string;
  recipients: {
    email: string;
    name?: string;
  }[];
  delaySeconds?: number;
}

export async function createCampaign(
  input: CreateCampaignInput
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Validate scheduled time
     */

    const startTime = new Date(input.scheduledAt);

    if (Number.isNaN(startTime.getTime())) {
      throw new Error("Invalid scheduledAt date");
    }

    /*
     * Validate delay
     */

    const delaySeconds = input.delaySeconds ?? 2;

    if (
      !Number.isFinite(delaySeconds) ||
      delaySeconds < 0
    ) {
      throw new Error(
        "delaySeconds must be a non-negative number"
      );
    }

    /*
     * Verify sender belongs to authenticated user
     */

    const senderResult = await client.query(
      `
      SELECT id
      FROM senders
      WHERE id = $1
        AND user_id = $2
      `,
      [input.senderId, input.userId]
    );

    if (senderResult.rows.length === 0) {
      throw new Error(
        "Sender not found or does not belong to the authenticated user"
      );
    }

    /*
     * Create campaign
     */

    const campaignResult = await client.query(
      `
      INSERT INTO campaigns
        (
          user_id,
          sender_id,
          name,
          subject,
          body,
          scheduled_at
        )
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        input.userId,
        input.senderId,
        input.name,
        input.subject,
        input.body,
        input.scheduledAt,
      ]
    );

    const campaign = campaignResult.rows[0];

    /*
     * Create emails
     */

    const createdEmails = [];

    for (
      let index = 0;
      index < input.recipients.length;
      index++
    ) {
      const recipient = input.recipients[index];

      const scheduledAt = new Date(
        startTime.getTime() +
          index * delaySeconds * 1000
      );

      const emailResult = await client.query(
        `
        INSERT INTO emails
          (
            campaign_id,
            recipient_email,
            recipient_name,
            subject,
            body,
            scheduled_at
          )
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          campaign.id,
          recipient.email,
          recipient.name ?? null,
          input.subject,
          input.body,
          scheduledAt,
        ]
      );

      createdEmails.push(emailResult.rows[0]);
    }

    await client.query("COMMIT");

    /*
     * Schedule emails in BullMQ
     */

    await scheduleCampaignEmails(campaign.id);

    /*
     * Index scheduled emails in Elasticsearch
     */

    for (const email of createdEmails) {
      await indexEmail({
        id: email.id,
        user_id: input.userId,
        campaign_id: email.campaign_id,
        recipient_email: email.recipient_email,
        recipient_name: email.recipient_name,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduled_at: email.scheduled_at,
        sent_at: email.sent_at,
      });
    }

    return campaign;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}