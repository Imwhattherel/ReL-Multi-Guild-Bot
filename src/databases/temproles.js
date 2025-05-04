const Database = require("better-sqlite3");
const path = require("path");

// Define the database path relative to the root of the bot
const temprolesDbPath = path.join(__dirname, "../temproles.db");
const temprolesDb = new Database(temprolesDbPath);

// Create the permissions table if it doesn't exist
temprolesDb.exec(`
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS temporary_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

`);

// Check if 'expires_at' column exists, add it if not
const columnsStmt = temprolesDb.prepare(`
    PRAGMA table_info(permissions)
`);
const columns = columnsStmt.all();

const expiresAtColumnExists = columns.some(column => column.name === "expires_at");

if (!expiresAtColumnExists) {
    try {
        temprolesDb.exec(`
        ALTER TABLE permissions ADD COLUMN expires_at TEXT;
        `);
        console.log("Added 'expires_at' column to the permissions table.");
    } catch (error) {
        console.error("Error adding 'expires_at' column:", error.message);
    }
}

module.exports = temprolesDb;
