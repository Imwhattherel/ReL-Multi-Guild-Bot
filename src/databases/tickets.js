const Database = require('better-sqlite3');
const path = require('path');

// Define the database file path
const dbPath = path.resolve(__dirname, 'tickets.db');

// Initialize the SQLite database
const db = new Database(dbPath);

// Create tables if they don't already exist
db.exec(`
CREATE TABLE IF NOT EXISTS categories (
    guild_id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
    guild_id TEXT PRIMARY KEY,
    log_channel TEXT NOT NULL
);
`);

module.exports = db;
