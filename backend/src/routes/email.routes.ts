import { Router } from "express";

import {
  searchEmails,
  getEmailsController,
} from "../controllers/email.controller";

import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/",
  requireAuth,
  getEmailsController
);

router.get(
  "/search",
  requireAuth,
  searchEmails
);

export default router;