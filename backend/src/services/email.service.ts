import pool from "../config/db";

export async function getEmails(
  userId: string,
  status?: string
) {
  const values: string[] = [userId];

  let query = `
    SELECT
      e.id,
      e.campaign_id,
      e.recipient_email,
      e.recipient_name,
      e.subject,
      e.body,
      e.status,
      e.scheduled_at,
      e.sent_at,
      e.message_id,
      e.error_message,
      c.name AS campaign_name,
      s.email AS sender_email
    FROM emails e
    JOIN campaigns c
      ON e.campaign_id = c.id
    JOIN senders s
      ON c.sender_id = s.id
    WHERE c.user_id = $1
  `;

  if (status) {
    values.push(status);

    query += `
      AND e.status = $2
    `;
  }

  query += `
    ORDER BY e.scheduled_at DESC, e.id DESC
  `;

  const result = await pool.query(query, values);

  return result.rows;
}