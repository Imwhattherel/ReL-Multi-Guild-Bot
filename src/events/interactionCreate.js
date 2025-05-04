const {
    EmbedBuilder,
    InteractionType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");
const { readdirSync, readFileSync } = require("fs");
const ticketsDb = require("../databases/tickets");


const config = JSON.parse(readFileSync("./logs.json", "utf8"));


async function logBotMessage(client, author, channel, title, content) {
    const logChannelId = config.logChannels?.messageLogs;
    if (!logChannelId) return;

    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
        .setTitle("📨 Bot Message Sent")
        .setDescription(`**Author:** <@${author.id}>\n**Channel:** <#${channel.id}>`)
        .addFields(
            ...(title ? [{ name: "Title", value: title }] : []),
            { name: "Content", value: content }
        )
        .setColor(0x2ecc71)
        .setFooter({
            text: "Message Logger • ReL Studios",
            iconURL: client.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        const client = interaction.client;

     
        if (!client.stickyMessages) client.stickyMessages = new Map();

    
        if (interaction.type === InteractionType.ApplicationCommand) {
            if (interaction.user.bot) return;

            const commandFile = readdirSync("./src/commands").find(file => {
                const command = require(`../../src/commands/${file}`);
                return interaction.commandName.toLowerCase() === command.data.name.toLowerCase();
            });

            if (commandFile) {
                const command = require(`../../src/commands/${commandFile}`);
                try {
                    await command.run(client, interaction);
                } catch (err) {
                    console.error("❌ Slash command error:", err);
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: "❌ There was an error executing this command.",
                            ephemeral: true
                        });
                    }
                }
            }
        }

      
        if (interaction.isButton()) {
            const { customId, guild, user } = interaction;

            if (customId === "open-ticket") {
                const guildId = guild.id;
                const category = ticketsDb.prepare("SELECT category_id FROM categories WHERE guild_id = ?").get(guildId);

                if (!category) {
                    return interaction.reply({
                        content: "❌ Ticket system is not set up. Run `/ticket setup <category>`.",
                        ephemeral: true
                    });
                }

                const existingTicket = guild.channels.cache.find(channel =>
                    channel.parentId === category.category_id &&
                    channel.name === `ticket-${user.username}`
                );

                if (existingTicket) {
                    return interaction.reply({
                        content: `❌ You already have an open ticket: <#${existingTicket.id}>.`,
                        ephemeral: true
                    });
                }

                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: category.category_id,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: guild.members.me.roles.highest.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels]
                        }
                    ]
                });

                const embed = new EmbedBuilder()
                    .setTitle("🎫 New Ticket Opened")
                    .setDescription(`Welcome <@${user.id}>! A moderator will assist you shortly.`)
                    .setColor(0x57f287)
                    .setTimestamp();

                const closeButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("close-ticket")
                        .setLabel("Close Ticket")
                        .setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ embeds: [embed], components: [closeButton] });

                return interaction.reply({
                    content: `✅ Your ticket has been created: <#${ticketChannel.id}>.`,
                    ephemeral: true
                });
            }

            if (customId === "close-ticket") {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    return interaction.reply({
                        content: "❌ You do not have permission to close this ticket.",
                        ephemeral: true
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId("close-ticket-modal")
                    .setTitle("Close Ticket Reason");

                const reasonInput = new TextInputBuilder()
                    .setCustomId("close-reason")
                    .setLabel("Reason for closing the ticket:")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                const actionRow = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(actionRow);

                await interaction.showModal(modal);
            }
        }

        
        if (interaction.isModalSubmit() && interaction.customId === "close-ticket-modal") {
            const reason = interaction.fields.getTextInputValue("close-reason");
            const { guild, channel, user } = interaction;

            try {
                await interaction.reply({
                    content: `✅ Ticket closed by **${user.tag}** for reason: **${reason}**.\nThis channel will be deleted in **5 seconds**.`
                });

                setTimeout(() => {
                    channel.delete(`Ticket closed by ${user.tag}: ${reason}`);
                }, 5000);
            } catch (err) {
                console.error("❌ Error closing ticket:", err);
                return interaction.reply({
                    content: "❌ Failed to close the ticket.",
                    ephemeral: true
                });
            }
        }

    
        if (interaction.isModalSubmit() && interaction.customId.startsWith("customMessageModal-")) {
            try {
                const channelId = interaction.customId.split("-")[1];
                const title = interaction.fields.getTextInputValue("customMessageTitle")?.trim();
                const content = interaction.fields.getTextInputValue("customMessageContent")?.trim();
                const channel = interaction.guild.channels.cache.get(channelId);

                if (!channel || !channel.isTextBased()) {
                    return interaction.reply({
                        content: "❌ The selected channel no longer exists.",
                        ephemeral: true
                    });
                }

                if (!content) {
                    return interaction.reply({
                        content: "❌ Message content is required.",
                        ephemeral: true
                    });
                }

                const finalMessage = title ? `**${title}**\n${content}` : content;

                await channel.send(finalMessage);
                await logBotMessage(interaction.client, interaction.user, channel, title, content);

                return interaction.reply({
                    content: `✅ Message sent to <#${channelId}>!`,
                    ephemeral: true
                });

            } catch (err) {
                console.error("❌ Error handling message modal:", err);
                return interaction.reply({
                    content: "❌ An error occurred while sending the message.",
                    ephemeral: true
                });
            }
        }

       
        if (interaction.isModalSubmit() && interaction.customId.startsWith("stickyModal-")) {
            try {
                const channelId = interaction.customId.split("-")[1];
                const title = interaction.fields.getTextInputValue("stickyTitle")?.trim();
                const content = interaction.fields.getTextInputValue("stickyContent")?.trim();
                const channel = interaction.guild.channels.cache.get(channelId);

                if (!channel || !channel.isTextBased()) {
                    return interaction.reply({
                        content: "❌ The selected channel could not be found.",
                        ephemeral: true
                    });
                }

                if (!content) {
                    return interaction.reply({
                        content: "❌ Message content is required.",
                        ephemeral: true
                    });
                }

                const finalMessage = title ? `**${title}**\n${content}` : content;

                const sentMessage = await channel.send(finalMessage);

                client.stickyMessages.set(channel.id, {
                    message: finalMessage,
                    messageId: sentMessage.id
                });

                return interaction.reply({
                    content: `✅ Sticky message set in <#${channelId}>!`,
                    ephemeral: true
                });

            } catch (err) {
                console.error("❌ Error handling sticky modal:", err);
                return interaction.reply({
                    content: "❌ Failed to create sticky message.",
                    ephemeral: true
                });
            }
        }
    }
};
