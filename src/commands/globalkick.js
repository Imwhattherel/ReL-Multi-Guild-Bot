const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const fs = require("fs");

// Load config and keywords
const config = JSON.parse(fs.readFileSync("./logs.json", "utf8"));
const keywordData = JSON.parse(fs.readFileSync("./autofill.json", "utf8"));
const keywordMap = keywordData.keywords || {};

// Reason parser
function getParsedReason(inputReason) {
    const lowerInput = inputReason.toLowerCase();
    for (const [keyword, explanation] of Object.entries(keywordMap)) {
        if (lowerInput.includes(keyword.toLowerCase())) {
            return explanation;
        }
    }
    return inputReason;
}

async function logKick(client, user, executor, reason, kickCount) {
    const logChannelId = config.logChannels["globalKick"];
    if (!logChannelId) return console.log("No log channel configured for globalKick");

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return console.log("Log channel not found for globalKick");

    const logEmbed = new EmbedBuilder()
        .setTitle("Globally Kicked")
        .setDescription(`<@${user.id}> has been globally kicked from ${kickCount} Guilds by <@${executor.id}>.`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: "Username", value: `\`${user.tag}\``, inline: true },
            { name: "User ID", value: `\`${user.id}\``, inline: true },
            { name: "Action Performed By", value: `<@${executor.id}>`, inline: true },
            { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
        )
        .setColor(0xffa500)
        .setFooter({
            text: "Global Kick System Powered By - ReL Studios",
            iconURL: client.user.displayAvatarURL()
        });

    channel.send({ embeds: [logEmbed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("global-kick")
        .setDescription("Manage global kicks across all associated servers")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(true)
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to global kick")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("The reason for the kick")
                .setRequired(true)),

    run: async (client, interaction) => {
        const Target = interaction.options.getUser("user");
        const InputReason = interaction.options.getString("reason");
        const Reason = getParsedReason(InputReason);
        let KickCount = 0;

        await interaction.deferReply({ ephemeral: false });

        try {
            const NotifyUser = new EmbedBuilder()
                .setTitle("Globally Kicked")
                .setDescription("You have been globally kicked from all associated servers.")
                .setThumbnail(Target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: "Reason", value: `\`\`\`${Reason}\`\`\`` },
                    { name: "Kicked By", value: `<@${interaction.user.id}>` }
                )
                .setColor(0xffa500)
                .setFooter({
                    text: "Global Kick System Powered By - ReL Studios",
                    iconURL: client.user.displayAvatarURL()
                });

            await Target.send({ embeds: [NotifyUser] }).catch(() => console.log("Could not notify user via DM."));
        } catch (error) {
            console.log(`Could not send DM to ${Target.tag}: ${error.message}`);
        }

        for (const guild of client.guilds.cache.values()) {
            try {
                const member = await guild.members.fetch(Target.id).catch(() => null);
                if (member && member.kickable) {
                    await member.kick(`${Reason} - Kicked by ${interaction.user.tag}`);
                    KickCount++;
                }
            } catch (error) {
                console.log(`Failed to kick ${Target.tag} in ${guild.name}: ${error.message}`);
            }
        }

        await logKick(client, Target, interaction.user, Reason, KickCount);

        const KickSuccess = new EmbedBuilder()
            .setTitle("User Kicked")
            .setDescription(`<@${Target.id}> has been globally kicked from ${KickCount} Guilds by <@${interaction.user.id}>.`)
            .setThumbnail(Target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: "Username", value: `\`${Target.tag}\``, inline: true },
                { name: "User ID", value: `\`${Target.id}\``, inline: true },
                { name: "Action Performed By", value: `<@${interaction.user.id}>`, inline: true },
                { name: "Punishment Reason", value: `\`\`\`${Reason}\`\`\``, inline: false }
            )
            .setColor(0xffa500)
            .setFooter({
                text: "Global Kick System Powered By - ReL Studios",
                iconURL: client.user.displayAvatarURL()
            });

        await interaction.editReply({ embeds: [KickSuccess] });
    }
};
