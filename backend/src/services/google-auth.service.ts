import { OAuth2Client } from "google-auth-library";
import pool from "../config/db";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
}

export async function verifyGoogleToken(
  credential: string
): Promise<GoogleUser> {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error(
      "GOOGLE_CLIENT_ID is not configured"
    );
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (
    !payload ||
    !payload.sub ||
    !payload.email
  ) {
    throw new Error(
      "Invalid Google account information"
    );
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
  };
}

export async function findOrCreateGoogleUser(
  googleUser: GoogleUser
) {
  const existingByGoogleId = await pool.query(
    `
    SELECT *
    FROM users
    WHERE google_id = $1
    `,
    [googleUser.googleId]
  );

  if (existingByGoogleId.rows.length > 0) {
    return existingByGoogleId.rows[0];
  }

  const existingByEmail = await pool.query(
    `
    SELECT *
    FROM users
    WHERE email = $1
    `,
    [googleUser.email]
  );

  if (existingByEmail.rows.length > 0) {
    const result = await pool.query(
      `
      UPDATE users
      SET
        google_id = $1,
        name = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [
        googleUser.googleId,
        googleUser.name,
        existingByEmail.rows[0].id,
      ]
    );

    return result.rows[0];
  }

  const result = await pool.query(
    `
    INSERT INTO users
      (
        email,
        name,
        google_id
      )
    VALUES
      ($1, $2, $3)
    RETURNING *
    `,
    [
      googleUser.email,
      googleUser.name,
      googleUser.googleId,
    ]
  );

  return result.rows[0];
}