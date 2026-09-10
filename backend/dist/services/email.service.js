"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmails = getEmails;
const db_1 = __importDefault(require("../config/db"));
async function getEmails(userId, status) {
    const values = [userId];
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
    const result = await db_1.default.query(query, values);
    return result.rows;
}
//# sourceMappingURL=email.service.js.map