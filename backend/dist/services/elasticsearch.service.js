"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmailIndex = createEmailIndex;
exports.indexEmail = indexEmail;
exports.updateEmailIndex = updateEmailIndex;
const elasticsearch_1 = __importDefault(require("../config/elasticsearch"));
const INDEX_NAME = "emails";
async function createEmailIndex() {
    const exists = await elasticsearch_1.default.indices.exists({
        index: INDEX_NAME,
    });
    if (exists) {
        return;
    }
    await elasticsearch_1.default.indices.create({
        index: INDEX_NAME,
        mappings: {
            properties: {
                email_id: { type: "keyword" },
                user_id: { type: "keyword" },
                campaign_id: { type: "keyword" },
                recipient_email: { type: "keyword" },
                recipient_name: { type: "text" },
                subject: { type: "text" },
                body: { type: "text" },
                status: { type: "keyword" },
                scheduled_at: { type: "date" },
                sent_at: { type: "date" },
            },
        },
    });
    console.log(`Elasticsearch index "${INDEX_NAME}" created`);
}
async function indexEmail(email) {
    await elasticsearch_1.default.index({
        index: INDEX_NAME,
        id: email.id,
        document: {
            email_id: email.id,
            user_id: email.user_id,
            campaign_id: email.campaign_id,
            recipient_email: email.recipient_email,
            recipient_name: email.recipient_name ?? null,
            subject: email.subject,
            body: email.body,
            status: email.status,
            scheduled_at: email.scheduled_at,
            sent_at: email.sent_at ?? null,
        },
        refresh: "wait_for",
    });
}
async function updateEmailIndex(emailId, data) {
    try {
        await elasticsearch_1.default.update({
            index: INDEX_NAME,
            id: emailId,
            doc: data,
            refresh: "wait_for",
        });
    }
    catch (error) {
        if (error?.statusCode === 404) {
            console.log(`Elasticsearch document ${emailId} not found. Skipping index update.`);
            return;
        }
        throw error;
    }
}
//# sourceMappingURL=elasticsearch.service.js.map