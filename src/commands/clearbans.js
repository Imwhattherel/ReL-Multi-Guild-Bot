const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');


const config = JSON.parse(fs.readFileSync("./logs.json", "utf8"));

async function logClearBans(client, executor, unbanCount) {
    const logChannelId = config.logChannels["Unbans"];
    if (!logChannelId) return console.log("No log channel configured for globalBan");

    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return console.log("Log channel not found for globalBan");

    const logEmbed = new EmbedBuilder()
        .setTitle("Bans Cleared")
        .setDescription(`**${unbanCount} users** have been unbanned by <@${executor.id}>.`)
        .setColor(0x00ff00) 
        .setFooter({
            text: "Ban System Powered By - ReL Studios",
            iconURL: client.user.displayAvatarURL()
        });

    await logChannel.send({ embeds: [logEmbed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear-bans')
        .setDescription('Unbans all users in the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        
    run: async (client, interaction) => {
     
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                content: 'You do not have permission to unban members.',
                ephemeral: true
            });
        }

        try {
            
            const bans = await interaction.guild.bans.fetch();
            const unbanCount = bans.size;

            if (unbanCount === 0) {
                return interaction.reply({
                    content: 'There are no banned users to unban.',
                    ephemeral: true
                });
            }

            
            for (const [userId] of bans) {
                try {
                    await interaction.guild.members.unban(userId);
                } catch (error) {
                    console.error(`Failed to unban user ${userId}:`, error.message);
                }
            }

            
            const embed = new EmbedBuilder()
                .setTitle('All Bans Cleared')
                .setDescription(`Successfully unbanned **${unbanCount} users** from this server.`)
                .setColor(0x00ff00)
                .setFooter({
                    text: "Ban System Powered By - ReL Studios",
                    iconURL: client.user.displayAvatarURL()
                });

            await interaction.reply({ embeds: [embed], ephemeral: false });

            
            await logClearBans(client, interaction.user, unbanCount);
        } catch (error) {
            console.error('Error unbanning users:', error.message);
            return interaction.reply({
                content: 'An error occurred while trying to unban all users. Please try again later.',
                ephemeral: true
            });
        }
    }
};
