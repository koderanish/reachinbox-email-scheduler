"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elasticsearch_1 = require("@elastic/elasticsearch");
const elasticsearch = new elasticsearch_1.Client({
    node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});
exports.default = elasticsearch;
//# sourceMappingURL=elasticsearch.js.map