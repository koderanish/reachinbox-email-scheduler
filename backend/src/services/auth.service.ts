import jwt from "jsonwebtoken";

interface AuthTokenPayload {
  userId: string;
}

const JWT_EXPIRES_IN = "7d";

export function createAuthToken(userId: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId,
    } satisfies AuthTokenPayload,
    secret,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

export function verifyAuthToken(
  token: string
): AuthTokenPayload {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const decoded = jwt.verify(token, secret);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "string"
  ) {
    throw new Error("Invalid authentication token");
  }

  return {
    userId: decoded.userId,
  };
}