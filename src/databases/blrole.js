const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../../blrole.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS blacklist (
    user_id TEXT PRIMARY KEY,
    executor_id TEXT NOT NULL,
    reason TEXT DEFAULT 'No reason provided',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS persistent_blacklist (
    user_id TEXT PRIMARY KEY,
    reason TEXT DEFAULT 'No reason provided',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;
