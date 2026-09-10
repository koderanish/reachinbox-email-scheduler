"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const email_queue_1 = require("./email.queue");
async function addTestJob() {
    const job = await email_queue_1.emailQueue.add("test-email", {
        message: "Hello from ReachInbox",
    }, {
        delay: 10000, // 10 seconds
        removeOnComplete: false,
        removeOnFail: false,
    });
    console.log("Job created:", job.id);
    console.log("Job will run after 10 seconds");
    process.exit(0);
}
addTestJob();
//# sourceMappingURL=test-queue.js.map