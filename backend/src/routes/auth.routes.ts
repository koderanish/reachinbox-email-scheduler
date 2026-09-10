import { Router } from "express";

import {
  googleLogin,
  getCurrentUser,
  logout,
} from "../controllers/auth.controller";

import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

/*
 * Google login
 */
router.post(
  "/google",
  googleLogin
);

/*
 * Current authenticated user
 */
router.get(
  "/me",
  requireAuth,
  getCurrentUser
);

router.post("/logout", requireAuth, logout);
export default router;