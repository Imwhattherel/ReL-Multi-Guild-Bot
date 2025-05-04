const { ActivityType } = require("discord.js");
const axios = require("axios");
const db = require("../databases/serverinfo");

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`${client.user.username} is online and ready!`);

       
        let playerCount = "Set server with /setserver";

    
        db.get(`SELECT server_ip, server_port FROM server_info LIMIT 1`, async (err, row) => {
            if (err) {
                console.error("Error fetching server info:", err.message);
                client.user.setActivity("Database Error", { type: ActivityType.Watching });
                return;
            }

            if (!row) {
                console.log("No server info found in the database. Use /setserver to configure the server.");
                client.user.setActivity("Set server with /setserver", { type: ActivityType.Watching });
                return;
            }

        
            client.fivemServer = {
                server_ip: row.server_ip,
                server_port: row.server_port,
            };

            console.log(`Loaded server info: ${row.server_ip}:${row.server_port}`);

            
            async function fetchPlayerCount() {
                try {
                    const response = await axios.get(
                        `http://${client.fivemServer.server_ip}:${client.fivemServer.server_port}/players.json`
                    );
                    return `${response.data.length} Players`;
                } catch (error) {
                    console.error("Error fetching player count:", error.message);
                    return "Server Offline";
                }
            }

         
            let activities = [await fetchPlayerCount()],
                i = 0;

         
            setInterval(async () => {
                const updatedPlayerCount = await fetchPlayerCount();
                activities[0] = updatedPlayerCount;
            }, 60000);

          
            setInterval(() => {
                client.user.setActivity(
                    { name: `${activities[i++ % activities.length]}`, type: ActivityType.Watching }
                );
            }, 22000);
        });
    },
};
