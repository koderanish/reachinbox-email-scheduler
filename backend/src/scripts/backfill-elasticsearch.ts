import dotenv from "dotenv";
import { backfillEmailsToElasticsearch } from "../services/elasticsearch-backfill.service";
import { createEmailIndex } from "../services/elasticsearch.service";

dotenv.config();

async function run() {
  try {
    await createEmailIndex();

    const count = await backfillEmailsToElasticsearch();

    console.log(`Done. ${count} emails synced.`);
    process.exit(0);
  } catch (error) {
    console.error("Elasticsearch backfill failed:", error);
    process.exit(1);
  }
}

run();
