const db = require("./blrole");

module.exports = {
    add(userId, executorId, reason = "No reason provided") {
        db.prepare(`
            INSERT OR REPLACE INTO blacklist (user_id, executor_id, reason, timestamp)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(userId, executorId, reason);

        db.prepare(`
            INSERT OR REPLACE INTO persistent_blacklist (user_id, reason, timestamp)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run(userId, reason);
    },

    remove(userId) {
        db.prepare(`DELETE FROM blacklist WHERE user_id = ?`).run(userId);
        db.prepare(`DELETE FROM persistent_blacklist WHERE user_id = ?`).run(userId);
    },

    has(userId) {
        return !!db.prepare(`SELECT 1 FROM blacklist WHERE user_id = ?`).get(userId);
    },

    isPersistent(userId) {
        return !!db.prepare(`SELECT 1 FROM persistent_blacklist WHERE user_id = ?`).get(userId);
    },

    getPersistent() {
        return db.prepare(`SELECT * FROM persistent_blacklist ORDER BY timestamp DESC`).all();
    }
};
