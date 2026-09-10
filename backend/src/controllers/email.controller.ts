import { Response } from "express";
import elasticsearch from "../config/elasticsearch";
import { getEmails } from "../services/email.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

const INDEX_NAME = "emails";

const VALID_STATUSES = [
  "scheduled",
  "sending",
  "sent",
  "failed",
];

export async function getEmailsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const status =
      typeof req.query.status === "string"
        ? req.query.status.trim()
        : undefined;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message:
          "status must be scheduled, sending, sent, or failed",
      });
    }

    const emails = await getEmails(userId, status);

    return res.status(200).json({
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error("Get emails error:", error);

    return res.status(500).json({
      message: "Failed to fetch emails",
    });
  }
}

export async function searchEmails(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const q =
      typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status.trim()
        : "";

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message:
          "status must be scheduled, sending, sent, or failed",
      });
    }

    const filters: any[] = [
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

    const result = await elasticsearch.search({
      index: INDEX_NAME,
      query: searchQuery,
      sort: [
        {
          scheduled_at: {
            order: "desc",
          },
        },
      ],
    });

    const hits = result.hits.hits;

    const emails = hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source,
    }));

    return res.status(200).json({
      total: result.hits.total,
      emails,
    });
  } catch (error) {
    console.error(
      "Email search failed:",
      error
    );

    return res.status(500).json({
      message: "Failed to search emails",
    });
  }
}