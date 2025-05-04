const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playercount")
        .setDescription("Check the current player count on the FiveM server."),
    run: async (client, interaction) => {

        const serverConfig = client.fivemServer;

        if (!serverConfig.server_ip || !serverConfig.server_port) {
            await interaction.reply({
                content: "❌ **Server Not Set**\n\nUse `/setserver` to configure the FiveM server details before using this command.",
                ephemeral: true,
            });
            return;
        }

        try {
           
            const response = await axios.get(`http://${serverConfig.server_ip}:${serverConfig.server_port}/players.json`);
            const playerCount = response.data.length;

            await interaction.reply({
                content: `✅ **Server Player Count**\n\nThe server currently has **${playerCount} players online**.`,
                ephemeral: false,
            });
        } catch (error) {
            console.error("Error fetching player count:", error.message);

            await interaction.reply({
                content: `❌ **Unable to Fetch Player Count**\n\nThe server might be offline or the details are incorrect.`,
                ephemeral: false,
            });
        }
    },
};
