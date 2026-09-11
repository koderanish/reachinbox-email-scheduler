"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("@bull-board/express");
const api_1 = require("@bull-board/api");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const express_2 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const email_queue_1 = require("../queues/email.queue");
const serverAdapter = new express_1.ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
(0, api_1.createBullBoard)({
    queues: [new bullMQAdapter_1.BullMQAdapter(email_queue_1.emailQueue)],
    serverAdapter,
});
function safeEqual(a, b) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return (ab.length === bb.length &&
        crypto_1.default.timingSafeEqual(ab, bb));
}
function bullBoardAuth(req, res, next) {
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
            .send("Bull Board is disabled: set BULL_BOARD_USER and BULL_BOARD_PASSWORD");
    }
    const header = req.headers.authorization || "";
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
        const decoded = Buffer.from(encoded, "base64").toString("utf8");
        const colon = decoded.indexOf(":");
        if (colon !== -1) {
            const reqUser = decoded.slice(0, colon);
            const reqPass = decoded.slice(colon + 1);
            if (safeEqual(reqUser, user) &&
                safeEqual(reqPass, password)) {
                return next();
            }
        }
    }
    res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board", charset="UTF-8"');
    return res.status(401).send("Authentication required");
}
const bullBoardRouter = (0, express_2.Router)();
bullBoardRouter.use(bullBoardAuth);
bullBoardRouter.use(serverAdapter.getRouter());
exports.default = bullBoardRouter;
//# sourceMappingURL=bull-board.js.map