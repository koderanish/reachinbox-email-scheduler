import { Request, Response } from "express";

import {
  verifyGoogleToken,
  findOrCreateGoogleUser,
} from "../services/google-auth.service";

import { createAuthToken } from "../services/auth.service";

import pool from "../config/db";

import { AuthenticatedRequest } from "../middleware/auth.middleware";

const AUTH_COOKIE_NAME = "auth_token";

/*
 * Cookie transport must match how the request actually arrived:
 * browsers reject Secure cookies over plain HTTP, and require
 * Secure for SameSite=None. Behind an HTTPS proxy (Vercel rewrite,
 * Tailscale Funnel) X-Forwarded-Proto carries the real scheme.
 * Explicit env vars still win when set.
 */
function getCookieFlags(req: Request): {
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
} {
  if (
    process.env.COOKIE_SECURE ||
    process.env.COOKIE_SAMESITE
  ) {
    const secure =
      process.env.COOKIE_SECURE === "true";

    return {
      secure,
      sameSite:
        (process.env.COOKIE_SAMESITE as
          | "lax"
          | "strict"
          | "none") ||
        (secure ? "none" : "lax"),
    };
  }

  const isHttps =
    req.secure ||
    req.headers["x-forwarded-proto"] === "https";

  return {
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
  };
}

export async function googleLogin(
  req: Request,
  res: Response
) {
  try {
    const { credential } = req.body;

    if (
      typeof credential !== "string" ||
      !credential.trim()
    ) {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    // Verify Google ID token
    const googleUser =
      await verifyGoogleToken(credential);

    // Find existing user or create a new user
    const user =
      await findOrCreateGoogleUser(googleUser);

    // Create application JWT
    const token = createAuthToken(user.id);

    const cookieFlags = getCookieFlags(req);

    /*
     * Store JWT in an HTTP-only cookie.
     */
    res.cookie(
      AUTH_COOKIE_NAME,
      token,
      {
        httpOnly: true,

        secure: cookieFlags.secure,

        sameSite: cookieFlags.sameSite,

        maxAge:
          7 * 24 * 60 * 60 * 1000,

        path: "/",
      }
    );

    return res.status(200).json({
      message: "Google login successful",

      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error(
      "Google login failed:",
      error
    );

    return res.status(401).json({
      message: "Google authentication failed",
    });
  }
}

/*
 * ---------------------------------------------------------
 * Get Current Authenticated User
 * ---------------------------------------------------------
 */

export async function getCurrentUser(
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

    const result = await pool.query(
      `
      SELECT
        id,
        email,
        name,
        created_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch current user",
    });
  }
}

export function logout(req: Request, res: Response) {
  const cookieFlags = getCookieFlags(req);

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieFlags.secure,
    sameSite: cookieFlags.sameSite,
    path: "/",
  });

  return res.status(200).json({
    message: "Logged out successfully",
  });
}