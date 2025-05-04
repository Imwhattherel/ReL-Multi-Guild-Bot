const {
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const fs = require("fs");


const config = JSON.parse(fs.readFileSync("./logs.json", "utf8"));

async function logTimeout(client, user, executor, reason, duration) {
  const logChannelId = config.logChannels["globalTimeout"];
  if (!logChannelId) return console.log("No log channel configured for globalTimeout");

  const channel = await client.channels.fetch(logChannelId).catch(() => null);
  if (!channel) return console.log("Log channel not found for globalTimeout");

  const logEmbed = new EmbedBuilder()
    .setTitle("Global Moderation Notification")
    .setDescription(`<@${user.id}> has been globally timed out by <@${executor.id}>.`)
    .addFields(
      { name: "Username", value: `\`${user.tag}\``, inline: true },
      { name: "User ID", value: `\`${user.id}\``, inline: true },
      { name: "Action Performed By", value: `<@${executor.id}>`, inline: true },
      { name: "Duration", value: `${duration} minute(s)`, inline: true },
      { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
    )
    .setColor(0xFF0000)
    .setFooter({ text: "Developed by ReL Studios" });

  channel.send({ embeds: [logEmbed] });
}

async function logUntimeout(client, user, executor) {
  const logChannelId = config.logChannels["globalTimeout"];
  if (!logChannelId) return console.log("No log channel configured for globalTimeout");

  const channel = await client.channels.fetch(logChannelId).catch(() => null);
  if (!channel) return console.log("Log channel not found for globalTimeout");

  const logEmbed = new EmbedBuilder()
    .setTitle("Global Moderation Notification")
    .setDescription(`<@${user.id}> has been globally un-timed out by <@${executor.id}>.`)
    .addFields(
      { name: "Username", value: `\`${user.tag}\``, inline: true },
      { name: "User ID", value: `\`${user.id}\``, inline: true },
      { name: "Action Performed By", value: `<@${executor.id}>`, inline: true }
    )
    .setColor(0xFF0000)
    .setFooter({ text: "Developed by ReL Studios" });

  channel.send({ embeds: [logEmbed] });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("global-timeout")
    .setDescription("Manage global timeouts across all associated servers")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(true)
    .addSubcommand(subcommand =>
      subcommand
        .setName("set")
        .setDescription("Globally timeout the specified user")
        .addUserOption(option =>
          option.setName("user")
            .setDescription("The user to globally timeout")
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName("duration")
            .setDescription("Timeout duration in minutes")
            .setRequired(true))
        .addStringOption(option =>
          option.setName("reason")
            .setDescription("The reason for the timeout")
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a global timeout from the specified user")
        .addUserOption(option =>
          option.setName("user")
            .setDescription("The user to remove the timeout from")
            .setRequired(true))
    ),

  run: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();
    const Target = interaction.options.getUser("user");
    const Duration = interaction.options.getInteger("duration") || 0;
    const Reason = interaction.options.getString("reason") || "No reason provided";
    const timeoutDuration = Duration * 60 * 1000; 

    await interaction.deferReply({ ephemeral: false });

    if (subcommand === "set") {
      try {
        await Target.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🔒 Global Timeout Notification")
              .setDescription("You have been globally timed out from all associated servers.")
              .addFields(
                { name: "Reason", value: `\`\`\`${Reason}\`\`\`` },
                { name: "Duration", value: `${Duration} minute(s)` },
                { name: "Timed Out By", value: `<@${interaction.user.id}>` }
              )
              .setColor(0xFFA500)
              .setFooter({ text: "Developed by ReL Studios" })
          ]
        });
      } catch {
        console.log(`Could not send DM to ${Target.tag}`);
      }

      let successCount = 0;
      let failCount = 0;

      await Promise.all(client.guilds.cache.map(async (guild) => {
        try {
          const member = await guild.members.fetch(Target.id).catch(() => null);
          if (member && member.moderatable) {
            await member.timeout(timeoutDuration, `${Reason} - Timed out by ${interaction.user.tag}`);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.log(`Failed to timeout ${Target.tag} in ${guild.name}: ${error.message}`);
          failCount++;
        }
      }));

      await logTimeout(client, Target, interaction.user, Reason, Duration);
    }

    if (subcommand === "remove") {
      let successCount = 0;
      let failCount = 0;

      await Promise.all(client.guilds.cache.map(async (guild) => {
        try {
          const member = await guild.members.fetch(Target.id).catch(() => null);
          if (member && member.communicationDisabledUntil) {
            await member.timeout(null); 
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.log(`Failed to remove timeout for ${Target.tag} in ${guild.name}: ${error.message}`);
          failCount++;
        }
      }));

      await logUntimeout(client, Target, interaction.user);
    }

    const responseEmbed = new EmbedBuilder()
      .setTitle(`Global ${subcommand === "set" ? "Timeout" : "Timeout Removal"} Notification`)
      .setDescription(`<@${Target.id}> has been globally ${subcommand === "set" ? "timed out" : "un-timed out"} by <@${interaction.user.id}>.`)
      .addFields(
        { name: "Username", value: `\`${Target.tag}\``, inline: true },
        { name: "User ID", value: `\`${Target.id}\``, inline: true }
      )
      .setColor(subcommand === "set" ? 0xFFA500 : 0x00ff00)
      .setFooter({ text: "Developed by ReL Studios" });

    if (subcommand === "set") {
      responseEmbed.addFields(
        { name: "Reason", value: `\`\`\`${Reason}\`\`\``, inline: false },
        { name: "Duration", value: `${Duration} minute(s)`, inline: true }
      );
    }

    await interaction.editReply({ embeds: [responseEmbed] });
  }
};
