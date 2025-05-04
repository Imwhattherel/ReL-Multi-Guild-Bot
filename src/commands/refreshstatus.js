const { SlashCommandBuilder, ActivityType } = require("discord.js");
const axios = require("axios");
const db = require("../databases/serverinfo");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("refreshstatus")
        .setDescription("Manually refresh the bot's status and player count."),
    async run(client, interaction) {
     
        db.get(`SELECT server_ip, server_port FROM server_info LIMIT 1`, async (err, row) => {
            if (err) {
                console.error("Error fetching server info:", err.message);
                await interaction.reply({
                    content: "❌ **Failed to refresh status.** Could not fetch server info from the database.",
                    ephemeral: true,
                });
                return;
            }

            if (!row) {
                await interaction.reply({
                    content: "❌ **No Server Configured.** Use `/setserver` to configure the server before refreshing the status.",
                    ephemeral: true,
                });
                return;
            }

            const { server_ip, server_port } = row;

            try {
              
                const response = await axios.get(`http://${server_ip}:${server_port}/players.json`);
                const playerCount = response.data.length;

               
                client.user.setActivity(`${playerCount} Players Online`, { type: ActivityType.Watching });

                await interaction.reply({
                    content: `✅ **Status Refreshed.** The server currently has **${playerCount} players online.**`,
                    ephemeral: true,
                });
            } catch (error) {
                console.error("Error fetching player count:", error.message);

               
                client.user.setActivity("Server Offline", { type: ActivityType.Watching });

                await interaction.reply({
                    content: "❌ **Failed to Refresh Status.** The server might be offline or unreachable.",
                    ephemeral: true,
                });
            }
        });
    },
};
