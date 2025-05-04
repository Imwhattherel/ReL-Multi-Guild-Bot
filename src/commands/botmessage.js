const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ChannelType,
    EmbedBuilder,
} = require("discord.js");
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("./logs.json", "utf8"));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("botmessage")
        .setDescription("Send a message via modal.")
        .addChannelOption(option =>
            option.setName("channel")
                .setDescription("Channel to send the message to.")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    run: async (client, interaction) => {
        const targetChannel = interaction.options.getChannel("channel");

        const modal = new ModalBuilder()
            .setCustomId(`customMessageModal-${targetChannel.id}`)
            .setTitle("Send Custom Message");

        const titleInput = new TextInputBuilder()
            .setCustomId("customMessageTitle")
            .setLabel("Message Title (Optional)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const contentInput = new TextInputBuilder()
            .setCustomId("customMessageContent")
            .setLabel("Message Content")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(contentInput)
        );

        await interaction.showModal(modal);
    }
};
