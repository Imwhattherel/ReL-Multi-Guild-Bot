const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const ticketsDb = require('../databases/tickets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-log')
        .setDescription('Set a log channel for ticket closure events.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where ticket logs will be sent')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    run: async (client, interaction) => {
        const logChannel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        try {
       
            ticketsDb.prepare(`
                INSERT INTO logs (guild_id, log_channel)
                VALUES (?, ?)
                ON CONFLICT(guild_id) DO UPDATE SET log_channel = excluded.log_channel
            `).run(guildId, logChannel.id);

            return interaction.reply({
                content: `✅ Ticket log channel has been set to <#${logChannel.id}>.`,
                ephemeral: true,
            });

        } catch (error) {
            console.error(`❌ Error setting log channel: ${error.message}`);
            return interaction.reply({
                content: "❌ Failed to set log channel. Please try again later.",
                ephemeral: true,
            });
        }
    },
};
