import { Response } from "express";

import { createCampaign } from "../services/campaign.service";
import { parseRecipientsCsv } from "../services/csv.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function createCampaignController(
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

    const {
      senderId,
      name,
      subject,
      body,
      scheduledAt,
      recipients,
      delaySeconds,
    } = req.body;

    if (
      !senderId ||
      !name ||
      !subject ||
      !body ||
      !scheduledAt ||
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      return res.status(400).json({
        message: "Invalid campaign data",
      });
    }

    const parsedDelay =
      delaySeconds !== undefined
        ? Number(delaySeconds)
        : 2;

    if (
      !Number.isFinite(parsedDelay) ||
      parsedDelay < 0
    ) {
      return res.status(400).json({
        message:
          "delaySeconds must be a non-negative number",
      });
    }

    const campaign = await createCampaign({
      userId,
      senderId,
      name,
      subject,
      body,
      scheduledAt,
      recipients,
      delaySeconds: parsedDelay,
    });

    return res.status(201).json({
      message: "Campaign created successfully",
      campaign,
    });
  } catch (error) {
    console.error("Create campaign error:", error);

    return res.status(500).json({
      message: "Failed to create campaign",
    });
  }
}

/*
 * ---------------------------------------------------------
 * Create Campaign From CSV
 * ---------------------------------------------------------
 */

export async function createCampaignFromCsvController(
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

    /*
     * Check CSV file
     */

    if (!req.file) {
      return res.status(400).json({
        message: "CSV file is required",
      });
    }

    /*
     * Read form fields
     */

    const senderId =
      typeof req.body.senderId === "string"
        ? req.body.senderId.trim()
        : "";

    const name =
      typeof req.body.name === "string"
        ? req.body.name.trim()
        : "";

    const subject =
      typeof req.body.subject === "string"
        ? req.body.subject.trim()
        : "";

    const body =
      typeof req.body.body === "string"
        ? req.body.body
        : "";

    const scheduledAt =
      typeof req.body.scheduledAt === "string"
        ? req.body.scheduledAt.trim()
        : "";

    if (
      !senderId ||
      !name ||
      !subject ||
      !body ||
      !scheduledAt
    ) {
      return res.status(400).json({
        message:
          "senderId, name, subject, body and scheduledAt are required",
      });
    }

    /*
     * Parse delay
     */

    const parsedDelay =
      req.body.delaySeconds !== undefined
        ? Number(req.body.delaySeconds)
        : 2;

    if (
      !Number.isFinite(parsedDelay) ||
      parsedDelay < 0
    ) {
      return res.status(400).json({
        message:
          "delaySeconds must be a non-negative number",
      });
    }

    /*
     * Parse CSV
     */

    const csvText =
      req.file.buffer.toString("utf-8");

    const recipients =
      parseRecipientsCsv(csvText);

    if (recipients.length === 0) {
      return res.status(400).json({
        message: "CSV contains no valid recipients",
      });
    }

    /*
     * Create campaign
     */

    const campaign = await createCampaign({
      userId,
      senderId,
      name,
      subject,
      body,
      scheduledAt,
      recipients,
      delaySeconds: parsedDelay,
    });

    return res.status(201).json({
      message:
        "Campaign created successfully from CSV",
      recipientCount: recipients.length,
      campaign,
    });
  } catch (error) {
    console.error(
      "Create campaign from CSV error:",
      error
    );

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to create campaign from CSV",
    });
  }
}