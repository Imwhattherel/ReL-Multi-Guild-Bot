const sqlite3 = require("sqlite3").verbose();

// Initialize the database
const db = new sqlite3.Database("./fivem.db", (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to SQLite database.");
        db.run(`
            CREATE TABLE IF NOT EXISTS server_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                server_ip TEXT NOT NULL UNIQUE, -- Make server_ip unique to prevent duplicates
                server_port TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error("Error creating table:", err.message);
            } else {
                console.log("Table 'server_info' is ready.");
            }
        });
    }
});

module.exports = db;
