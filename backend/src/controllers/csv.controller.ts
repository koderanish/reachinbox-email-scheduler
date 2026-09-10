import { Request, Response } from "express";
import { parseRecipientsCsv } from "../services/csv.service";

export async function parseCsvController(
  req: Request,
  res: Response
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "CSV file is required",
      });
    }

    const csvText = req.file.buffer.toString("utf-8");

    const recipients = parseRecipientsCsv(csvText);

    return res.status(200).json({
      message: "CSV parsed successfully",
      count: recipients.length,
      recipients,
    });
  } catch (error) {
    console.error("CSV parsing error:", error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to parse CSV",
    });
  }
}