"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const elasticsearch_backfill_service_1 = require("../services/elasticsearch-backfill.service");
const elasticsearch_service_1 = require("../services/elasticsearch.service");
dotenv_1.default.config();
async function run() {
    try {
        await (0, elasticsearch_service_1.createEmailIndex)();
        const count = await (0, elasticsearch_backfill_service_1.backfillEmailsToElasticsearch)();
        console.log(`Done. ${count} emails synced.`);
        process.exit(0);
    }
    catch (error) {
        console.error("Elasticsearch backfill failed:", error);
        process.exit(1);
    }
}
run();
//# sourceMappingURL=backfill-elasticsearch.js.map