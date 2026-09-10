import pool from "../config/db";

interface CreateSenderInput {
  userId: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  hourlyLimit: number;
  minDelaySeconds: number;
}

interface UpdateSenderInput {
  name?: string;
  email?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  hourlyLimit?: number;
  minDelaySeconds?: number;
}

export async function createSender(
  input: CreateSenderInput
) {
  const result = await pool.query(
    `
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
    `,
    [
      input.userId,
      input.name,
      input.email,
      input.smtpHost,
      input.smtpPort,
      input.smtpUser,
      input.smtpPassword,
      input.hourlyLimit,
      input.minDelaySeconds,
    ]
  );

  return result.rows[0];
}

export async function getSenders(
  userId: string
) {
  const result = await pool.query(
    `
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
    `,
    [userId]
  );

  return result.rows;
}

export async function getSenderById(
  id: string,
  userId: string
) {
  const result = await pool.query(
    `
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
    `,
    [id, userId]
  );

  return result.rows[0] ?? null;
}

export async function updateSender(
  id: string,
  userId: string,
  input: UpdateSenderInput
) {
  const result = await pool.query(
    `
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
    `,
    [
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
    ]
  );

  return result.rows[0] ?? null;
}

export async function deleteSender(
  id: string,
  userId: string
) {
  const result = await pool.query(
    `
    DELETE FROM senders
    WHERE id = $1
      AND user_id = $2
    RETURNING id
    `,
    [id, userId]
  );

  return result.rows[0] ?? null;
}