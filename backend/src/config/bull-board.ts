import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";

import { emailQueue } from "../queues/email.queue";

const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);

  return (
    ab.length === bb.length &&
    crypto.timingSafeEqual(ab, bb)
  );
}

function bullBoardAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = process.env.BULL_BOARD_USER;
  const password = process.env.BULL_BOARD_PASSWORD;

  if (!user || !password) {
    /*
     * Fail closed. The dashboard can pause queues and
     * delete jobs, so it must never be reachable
     * without configured credentials.
     */
    return res
      .status(503)
      .send(
        "Bull Board is disabled: set BULL_BOARD_USER and BULL_BOARD_PASSWORD"
      );
  }

  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(
      encoded,
      "base64"
    ).toString("utf8");

    const colon = decoded.indexOf(":");

    if (colon !== -1) {
      const reqUser = decoded.slice(0, colon);
      const reqPass = decoded.slice(colon + 1);

      if (
        safeEqual(reqUser, user) &&
        safeEqual(reqPass, password)
      ) {
        return next();
      }
    }
  }

  res.setHeader(
    "WWW-Authenticate",
    'Basic realm="Bull Board", charset="UTF-8"'
  );

  return res.status(401).send("Authentication required");
}

const bullBoardRouter = Router();

bullBoardRouter.use(bullBoardAuth);
bullBoardRouter.use(serverAdapter.getRouter());

export default bullBoardRouter;