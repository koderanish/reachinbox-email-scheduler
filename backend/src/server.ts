import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import pool from "./config/db";

import campaignRoutes from "./routes/campaign.routes";
import senderRoutes from "./routes/sender.routes";
import emailRoutes from "./routes/email.routes";
import slackRoutes from "./routes/slack.routes";
import authRoutes from "./routes/auth.routes";
import csvRoutes from "./routes/csv.routes";

import bullBoardAdapter from "./config/bull-board";

import {
  createEmailIndex,
} from "./services/elasticsearch.service";

import {
  reconcileScheduledEmails,
} from "./services/email-scheduler.service";

dotenv.config();

const app = express();


app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());

/*
 * BullMQ Dashboard
 */

app.use(
  "/admin/queues",
  bullBoardAdapter.getRouter()
);

/*
 * API Routes
 */

app.use(
  "/api/campaigns",
  campaignRoutes
);

app.use(
  "/api/senders",
  senderRoutes
);

app.use(
  "/api/emails",
  emailRoutes
);

app.use(
  "/api/slack",
  slackRoutes
);

app.use(
  "/api/csv",
  csvRoutes
);

app.use(
  "/api/auth",
  authRoutes
);



app.get(
  "/",
  (req: Request, res: Response) => {
    res.json({
      message:
        "ReachInbox Email Scheduler API is running",
    });
  }
);

/*
 * Health Check
 */

app.get(
  "/health",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const result = await pool.query(
        "SELECT NOW()"
      );

      res.json({
        status: "ok",
        database: "connected",
        time: result.rows[0].now,
      });
    } catch (error) {
      console.error(
        "Database health check failed:",
        error
      );

      res.status(500).json({
        status: "error",
        database: "disconnected",
      });
    }
  }
);

const PORT =
  process.env.PORT || 5001;



async function startServer() {
  try {

    await createEmailIndex();


    await reconcileScheduledEmails();

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();