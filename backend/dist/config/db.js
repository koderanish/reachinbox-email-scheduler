"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
pool.on("connect", () => {
    console.log("DATABASE CONNECTED!");
});
pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error);
});
exports.default = pool;
//# sourceMappingURL=db.js.map