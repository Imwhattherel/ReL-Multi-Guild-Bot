const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const fs = require("fs");


const config = JSON.parse(fs.readFileSync("./logs.json", "utf8"));

async function logGlobalBan(client, user, executor, reason, banCount) {
    const logChannelId = config.logChannels["globalBan"];
    if (!logChannelId) return console.log("No log channel configured for globalBan");

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return console.log("Log channel not found for globalBan");

    const logEmbed = new EmbedBuilder()
        .setTitle("User Globally Banned")
        .setDescription(`<@${user.id}> has been globally banned From **${banCount}** Guilds by <@${executor.id}>. `)
        .setThumbnail(user.displayAvatarURL({ dynamic: true })) 
        .addFields(
            { name: "Username", value: `\`${user.tag}\``, inline: true },
            { name: "User ID", value: `\`${user.id}\``, inline: true },
            { name: "Action Performed By", value: `<@${executor.id}>`, inline: true },
            { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false },
            { name: "Total Guilds Banned From", value: `${banCount}`, inline: true }
        )
        .setColor(0xff0000) 
        .setFooter({
            text: "Global Ban System Powered By - ReL Studios",
            iconURL: client.user.displayAvatarURL()
        });

    channel.send({ embeds: [logEmbed] });
}

async function logGlobalUnban(client, user, executor, unbanCount) {
    const logChannelId = config.logChannels["globalBan"];
    if (!logChannelId) return console.log("No log channel configured for globalBan");

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return console.log("Log channel not found for globalBan");

    const logEmbed = new EmbedBuilder()
        .setTitle("User Globally Unbanned")
        .setDescription(`<@${user.id}> has been globally unbanned From **${unbanCount}** Guilds by <@${executor.id}>. `)
        .setThumbnail(user.displayAvatarURL({ dynamic: true })) 
        .addFields(
            { name: "Username", value: `\`${user.tag}\``, inline: true },
            { name: "User ID", value: `\`${user.id}\``, inline: true },
            { name: "Action Performed By", value: `<@${executor.id}>`, inline: true },
            { name: "Total Guilds Unbanned From", value: `${unbanCount}`, inline: true }
        )
        .setColor(0x00ff00) 
        .setFooter({
            text: "Global Ban System Powered By - ReL Studios",
            iconURL: client.user.displayAvatarURL()
        });

    channel.send({ embeds: [logEmbed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("global-ban")
        .setDescription("Manage global bans across all associated servers")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setDescription("Global Ban the specified user")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("The user to global ban")
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName("reason")
                        .setDescription("The reason for the ban")
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove a global ban from the specified user")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("The user to remove the ban from")
                        .setRequired(true))
        ),

    run: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const Target = interaction.options.getUser("user");
        const Reason = interaction.options.getString("reason") || "No reason provided";
        let BanCount = 0;
        let UnbanCount = 0;

        await interaction.deferReply({ ephemeral: false });

        if (subcommand === "set") {
            try {
                const NotifyUser = new EmbedBuilder()
                    .setTitle("Globally Banned")
                    .setDescription("You have been globally banned from all associated servers.")
                    .setThumbnail(Target.displayAvatarURL({ dynamic: true })) 
                    .addFields(
                        { name: "Reason", value: `\`\`\`${Reason}\`\`\`` },
                        { name: "Banned By", value: `<@${interaction.user.id}>` }
                    )
                    .setColor(0xff0000)
                    .setFooter({
                        text: "Global Ban System Powered By - ReL Studios",
                        iconURL: client.user.displayAvatarURL()
                    });

                await Target.send({ embeds: [NotifyUser] }).catch(() => console.log("Could not notify user via DM."));
            } catch (error) {
                console.log(`Could not send DM to ${Target.tag}: ${error.message}`);
            }

            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.bans.create(Target.id, {
                        reason: `Global ban requested by ${interaction.user.id} (${interaction.user.tag}) - ${Reason}`
                    });
                    BanCount++;
                } catch (error) {
                    console.log(`Failed to ban ${Target.tag} in ${guild.name}: ${error.message}`);
                }
            }

            await logGlobalBan(client, Target, interaction.user, Reason, BanCount);
        }

        if (subcommand === "remove") {
            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.bans.remove(Target.id);
                    UnbanCount++;
                } catch (error) {
                    console.log(`Failed to unban ${Target.tag} in ${guild.name}: ${error.message}`);
                }
            }

            await logGlobalUnban(client, Target, interaction.user, UnbanCount);
        }

        const responseEmbed = new EmbedBuilder()
            .setTitle(`User Globally ${subcommand === "set" ? "Banned" : "Unbaned"}`)
            .setDescription(`<@${Target.id}> has been globally ${subcommand === "set" ? "banned" : "unbanned"}  From **${subcommand === "set" ? BanCount : UnbanCount}** Guilds by <@${interaction.user.id}>.`)
            .setThumbnail(Target.displayAvatarURL({ dynamic: true })) 
            .addFields(
                { name: "Username", value: `\`${Target.tag}\``, inline: true },
                { name: "User ID", value: `\`${Target.id}\``, inline: true },
                { name: "Action Performed By", value: `<@${interaction.user.id}>`, inline: true },
            )
            .setColor(subcommand === "set" ? 0xff0000 : 0x00ff00)
            .setFooter({
                text: "Global Ban System Powered By - ReL Studios",
                iconURL: client.user.displayAvatarURL()
            });

        await interaction.editReply({ embeds: [responseEmbed] });
    }
};
