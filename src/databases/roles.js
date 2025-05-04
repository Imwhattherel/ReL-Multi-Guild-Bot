const db = require("./roles"); // same roles.db instance

module.exports = {
    add(userId, executorId, reason = "No reason provided") {
        db.prepare(`
            INSERT OR REPLACE INTO blacklist (user_id, executor_id, reason)
            VALUES (?, ?, ?)
        `).run(userId, executorId, reason);
    },

    remove(userId) {
        db.prepare(`DELETE FROM blacklist WHERE user_id = ?`).run(userId);
    },

    has(userId) {
        return !!db.prepare(`SELECT 1 FROM blacklist WHERE user_id = ?`).get(userId);
    },

    getAll() {
        return db.prepare(`SELECT * FROM blacklist ORDER BY timestamp DESC`).all();
    }
};
