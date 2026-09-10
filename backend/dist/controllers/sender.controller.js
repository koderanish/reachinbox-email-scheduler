"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSenderController = createSenderController;
exports.getSendersController = getSendersController;
exports.getSenderController = getSenderController;
exports.updateSenderController = updateSenderController;
exports.deleteSenderController = deleteSenderController;
const sender_service_1 = require("../services/sender.service");
async function createSenderController(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const { name, email, smtpHost, smtpPort, smtpUser, smtpPassword, hourlyLimit, minDelaySeconds, } = req.body;
        if (!name ||
            !email ||
            !smtpHost ||
            !smtpPort ||
            !smtpUser ||
            !smtpPassword) {
            return res.status(400).json({
                message: "Missing required sender information",
            });
        }
        const parsedSmtpPort = Number(smtpPort);
        const parsedHourlyLimit = hourlyLimit !== undefined
            ? Number(hourlyLimit)
            : 100;
        const parsedMinDelay = minDelaySeconds !== undefined
            ? Number(minDelaySeconds)
            : 2;
        if (!Number.isFinite(parsedSmtpPort) ||
            parsedSmtpPort < 1 ||
            parsedSmtpPort > 65535) {
            return res.status(400).json({
                message: "smtpPort must be a valid port number",
            });
        }
        if (!Number.isFinite(parsedHourlyLimit) ||
            parsedHourlyLimit < 1) {
            return res.status(400).json({
                message: "hourlyLimit must be at least 1",
            });
        }
        if (!Number.isFinite(parsedMinDelay) ||
            parsedMinDelay < 0) {
            return res.status(400).json({
                message: "minDelaySeconds cannot be negative",
            });
        }
        const sender = await (0, sender_service_1.createSender)({
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
    }
    catch (error) {
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
async function getSendersController(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const senders = await (0, sender_service_1.getSenders)(userId);
        return res.json({
            senders,
        });
    }
    catch (error) {
        console.error("Get senders error:", error);
        return res.status(500).json({
            message: "Failed to fetch senders",
        });
    }
}
async function getSenderController(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const senderId = String(req.params.id);
        const sender = await (0, sender_service_1.getSenderById)(senderId, userId);
        if (!sender) {
            return res.status(404).json({
                message: "Sender not found",
            });
        }
        return res.json({
            sender,
        });
    }
    catch (error) {
        console.error("Get sender error:", error);
        return res.status(500).json({
            message: "Failed to fetch sender",
        });
    }
}
async function updateSenderController(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const { name, email, smtpHost, smtpPort, smtpUser, smtpPassword, hourlyLimit, minDelaySeconds, } = req.body;
        if (hourlyLimit !== undefined &&
            (!Number.isFinite(Number(hourlyLimit)) ||
                Number(hourlyLimit) < 1)) {
            return res.status(400).json({
                message: "hourlyLimit must be at least 1",
            });
        }
        if (minDelaySeconds !== undefined &&
            (!Number.isFinite(Number(minDelaySeconds)) ||
                Number(minDelaySeconds) < 0)) {
            return res.status(400).json({
                message: "minDelaySeconds cannot be negative",
            });
        }
        if (smtpPort !== undefined &&
            (!Number.isFinite(Number(smtpPort)) ||
                Number(smtpPort) < 1 ||
                Number(smtpPort) > 65535)) {
            return res.status(400).json({
                message: "smtpPort must be a valid port number",
            });
        }
        const senderId = String(req.params.id);
        const sender = await (0, sender_service_1.updateSender)(senderId, userId, {
            name,
            email,
            smtpHost,
            smtpPort: smtpPort !== undefined
                ? Number(smtpPort)
                : undefined,
            smtpUser,
            smtpPassword,
            hourlyLimit: hourlyLimit !== undefined
                ? Number(hourlyLimit)
                : undefined,
            minDelaySeconds: minDelaySeconds !== undefined
                ? Number(minDelaySeconds)
                : undefined,
        });
        if (!sender) {
            return res.status(404).json({
                message: "Sender not found",
            });
        }
        return res.json({
            message: "Sender updated successfully",
            sender,
        });
    }
    catch (error) {
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
async function deleteSenderController(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const senderId = String(req.params.id);
        const sender = await (0, sender_service_1.deleteSender)(senderId, userId);
        if (!sender) {
            return res.status(404).json({
                message: "Sender not found",
            });
        }
        return res.json({
            message: "Sender deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete sender error:", error);
        return res.status(500).json({
            message: "Failed to delete sender",
        });
    }
}
//# sourceMappingURL=sender.controller.js.map