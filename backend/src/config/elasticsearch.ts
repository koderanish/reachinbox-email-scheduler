import { Client } from "@elastic/elasticsearch";

const elasticsearch = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",

  ...(process.env.ELASTICSEARCH_API_KEY
    ? {
        auth: {
          apiKey: process.env.ELASTICSEARCH_API_KEY,
        },
        serverMode: "serverless" as const,
      }
    : {}),
});

export default elasticsearch;