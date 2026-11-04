const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "financial_mirror.db");
const db = new Database(dbPath, { readonly: false });

module.exports = db;
