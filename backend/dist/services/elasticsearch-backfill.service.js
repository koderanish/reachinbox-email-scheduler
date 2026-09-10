"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillEmailsToElasticsearch = backfillEmailsToElasticsearch;
const db_1 = __importDefault(require("../config/db"));
const elasticsearch_service_1 = require("./elasticsearch.service");
async function backfillEmailsToElasticsearch() {
    const result = await db_1.default.query(`
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
    console.log(`Found ${result.rows.length} emails to sync with Elasticsearch.`);
    let synced = 0;
    for (const email of result.rows) {
        await (0, elasticsearch_service_1.indexEmail)({
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
    console.log(`Elasticsearch backfill completed. Synced ${synced} emails.`);
    return synced;
}
//# sourceMappingURL=elasticsearch-backfill.service.js.map