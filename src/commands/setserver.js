const { SlashCommandBuilder } = require("discord.js");
const db = require("../databases/serverinfo");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setserver")
        .setDescription("Set the FiveM server details.")
        .addStringOption(option =>
            option
                .setName("ip")
                .setDescription("The IP address of the FiveM server.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("port")
                .setDescription("The port of the FiveM server.")
                .setRequired(true)
        ),
    async run(client, interaction) {
        const serverIp = interaction.options.getString("ip");
        const serverPort = interaction.options.getString("port");

       
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(serverIp)) {
            await interaction.reply({
                content: "❌ **Invalid IP Address**\n\nPlease provide a valid IP address.",
                ephemeral: true,
            });
            return;
        }

        if (!/^\d+$/.test(serverPort)) {
            await interaction.reply({
                content: "❌ **Invalid Port**\n\nPlease provide a valid port number.",
                ephemeral: true,
            });
            return;
        }

        
        db.run(
            `INSERT INTO server_info (server_ip, server_port)
             VALUES (?, ?)
             ON CONFLICT(server_ip) DO UPDATE SET server_port = excluded.server_port`,
            [serverIp, serverPort],
            (err) => {
                if (err) {
                    console.error("Error saving server info:", err.message);
                    interaction.reply({
                        content: "❌ **Failed to save server information.**",
                        ephemeral: true,
                    });
                } else {
                    client.fivemServer = { server_ip: serverIp, server_port: serverPort }; 
                    interaction.reply({
                        content: `✅ **Server Updated**\n\nThe server details have been set to:\n- IP: \`${serverIp}\`\n- Port: \`${serverPort}\``,
                        ephemeral: false,
                    });
                }
            }
        );
    },
};
