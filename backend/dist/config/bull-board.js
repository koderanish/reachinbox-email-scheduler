"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("@bull-board/express");
const api_1 = require("@bull-board/api");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const email_queue_1 = require("../queues/email.queue");
const serverAdapter = new express_1.ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
(0, api_1.createBullBoard)({
    queues: [new bullMQAdapter_1.BullMQAdapter(email_queue_1.emailQueue)],
    serverAdapter,
});
exports.default = serverAdapter;
//# sourceMappingURL=bull-board.js.map