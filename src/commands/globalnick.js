const {
  EmbedBuilder,
  PermissionsBitField,
  PermissionFlagsBits
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const fs = require("fs");


const config = JSON.parse(fs.readFileSync("./logs.json", "utf8"));

async function logToChannel(client, logType, user, executor, details) {
  const logChannelId = config.logChannels[logType];
  if (!logChannelId) return console.log(`No log channel configured for ${logType}`);
  
  const channel = await client.channels.fetch(logChannelId).catch(() => null);
  if (!channel) return console.log(`Log channel not found for ${logType}`);

  const logEmbed = new EmbedBuilder()
    .setTitle("Global Moderation Notification")
    .setDescription(`<@${user.id}> had their nickname changed globally by <@${executor.id}>.`)
    .addFields(
      { name: "Username", value: `\`${user.tag}\``, inline: true },
      { name: "User ID", value: `\`${user.id}\``, inline: true },
      { name: "Action Performed By", value: `<@${executor.id}>`, inline: true },
      { name: "New Nickname", value: `\`\`\`${details.nickname}\`\`\``, inline: false }
    )
    .setColor(0x65a4d8)
    .setFooter({ text: "Developed by ReL Studios" });

  channel.send({ embeds: [logEmbed] });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("global-nickname")
    .setDescription("Change the nickname of a user globally across all servers")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .setDMPermission(false)
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user whose nickname you want to change")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("nickname")
        .setDescription("The new nickname for the user")
        .setRequired(true)),

  run: async (client, interaction) => {
    const targetUser = interaction.options.getUser("user");
    const newNickname = interaction.options.getString("nickname");

    await interaction.deferReply({ ephemeral: true });

    let successfulChanges = 0;
    let failedChanges = 0;
    let roleHierarchyIssues = 0;
    let ownerIssues = 0;
    let botIssues = 0;

    for (const guild of client.guilds.cache.values()) {
      try {
        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (member) {
          if (member.id === guild.ownerId) {
            ownerIssues++;
          } else if (member.id === client.user.id) {
            botIssues++;
          } else if (member.manageable) {
            await member.setNickname(newNickname, `Changed by ${interaction.user.tag}`);
            successfulChanges++;
          } else {
            roleHierarchyIssues++;
          }
        } else {
          failedChanges++;
        }
      } catch (err) {
        failedChanges++;
      }
    }

    const details = {
      nickname: newNickname
    };

    await logToChannel(client, "nicknameLogs", targetUser, interaction.user, details);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Global Nickname Change")
          .setDescription(`<@${targetUser.id}> has had their nickname changed globally.`)
          .addFields(
            { name: "New Nickname", value: `\`${newNickname}\``, inline: true },
            { name: "Successful Changes", value: `${successfulChanges}`, inline: true },
            { name: "Failed Changes", value: `${failedChanges}`, inline: true },
            { name: "Role Hierarchy Issues", value: `${roleHierarchyIssues}`, inline: true },
            { name: "Server Owner Issues", value: `${ownerIssues}`, inline: true },
            { name: "Bot Restrictions", value: `${botIssues}`, inline: true }
          )
          .setColor(0x65a4d8)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
          .setFooter({ text: "Developed by ReL Studios" })
      ]
    });
  }
};