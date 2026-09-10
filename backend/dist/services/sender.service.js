"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSender = createSender;
exports.getSenders = getSenders;
exports.getSenderById = getSenderById;
exports.updateSender = updateSender;
exports.deleteSender = deleteSender;
const db_1 = __importDefault(require("../config/db"));
async function createSender(input) {
    const result = await db_1.default.query(`
    INSERT INTO senders
      (
        user_id,
        name,
        email,
        smtp_host,
        smtp_port,
        smtp_user,
        smtp_password,
        hourly_limit,
        min_delay_seconds
      )
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING
      id,
      user_id,
      name,
      email,
      smtp_host,
      smtp_port,
      smtp_user,
      hourly_limit,
      min_delay_seconds,
      created_at,
      updated_at
    `, [
        input.userId,
        input.name,
        input.email,
        input.smtpHost,
        input.smtpPort,
        input.smtpUser,
        input.smtpPassword,
        input.hourlyLimit,
        input.minDelaySeconds,
    ]);
    return result.rows[0];
}
async function getSenders(userId) {
    const result = await db_1.default.query(`
    SELECT
      id,
      user_id,
      name,
      email,
      smtp_host,
      smtp_port,
      smtp_user,
      hourly_limit,
      min_delay_seconds,
      created_at,
      updated_at
    FROM senders
    WHERE user_id = $1
    ORDER BY created_at DESC
    `, [userId]);
    return result.rows;
}
async function getSenderById(id, userId) {
    const result = await db_1.default.query(`
    SELECT
      id,
      user_id,
      name,
      email,
      smtp_host,
      smtp_port,
      smtp_user,
      hourly_limit,
      min_delay_seconds,
      created_at,
      updated_at
    FROM senders
    WHERE id = $1
      AND user_id = $2
    `, [id, userId]);
    return result.rows[0] ?? null;
}
async function updateSender(id, userId, input) {
    const result = await db_1.default.query(`
    UPDATE senders
    SET
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      smtp_host = COALESCE($3, smtp_host),
      smtp_port = COALESCE($4, smtp_port),
      smtp_user = COALESCE($5, smtp_user),
      smtp_password = COALESCE($6, smtp_password),
      hourly_limit = COALESCE($7, hourly_limit),
      min_delay_seconds = COALESCE($8, min_delay_seconds),
      updated_at = NOW()
    WHERE id = $9
      AND user_id = $10
    RETURNING
      id,
      user_id,
      name,
      email,
      smtp_host,
      smtp_port,
      smtp_user,
      hourly_limit,
      min_delay_seconds,
      created_at,
      updated_at
    `, [
        input.name ?? null,
        input.email ?? null,
        input.smtpHost ?? null,
        input.smtpPort ?? null,
        input.smtpUser ?? null,
        input.smtpPassword ?? null,
        input.hourlyLimit ?? null,
        input.minDelaySeconds ?? null,
        id,
        userId,
    ]);
    return result.rows[0] ?? null;
}
async function deleteSender(id, userId) {
    const result = await db_1.default.query(`
    DELETE FROM senders
    WHERE id = $1
      AND user_id = $2
    RETURNING id
    `, [id, userId]);
    return result.rows[0] ?? null;
}
//# sourceMappingURL=sender.service.js.map