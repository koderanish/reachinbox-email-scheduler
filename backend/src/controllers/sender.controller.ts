import { Request, Response } from "express";

import {
  createSender,
  getSenders,
  getSenderById,
  updateSender,
  deleteSender,
} from "../services/sender.service";

import { AuthenticatedRequest } from "../middleware/auth.middleware";

export async function createSenderController(
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
      name,
      email,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      hourlyLimit,
      minDelaySeconds,
    } = req.body;

    if (
      !name ||
      !email ||
      !smtpHost ||
      !smtpPort ||
      !smtpUser ||
      !smtpPassword
    ) {
      return res.status(400).json({
        message: "Missing required sender information",
      });
    }

    const parsedSmtpPort = Number(smtpPort);

    const parsedHourlyLimit =
      hourlyLimit !== undefined
        ? Number(hourlyLimit)
        : 100;

    const parsedMinDelay =
      minDelaySeconds !== undefined
        ? Number(minDelaySeconds)
        : 2;

    if (
      !Number.isFinite(parsedSmtpPort) ||
      parsedSmtpPort < 1 ||
      parsedSmtpPort > 65535
    ) {
      return res.status(400).json({
        message: "smtpPort must be a valid port number",
      });
    }

    if (
      !Number.isFinite(parsedHourlyLimit) ||
      parsedHourlyLimit < 1
    ) {
      return res.status(400).json({
        message: "hourlyLimit must be at least 1",
      });
    }

    if (
      !Number.isFinite(parsedMinDelay) ||
      parsedMinDelay < 0
    ) {
      return res.status(400).json({
        message: "minDelaySeconds cannot be negative",
      });
    }

    const sender = await createSender({
      userId,
      name,
      email,
      smtpHost,
      smtpPort: parsedSmtpPort,
      smtpUser,
      smtpPassword,
      hourlyLimit: parsedHourlyLimit,
      minDelaySeconds: parsedMinDelay,
    });

    return res.status(201).json({
      message: "Sender created successfully",
      sender,
    });
  } catch (error: any) {
    console.error("Create sender error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Sender email already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create sender",
    });
  }
}

export async function getSendersController(
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

    const senders = await getSenders(userId);

    return res.json({
      senders,
    });
  } catch (error) {
    console.error("Get senders error:", error);

    return res.status(500).json({
      message: "Failed to fetch senders",
    });
  }
}

export async function getSenderController(
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

    const senderId = String(req.params.id);

    const sender = await getSenderById(
      senderId,
      userId
    );

    if (!sender) {
      return res.status(404).json({
        message: "Sender not found",
      });
    }

    return res.json({
      sender,
    });
  } catch (error) {
    console.error("Get sender error:", error);

    return res.status(500).json({
      message: "Failed to fetch sender",
    });
  }
}

export async function updateSenderController(
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
      name,
      email,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      hourlyLimit,
      minDelaySeconds,
    } = req.body;

    if (
      hourlyLimit !== undefined &&
      (
        !Number.isFinite(Number(hourlyLimit)) ||
        Number(hourlyLimit) < 1
      )
    ) {
      return res.status(400).json({
        message: "hourlyLimit must be at least 1",
      });
    }

    if (
      minDelaySeconds !== undefined &&
      (
        !Number.isFinite(Number(minDelaySeconds)) ||
        Number(minDelaySeconds) < 0
      )
    ) {
      return res.status(400).json({
        message: "minDelaySeconds cannot be negative",
      });
    }

    if (
      smtpPort !== undefined &&
      (
        !Number.isFinite(Number(smtpPort)) ||
        Number(smtpPort) < 1 ||
        Number(smtpPort) > 65535
      )
    ) {
      return res.status(400).json({
        message: "smtpPort must be a valid port number",
      });
    }

    const senderId = String(req.params.id);

    const sender = await updateSender(
      senderId,
      userId,
      {
        name,
        email,
        smtpHost,
        smtpPort:
          smtpPort !== undefined
            ? Number(smtpPort)
            : undefined,
        smtpUser,
        smtpPassword,
        hourlyLimit:
          hourlyLimit !== undefined
            ? Number(hourlyLimit)
            : undefined,
        minDelaySeconds:
          minDelaySeconds !== undefined
            ? Number(minDelaySeconds)
            : undefined,
      }
    );

    if (!sender) {
      return res.status(404).json({
        message: "Sender not found",
      });
    }

    return res.json({
      message: "Sender updated successfully",
      sender,
    });
  } catch (error: any) {
    console.error("Update sender error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Sender email already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update sender",
    });
  }
}

export async function deleteSenderController(
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

    const senderId = String(req.params.id);

    const sender = await deleteSender(
      senderId,
      userId
    );

    if (!sender) {
      return res.status(404).json({
        message: "Sender not found",
      });
    }

    return res.json({
      message: "Sender deleted successfully",
    });
  } catch (error) {
    console.error("Delete sender error:", error);

    return res.status(500).json({
      message: "Failed to delete sender",
    });
  }
}