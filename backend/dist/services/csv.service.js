"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRecipientsCsv = parseRecipientsCsv;
const sync_1 = require("csv-parse/sync");
function parseRecipientsCsv(csvText) {
    if (!csvText || !csvText.trim()) {
        throw new Error("CSV file is empty");
    }
    const rows = (0, sync_1.parse)(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });
    if (rows.length === 0) {
        throw new Error("CSV file contains no recipients");
    }
    const recipients = [];
    for (const row of rows) {
        const email = row.email?.trim() ||
            row.Email?.trim() ||
            row.EMAIL?.trim();
        const name = row.name?.trim() ||
            row.Name?.trim() ||
            row.NAME?.trim();
        if (!email) {
            continue;
        }
        if (!isValidEmail(email)) {
            throw new Error(`Invalid email address: ${email}`);
        }
        recipients.push({
            email,
            ...(name ? { name } : {}),
        });
    }
    if (recipients.length === 0) {
        throw new Error("No valid email addresses found in CSV");
    }
    return recipients;
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
//# sourceMappingURL=csv.service.js.map