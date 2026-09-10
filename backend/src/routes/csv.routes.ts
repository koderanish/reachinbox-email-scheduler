import { Router } from "express";
import multer from "multer";
import { parseCsvController } from "../controllers/csv.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/parse",
  upload.single("file"),
  parseCsvController
);

export default router;