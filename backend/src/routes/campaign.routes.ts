import { Router } from "express";
import multer from "multer";

import {
  createCampaignController,
  createCampaignFromCsvController,
} from "../controllers/campaign.controller";

import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/*
 * JSON campaign API
 */

router.post(
  "/",
  requireAuth,
  createCampaignController
);

/*
 * CSV campaign API
 */

router.post(
  "/csv",
  requireAuth,
  upload.single("file"),
  createCampaignFromCsvController
);

export default router;