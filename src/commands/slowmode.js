const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set a slow mode duration for the current channel.")
        .addIntegerOption(option =>
            option
                .setName("duration")
                .setDescription("The slow mode duration in seconds (0 to 21600).")
                .setRequired(true)
        ),
    run: async (client, interaction) => {
     
        if (!interaction.member.permissions.has("MANAGE_CHANNELS")) {
            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
                ephemeral: true,
            });
        }

       
        const duration = interaction.options.getInteger("duration");

      
        if (duration < 0 || duration > 21600) {
            return interaction.reply({
                content: "❌ Please provide a duration between 0 and 21600 seconds (6 hours).",
                ephemeral: true,
            });
        }

        
        try {
            await interaction.channel.setRateLimitPerUser(duration);
            if (duration === 0) {
                await interaction.reply({
                    content: "✅ Slow mode has been disabled for this channel.",
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: `✅ Slow mode has been set to ${duration} seconds for this channel.`,
                    ephemeral: true,
                });
            }
        } catch (error) {
            console.error("Error setting slow mode:", error);
            await interaction.reply({
                content: "❌ An error occurred while trying to set slow mode.",
                ephemeral: true,
            });
        }
    },
};
