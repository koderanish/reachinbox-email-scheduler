"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGoogleToken = verifyGoogleToken;
exports.findOrCreateGoogleUser = findOrCreateGoogleUser;
const google_auth_library_1 = require("google-auth-library");
const db_1 = __importDefault(require("../config/db"));
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
async function verifyGoogleToken(credential) {
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error("GOOGLE_CLIENT_ID is not configured");
    }
    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload ||
        !payload.sub ||
        !payload.email) {
        throw new Error("Invalid Google account information");
    }
    return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
    };
}
async function findOrCreateGoogleUser(googleUser) {
    const existingByGoogleId = await db_1.default.query(`
    SELECT *
    FROM users
    WHERE google_id = $1
    `, [googleUser.googleId]);
    if (existingByGoogleId.rows.length > 0) {
        return existingByGoogleId.rows[0];
    }
    const existingByEmail = await db_1.default.query(`
    SELECT *
    FROM users
    WHERE email = $1
    `, [googleUser.email]);
    if (existingByEmail.rows.length > 0) {
        const result = await db_1.default.query(`
      UPDATE users
      SET
        google_id = $1,
        name = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `, [
            googleUser.googleId,
            googleUser.name,
            existingByEmail.rows[0].id,
        ]);
        return result.rows[0];
    }
    const result = await db_1.default.query(`
    INSERT INTO users
      (
        email,
        name,
        google_id
      )
    VALUES
      ($1, $2, $3)
    RETURNING *
    `, [
        googleUser.email,
        googleUser.name,
        googleUser.googleId,
    ]);
    return result.rows[0];
}
//# sourceMappingURL=google-auth.service.js.map