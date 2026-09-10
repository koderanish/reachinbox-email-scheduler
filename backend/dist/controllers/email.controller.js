"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailsController = getEmailsController;
exports.searchEmails = searchEmails;
const elasticsearch_1 = __importDefault(require("../config/elasticsearch"));
const email_service_1 = require("../services/email.service");
const INDEX_NAME = "emails";
const VALID_STATUSES = [
    "scheduled",
    "sending",
    "sent",
    "failed",
];
async function getEmailsController(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const status = typeof req.query.status === "string"
            ? req.query.status.trim()
            : undefined;
        if (status &&
            !VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                message: "status must be scheduled, sending, sent, or failed",
            });
        }
        const emails = await (0, email_service_1.getEmails)(userId, status);
        return res.status(200).json({
            count: emails.length,
            emails,
        });
    }
    catch (error) {
        console.error("Get emails error:", error);
        return res.status(500).json({
            message: "Failed to fetch emails",
        });
    }
}
async function searchEmails(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const q = typeof req.query.q === "string"
            ? req.query.q.trim()
            : "";
        const status = typeof req.query.status === "string"
            ? req.query.status.trim()
            : "";
        if (status &&
            !VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                message: "status must be scheduled, sending, sent, or failed",
            });
        }
        const filters = [
            {
                term: {
                    user_id: userId,
                },
            },
        ];
        if (status) {
            filters.push({
                term: {
                    status,
                },
            });
        }
        const searchQuery = {
            bool: {
                must: q
                    ? [
                        {
                            multi_match: {
                                query: q,
                                fields: [
                                    "recipient_email",
                                    "recipient_name",
                                    "subject",
                                    "body",
                                ],
                            },
                        },
                    ]
                    : [
                        {
                            match_all: {},
                        },
                    ],
                filter: filters,
            },
        };
        const result = await elasticsearch_1.default.search({
            index: INDEX_NAME,
            body: {
                query: searchQuery,
                sort: [
                    {
                        scheduled_at: {
                            order: "desc",
                        },
                    },
                ],
            },
        });
        const hits = result.body.hits.hits;
        const emails = hits.map((hit) => ({
            id: hit._id,
            ...hit._source,
        }));
        return res.status(200).json({
            total: result.body.hits.total,
            emails,
        });
    }
    catch (error) {
        console.error("Email search failed:", error);
        return res.status(500).json({
            message: "Failed to search emails",
        });
    }
}
//# sourceMappingURL=email.controller.js.map