import { parse } from "csv-parse/sync";

export interface CsvRecipient {
  email: string;
  name?: string;
}

export function parseRecipientsCsv(csvText: string): CsvRecipient[] {
  if (!csvText || !csvText.trim()) {
    throw new Error("CSV file is empty");
  }

  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (rows.length === 0) {
    throw new Error("CSV file contains no recipients");
  }

  const recipients: CsvRecipient[] = [];

  for (const row of rows) {
    const email =
      row.email?.trim() ||
      row.Email?.trim() ||
      row.EMAIL?.trim();

    const name =
      row.name?.trim() ||
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}