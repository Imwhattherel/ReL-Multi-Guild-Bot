const fs = require("fs");
const path = require("path");
const blacklistDB = require("../databases/blacklist");

const roleConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "../../blacklistrole.json"), "utf8"));
const BLACKLIST_ROLE_IDS = roleConfig.roleIds || [];

module.exports = {
    name: "guildMemberAdd",

    async execute(member) {
        if (!blacklistDB.isPersistent(member.id)) {
            console.log(`🟡 ${member.user.tag} is not on the persistent blacklist.`);
            return;
        }

        console.log(`🟢 ${member.user.tag} is on the persistent blacklist. Reapplying roles...`);

        for (const roleId of BLACKLIST_ROLE_IDS) {
            const role = await member.guild.roles.fetch(roleId).catch(() => null);
            if (!role) {
                console.warn(`⚠️ Role ID ${roleId} not found in ${member.guild.name}`);
                continue;
            }

            try {
                await member.roles.add(role);
                console.log(`✅ Assigned role ${role.name} to ${member.user.tag}`);
            } catch (err) {
                console.error(`❌ Failed to assign role ${role.name} to ${member.user.tag}: ${err.message}`);
            }
        }
    }
};
