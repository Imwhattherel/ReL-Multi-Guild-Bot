const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");


const config = JSON.parse(fs.readFileSync("./logs.json", "utf8"));

async function logClearMessages(client, executor, channel, deletedCount) {
    const logChannelId = config.logChannels["messageLogs"];
    if (!logChannelId) return console.log("No log channel configured for messageLogs");

    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return console.log("Log channel not found for messageLogs");

   
    const logEmbed = new EmbedBuilder()
        .setTitle("Messages Cleared")
        .setDescription(`**${deletedCount} messages** were cleared in <#${channel.id}> by <@${executor.id}>.`)
        .setColor(0xffa500)
        .setFooter({
            text: `Message Clearing Powered By - ReL Studios`,
            iconURL: client.user.displayAvatarURL({ dynamic: true }) 
        });

   
    await logChannel.send({ embeds: [logEmbed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Clear a specific number of messages in the current channel.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("The number of messages to delete (max 100).")
                .setRequired(true)
        ),
    run: async (client, interaction) => {
      
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: "You don't have permission to use this command.",
                ephemeral: true,
            });
        }

     
        const amount = interaction.options.getInteger("amount");

      
        if (amount < 1 || amount > 100) {
            return interaction.reply({
                content: "Please provide a number between 1 and 100.",
                ephemeral: true,
            });
        }

       
        try {
            const deletedMessages = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({
                content: `Successfully deleted ${deletedMessages.size} messages.`,
                ephemeral: true,
            });

         
            await logClearMessages(client, interaction.user, interaction.channel, deletedMessages.size);

        } catch (error) {
            console.error("Error deleting messages:", error);
            await interaction.reply({
                content: "❌ An error occurred while trying to delete messages.",
                ephemeral: true,
            });
        }
    },
};
