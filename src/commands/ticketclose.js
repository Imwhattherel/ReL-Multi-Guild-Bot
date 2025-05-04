const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket-button')
        .setDescription('Set up a ticket creation button in a specific channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where the ticket button will be placed')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const targetChannel = interaction.options.getChannel('channel');

        try {
          
            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open-ticket')
                    .setLabel('Open Ticket')
                    .setStyle(ButtonStyle.Primary)
            );

           
            await targetChannel.send({
                content: '**Need help? Click the button below to open a ticket!**',
                components: [button],
            });

            return interaction.reply({
                content: `✅ Ticket button has been set up in <#${targetChannel.id}>.`,
                ephemeral: true,
            });

        } catch (error) {
            console.error(`Error setting up ticket button: ${error.message}`);
            return interaction.reply({
                content: '❌ An error occurred while setting up the ticket button. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
