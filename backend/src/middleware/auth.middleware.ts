import {
  Request,
  Response,
  NextFunction,
} from "express";

import { verifyAuthToken } from "../services/auth.service";

export interface AuthenticatedRequest
  extends Request {
  user?: {
    id: string;
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {

    let token = req.cookies?.auth_token;

    if (!token) {
      const authHeader =
        req.headers.authorization;

      if (
        authHeader?.startsWith("Bearer ")
      ) {
        token = authHeader
          .substring(7)
          .trim();
      }
    }

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const payload =
      verifyAuthToken(token);

    req.user = {
      id: payload.userId,
    };

    next();
  } catch (error) {
    console.error(
      "Authentication failed:",
      error
    );

    return res.status(401).json({
      message:
        "Invalid or expired authentication token",
    });
  }
}