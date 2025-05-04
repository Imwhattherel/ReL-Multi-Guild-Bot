const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("restart")
        .setDescription("Restart the bot."),
    run: async (client, interaction) => {
     
        if (!interaction.member.permissions.has("Administrator")) {
            const embed = new EmbedBuilder()
                .setDescription("❌ **You do not have permission to restart the bot.**")
                .setColor(0xff0000);

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

      
        const embed = new EmbedBuilder()
            .setDescription("🔄 **Restarting the bot...**")
            .setColor(0x00ff00);

        await interaction.reply({ embeds: [embed], ephemeral: true });

       
        process.exit(0);
    },
};
