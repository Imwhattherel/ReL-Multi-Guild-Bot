const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ChannelType
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sticky")
        .setDescription("Create a sticky message in a channel.")
        .addChannelOption(option =>
            option.setName("channel")
                .setDescription("Channel where the sticky message will be posted.")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    run: async (client, interaction) => {
        const targetChannel = interaction.options.getChannel("channel");

        const modal = new ModalBuilder()
            .setCustomId(`stickyModal-${targetChannel.id}`)
            .setTitle("Sticky Message Setup");

        const titleInput = new TextInputBuilder()
            .setCustomId("stickyTitle")
            .setLabel("Title (optional)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const contentInput = new TextInputBuilder()
            .setCustomId("stickyContent")
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
