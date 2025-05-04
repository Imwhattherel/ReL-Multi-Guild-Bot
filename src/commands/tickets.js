const { SlashCommandBuilder } = require('@discordjs/builders');
const {
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const ticketsDb = require('../databases/tickets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-open')
        .setDescription('Open a new ticket')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for opening the ticket')
                .setRequired(true)
        ),
    run: async (client, interaction) => {
        const reason = interaction.options.getString('reason');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

       
        const category = ticketsDb.prepare(`
            SELECT category_id FROM categories WHERE guild_id = ?
        `).get(guildId);

        if (!category) {
            return interaction.reply({
                content: '❌ Ticket system is not set up. Run `/ticket setup <category>`.',
                ephemeral: true,
            });
        }

        const categoryId = category.category_id;
        const categoryChannel = interaction.guild.channels.cache.get(categoryId);

        if (!categoryChannel) {
            return interaction.reply({
                content: '❌ The stored category does not exist. Please set it up again using `/ticket setup <category>`.',
                ephemeral: true,
            });
        }

        try {
         
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({
                    content: '❌ I need "Manage Channels" permission to open tickets.',
                    ephemeral: true,
                });
            }

      
            const existingTicket = interaction.guild.channels.cache.find(channel =>
                channel.parentId === categoryId && channel.name === `ticket-${interaction.user.username}`
            );

            if (existingTicket) {
                return interaction.reply({
                    content: `❌ You already have an open ticket: <#${existingTicket.id}>.`,
                    ephemeral: true,
                });
            }

        
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: 0, 
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: userId,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    },
                    {
                        id: interaction.guild.members.me.roles.highest.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                    },
                ],
            });

            console.log(`✅ Ticket created successfully: ${ticketChannel.id}`);

      
            const embed = new EmbedBuilder()
                .setTitle('🎫 New Ticket Opened')
                .setDescription(`**Reason:** ${reason}\n\nWelcome <@${userId}>, a moderator will assist you shortly.`)
                .setColor(0x57f287)
                .setTimestamp();

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close-ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ embeds: [embed], components: [closeButton] });

            return interaction.reply({
                content: `✅ Your ticket has been created! Check <#${ticketChannel.id}>.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(`❌ Error creating ticket: ${error.message}`);
            return interaction.reply({
                content: `❌ Failed to create a ticket. Error: ${error.message}`,
                ephemeral: true,
            });
        }
    },

    handleButton: async (interaction) => {
        if (interaction.customId === 'close-ticket') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({
                    content: '❌ You do not have permission to close this ticket.',
                    ephemeral: true,
                });
            }

        
            const modal = new ModalBuilder()
                .setCustomId('close-ticket-modal')
                .setTitle('Close Ticket Reason');

            const reasonInput = new TextInputBuilder()
                .setCustomId('close-reason')
                .setLabel('Reason for closing the ticket:')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        }
    },
    handleModal: async (interaction) => {
        if (interaction.customId === 'close-ticket-modal') {
            const reason = interaction.fields.getTextInputValue('close-reason');
            const channel = interaction.channel;

            try {
           
                const memberId = channel.permissionOverwrites.cache
                    .filter((perm) => perm.type === 'member' && perm.allow.has(PermissionFlagsBits.ViewChannel))
                    .map((perm) => perm.id)[0];

                let ticketCreator = null;

                if (memberId) {
                    try {
                        ticketCreator = await interaction.guild.members.fetch(memberId);
                    } catch (fetchError) {
                        console.warn(`⚠️ Unable to fetch ticket creator: ${fetchError.message}`);
                    }
                }

       
                if (ticketCreator) {
                    ticketCreator.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('🎫 Ticket Closed')
                                .setDescription(
                                    `Your ticket has been closed.\n\n**Closed By:** ${interaction.user.tag}\n**Reason:** ${reason}`
                                )
                                .setColor(0xff0000)
                                .setTimestamp(),
                        ],
                    }).catch(() => {
                        console.warn(`⚠️ Unable to DM user ${ticketCreator.id} (DMs may be disabled).`);
                    });
                }

        
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('✅ Ticket Closed')
                            .setDescription('This ticket will be deleted in **5 seconds**.')
                            .setColor(0xff0000)
                            .setTimestamp(),
                    ],
                });

                setTimeout(async () => {
                    try {
                        await channel.delete(`Ticket closed by ${interaction.user.tag}: ${reason}`);
                    } catch (deleteError) {
                        console.error(`❌ Failed to delete ticket channel: ${deleteError.message}`);
                    }
                }, 5000);
            } catch (error) {
                console.error(`❌ Error closing ticket: ${error.message}`);
                return interaction.reply({
                    content: '❌ An error occurred while closing the ticket. Please try again later.',
                    ephemeral: true,
                });
            }
        }
    },
};
