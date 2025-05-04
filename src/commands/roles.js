const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require("fs");


const rolePerms = JSON.parse(fs.readFileSync("./roleperms.json", "utf8"));


const config = JSON.parse(fs.readFileSync("./logs.json", "utf8"));

async function logPermRole(client, action, user, role, executor, guild, status = "Success") {
    const logChannelId = config.logChannels["permRoles"];
    if (!logChannelId) return console.log("No log channel configured for permRoles");

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return console.log("Log channel not found for permRoles");

 
    const logEmbed = new EmbedBuilder()
        .setTitle("Role Log")
        .setDescription(`<@${executor.id}> **${action.toLowerCase()}** the role ${role} (${role.name}) to <@${user.id}> in **${guild.name}**. Status: **${status}**.`)
        .setColor(status === "Success" ? 0x65a4d8 : 0xff0000) 
        .setFooter({ 
            text: "Role Management System Powered By - ReL Studios",
            iconURL: client.user.displayAvatarURL() 
        });

 
    await channel.send({ embeds: [logEmbed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage permanent roles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Permanently adds a role to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to assign the role to')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to assign')
                        .setRequired(true))
        ),

    run: async (client, interaction) => {
        await interaction.deferReply({ flags: 64 }); 

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const guild = interaction.guild;
        const executor = interaction.user;

       
        const allowedRoles = rolePerms[executor.id];
        if (!allowedRoles || !allowedRoles.includes(role.id)) {
            const noPermissionEmbed = new EmbedBuilder()
                .setTitle("Permission Denied")
                .setDescription("You do not have permission to assign this role to others.")
                .setColor(0xff0000);
            await interaction.editReply({ embeds: [noPermissionEmbed] });
            await logPermRole(client, "attempted", targetUser, role, executor, guild, "Denied - Insufficient Permissions");
            return;
        }


        const botMember = await guild.members.fetchMe(); 
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const botNoPermissionEmbed = new EmbedBuilder()
                .setTitle("Missing Bot Permission")
                .setDescription("I do not have the `MANAGE_ROLES` permission to assign roles.")
                .setColor(0xff0000);
            await interaction.editReply({ embeds: [botNoPermissionEmbed] });
            await logPermRole(client, "attempted", targetUser, role, executor, guild, "Denied - Missing Bot Permissions");
            return;
        }

       
        let guildMember;
        try {
            guildMember = await guild.members.fetch(targetUser.id);
        } catch (error) {
            const memberFetchErrorEmbed = new EmbedBuilder()
                .setTitle("Error Fetching Member")
                .setDescription("There was an issue fetching the member details. Please try again.")
                .setColor(0xff0000);
            await interaction.editReply({ embeds: [memberFetchErrorEmbed] });
            await logPermRole(client, "attempted", targetUser, role, executor, guild, "Failed - Member Fetch Error");
            return;
        }

  
        if (!role) {
            const invalidRoleEmbed = new EmbedBuilder()
                .setTitle("Invalid Role")
                .setDescription("The role you specified is invalid or does not exist.")
                .setColor(0xff0000);
            await interaction.editReply({ embeds: [invalidRoleEmbed] });
            await logPermRole(client, "attempted", targetUser, role, executor, guild, "Failed - Invalid Role");
            return;
        }

       
        if (guildMember.roles.highest.position >= botMember.roles.highest.position) {
            const noPermissionEmbed = new EmbedBuilder()
                .setTitle("Permission Denied")
                .setDescription("You cannot assign a role that is higher or equal to your highest role.")
                .setColor(0xff0000);
            await interaction.editReply({ embeds: [noPermissionEmbed] });
            await logPermRole(client, "attempted", targetUser, role, executor, guild, "Denied - Role Hierarchy");
            return;
        }

        if (guildMember.roles.cache.has(role.id)) {
            const alreadyHasRoleEmbed = new EmbedBuilder()
                .setTitle("Role Already Assigned")
                .setDescription(`<@${targetUser.id}> already has the role **${role.name}**.`)
                .setColor(0xFFA500);
            await interaction.editReply({ embeds: [alreadyHasRoleEmbed] });
            await logPermRole(client, "attempted", targetUser, role, executor, guild, "Denied - Role Already Assigned");
            return;
        }

        try {
            await guildMember.roles.add(role);

            const successEmbed = new EmbedBuilder()
                .setTitle('Role Assigned Successfully')
                .setDescription(`Successfully added the role **${role.name}** to <@${targetUser.id}>.`)
                .setColor(0x65a4d8)
                .setFooter({ 
                    text: "Role Management System Powered By - ReL Studios",
                    iconURL: client.user.displayAvatarURL()
                });

            await interaction.editReply({ embeds: [successEmbed] });
            await logPermRole(client, "added", targetUser, role, executor, guild, "Success");

        } catch (error) {
            console.error(`Error assigning role: ${error}`);
            const errorEmbed = new EmbedBuilder()
                .setTitle("Error Assigning Role")
                .setDescription(`An error occurred while assigning the role **${role.name}**.`)
                .setColor(0xff0000)
                .setFooter({ 
                    text: "Role Management System Powered By - ReL Studios",
                    iconURL: client.user.displayAvatarURL()
                });
            await interaction.editReply({ embeds: [errorEmbed] });
            await logPermRole(client, "attempted", targetUser, role, executor, guild, "Failed - Error Assigning Role");
        }
    }
};
