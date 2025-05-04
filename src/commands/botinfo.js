const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const os = require("os");
const moment = require("moment");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Displays information about the bot."),

    run: async (client, interaction) => {
        await interaction.deferReply();

      
        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.users.cache.size;
        const uptime = moment.duration(client.uptime).humanize(); 
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2); 
        const ping = client.ws.ping;

       
        const cpuCores = os.cpus().length;
        const platform = os.platform();
        const nodeVersion = process.version;
        const discordJsVersion = require("discord.js").version;

      
        const embed = new EmbedBuilder()
            .setTitle("Bot Info")
            .setDescription(`Details about **${client.user.username}**`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: "Bot Name", value: `${client.user.username}#${client.user.discriminator}`, inline: true },
                { name: "Bot ID", value: `\`${client.user.id}\``, inline: true },
                { name: "Servers", value: `\`${totalGuilds}\``, inline: true },
                { name: " Users", value: `\`${totalUsers}\``, inline: true },
                { name: "Uptime", value: `\`${uptime}\``, inline: true },
                { name: "Ping", value: `\`${ping}ms\``, inline: true },
                { name: "RAM Usage", value: `\`${memoryUsage} MB\``, inline: true },
                { name: "CPU Cores", value: `\`${cpuCores}\``, inline: true },
                { name: "Platform", value: `\`${platform}\``, inline: true },
                { name: "Node.js Version", value: `\`${nodeVersion}\``, inline: true },
                { name: "Discord.js Version", value: `\`${discordJsVersion}\``, inline: true },
                { name: "Developer", value: `\`ReL Studios\``, inline: false }
            )
            .setColor(0x5865F2)
            .setFooter({
                text: `${client.user.username} | Bot Info`,
                iconURL: client.user.displayAvatarURL()
            });

        await interaction.editReply({ embeds: [embed] });
    }
};
