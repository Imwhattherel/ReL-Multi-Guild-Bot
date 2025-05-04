const { SlashCommandBuilder } = require("@discordjs/builders");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");

const blacklistDB = require("../databases/blacklist");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../../logs.json"), "utf8"));
const roleConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "../../blacklistrole.json"), "utf8"));
const keywordData = JSON.parse(fs.readFileSync(path.join(__dirname, "../../autofill.json"), "utf8"));
const BLACKLIST_ROLE_IDS = roleConfig.roleIds || [];
const keywordMap = keywordData.keywords || {};

function getParsedReason(inputReason) {
    const lowerInput = inputReason.toLowerCase();
    for (const [keyword, explanation] of Object.entries(keywordMap)) {
        if (lowerInput.includes(keyword.toLowerCase())) {
            return explanation;
        }
    }
    return inputReason;
}

async function logBlacklistAction(client, user, executor, action, reason = "No reason provided") {
    const logChannelId = config.logChannels?.["globalBan"];
    if (!logChannelId) return;

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`User Globally ${action === "add" ? "Blacklisted" : "Unblacklisted"}`)
        .setDescription(
            `<@${user.id}> has been ${action === "add" ? "blacklisted" : "removed from blacklist"} by <@${executor.id}>.\n\n**Reason:**\n\`\`\`${reason}\`\`\``
        )
        .setColor(action === "add" ? 0xff0000 : 0x00ff00)
        .setFooter({ text: "Global Blacklist System - ReL Studios", iconURL: client.user.displayAvatarURL() });

    channel.send({ embeds: [embed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("global-blacklist")
        .setDescription("Manage global blacklist")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add a user to the global blacklist")
                .addUserOption(opt => opt.setName("user").setDescription("User to blacklist").setRequired(true))
                .addStringOption(opt => opt.setName("reason").setDescription("Reason for blacklisting").setRequired(true)))
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove a user from the global blacklist")
                .addUserOption(opt => opt.setName("user").setDescription("User to unblacklist").setRequired(true))),

    run: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();
        const user = interaction.options.getUser("user");
        const inputReason = interaction.options.getString("reason") || "No reason provided";
        const reason = getParsedReason(inputReason);

        if (sub === "add") {
            blacklistDB.add(user.id, interaction.user.id, reason);
            await logBlacklistAction(client, user, interaction.user, "add", reason);

            for (const [guildId, guild] of client.guilds.cache) {
                const member = await guild.members.fetch(user.id).catch(() => null);
                if (!member) continue;

                for (const roleId of BLACKLIST_ROLE_IDS) {
                    const role = await guild.roles.fetch(roleId).catch(() => null);
                    if (!role) continue;

                    try {
                        await member.roles.add(role);
                        console.log(`✅ Added ${role.name} to ${user.tag} in ${guild.name}`);
                    } catch (err) {
                        console.warn(`⚠️ Failed to add role ${role.name} in ${guild.name}: ${err.message}`);
                    }
                }
            }
        }

        if (sub === "remove") {
            blacklistDB.remove(user.id);
            await logBlacklistAction(client, user, interaction.user, "remove", reason);

            for (const [guildId, guild] of client.guilds.cache) {
                const member = await guild.members.fetch(user.id).catch(() => null);
                if (!member) continue;

                for (const roleId of BLACKLIST_ROLE_IDS) {
                    const role = await guild.roles.fetch(roleId).catch(() => null);
                    if (!role) continue;

                    try {
                        await member.roles.remove(role);
                        console.log(`✅ Removed ${role.name} from ${user.tag} in ${guild.name}`);
                    } catch (err) {
                        console.warn(`⚠️ Failed to remove role ${role.name} in ${guild.name}: ${err.message}`);
                    }
                }
            }
        }

        const embed = new EmbedBuilder()
            .setTitle("Blacklist Update")
            .setDescription(`<@${user.id}> has been ${sub === "add" ? "**added to**" : "**removed from**"} the blacklist.`)
            .setColor(sub === "add" ? 0xff0000 : 0x00ff00);

        await interaction.reply({ embeds: [embed], flags: 64 });
    }
};
