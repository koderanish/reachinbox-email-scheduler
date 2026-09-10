import pool from "../config/db";
import { indexEmail } from "./elasticsearch.service";

export async function backfillEmailsToElasticsearch() {
  const result = await pool.query(`
    SELECT
      e.id,
      c.user_id,
      e.campaign_id,
      e.recipient_email,
      e.recipient_name,
      e.subject,
      e.body,
      e.status,
      e.scheduled_at,
      e.sent_at
    FROM emails e
    JOIN campaigns c
      ON e.campaign_id = c.id
    ORDER BY e.created_at ASC
  `);

  console.log(
    `Found ${result.rows.length} emails to sync with Elasticsearch.`
  );

  let synced = 0;

  for (const email of result.rows) {
    await indexEmail({
      id: email.id,
      user_id: email.user_id,
      campaign_id: email.campaign_id,
      recipient_email: email.recipient_email,
      recipient_name: email.recipient_name,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduled_at: email.scheduled_at,
      sent_at: email.sent_at,
    });

    synced++;
  }

  console.log(
    `Elasticsearch backfill completed. Synced ${synced} emails.`
  );

  return synced;
}