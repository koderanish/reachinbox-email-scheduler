"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvController = parseCsvController;
const csv_service_1 = require("../services/csv.service");
async function parseCsvController(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "CSV file is required",
            });
        }
        const csvText = req.file.buffer.toString("utf-8");
        const recipients = (0, csv_service_1.parseRecipientsCsv)(csvText);
        return res.status(200).json({
            message: "CSV parsed successfully",
            count: recipients.length,
            recipients,
        });
    }
    catch (error) {
        console.error("CSV parsing error:", error);
        return res.status(400).json({
            message: error instanceof Error
                ? error.message
                : "Failed to parse CSV",
        });
    }
}
//# sourceMappingURL=csv.controller.js.map