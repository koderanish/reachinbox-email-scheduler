"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const campaign_routes_1 = __importDefault(require("./routes/campaign.routes"));
const sender_routes_1 = __importDefault(require("./routes/sender.routes"));
const email_routes_1 = __importDefault(require("./routes/email.routes"));
const slack_routes_1 = __importDefault(require("./routes/slack.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const csv_routes_1 = __importDefault(require("./routes/csv.routes"));
const bull_board_1 = __importDefault(require("./config/bull-board"));
const elasticsearch_service_1 = require("./services/elasticsearch.service");
const email_scheduler_service_1 = require("./services/email-scheduler.service");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
/*
 * BullMQ Dashboard
 */
app.use("/admin/queues", bull_board_1.default.getRouter());
/*
 * API Routes
 */
app.use("/api/campaigns", campaign_routes_1.default);
app.use("/api/senders", sender_routes_1.default);
app.use("/api/emails", email_routes_1.default);
app.use("/api/slack", slack_routes_1.default);
app.use("/api/csv", csv_routes_1.default);
app.use("/api/auth", auth_routes_1.default);
app.get("/", (req, res) => {
    res.json({
        message: "ReachInbox Email Scheduler API is running",
    });
});
/*
 * Health Check
 */
app.get("/health", async (req, res) => {
    try {
        const result = await db_1.default.query("SELECT NOW()");
        res.json({
            status: "ok",
            database: "connected",
            time: result.rows[0].now,
        });
    }
    catch (error) {
        console.error("Database health check failed:", error);
        res.status(500).json({
            status: "error",
            database: "disconnected",
        });
    }
});
const PORT = process.env.PORT || 5001;
async function startServer() {
    try {
        await (0, elasticsearch_service_1.createEmailIndex)();
        await (0, email_scheduler_service_1.reconcileScheduledEmails)();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map