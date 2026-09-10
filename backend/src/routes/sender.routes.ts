import { Router } from "express";

import {
  createSenderController,
  getSendersController,
  getSenderController,
  updateSenderController,
  deleteSenderController,
} from "../controllers/sender.controller";

import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/",
  requireAuth,
  createSenderController
);

router.get(
  "/",
  requireAuth,
  getSendersController
);

router.get(
  "/:id",
  requireAuth,
  getSenderController
);

router.patch(
  "/:id",
  requireAuth,
  updateSenderController
);

router.delete(
  "/:id",
  requireAuth,
  deleteSenderController
);

export default router;