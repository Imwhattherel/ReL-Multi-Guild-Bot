const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require("fs");
const temprolesDb = require('../databases/temproles'); 


const config = JSON.parse(fs.readFileSync("./logs.json", "utf8"));

async function logTempRole(client, action, user, role, executor, guild, status = "Success", reason = "") {
    const logChannelId = config.logChannels["tempRoles"];
    if (!logChannelId) return console.log("No log channel configured for tempRoles");

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return console.log("Log channel not found for tempRoles");


    const logEmbed = new EmbedBuilder()
        .setTitle(`Temporary Role Log`)
        .setDescription(`<@${executor.id}> **${action.toLowerCase()}** the role ${role} (${role.name}) to <@${user.id}> in **${guild.name}**. Status: **${status}**.`)
        .setColor(status === "Success" ? 0x65a4d8 : 0xff0000) 
        .setFooter({
            text: "Role Management System Powered By - ReL Studios",
            iconURL: client.user.displayAvatarURL()
        });

    if (reason) {
        logEmbed.addFields({ name: "Reason", value: reason, inline: false });
    }

    
    await channel.send({ embeds: [logEmbed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('temp-role')
        .setDescription('Manage temporary roles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Temporarily adds a role to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to assign the role to')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to assign')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in days for the role to last')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Removes a temporary role from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove the role from')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true))),

    run: async (client, interaction) => {
     
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: '❌ An error occurred while processing the request.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: false }); 

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const guild = interaction.guild;
        const executor = interaction.user;

       
        const stmt = temprolesDb.prepare(`
            SELECT role_id FROM permissions WHERE user_id = ?
        `);
        const allowedRoles = stmt.all(executor.id).map(row => row.role_id);

        const executorPermissions = interaction.member.permissions.toArray();
        const hasPermission = allowedRoles.includes(role.id) || interaction.member.permissions.has(PermissionFlagsBits.ManageRoles);

        let permissionsLog = executorPermissions.join(", ");
        if (!hasPermission) {
            await interaction.editReply({
                content: '❌ You do not have permission to assign this role.',
                ephemeral: true
            });
            await logTempRole(client, "attempted", targetUser, role, interaction.user, guild, "Denied - Insufficient Permissions");
            return;
        }

     
        const botMember = await guild.members.fetchMe(); 
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.editReply({
                content: '❌ I do not have the `MANAGE_ROLES` permission to assign roles.',
                ephemeral: true
            });
            await logTempRole(client, "attempted", targetUser, role, interaction.user, guild, "Denied - Missing Bot Permissions");
            return;
        }

        
        try {
            const guildMember = await guild.members.fetch(targetUser.id);

          
            if (!role) {
                const invalidRoleEmbed = new EmbedBuilder()
                    .setTitle("Invalid Role")
                    .setDescription("The role you specified is invalid or does not exist.")
                    .setColor(0xff0000);
                await interaction.editReply({ embeds: [invalidRoleEmbed] });
                await logTempRole(client, "attempted", targetUser, role, interaction.user, guild, "Failed - Invalid Role");
                return;
            }

            
            if (guildMember.roles.highest.position >= botMember.roles.highest.position) {
                const noPermissionEmbed = new EmbedBuilder()
                    .setTitle("Permission Denied")
                    .setDescription("You cannot assign a role that is higher or equal to your highest role.")
                    .setColor(0xff0000);
                await interaction.editReply({ embeds: [noPermissionEmbed] });
                await logTempRole(client, "attempted", targetUser, role, interaction.user, guild, "Denied - Role Hierarchy");
                return;
            }

            if (guildMember.roles.cache.has(role.id)) {
                const alreadyHasRoleEmbed = new EmbedBuilder()
                    .setTitle("Role Already Assigned")
                    .setDescription(`<@${targetUser.id}> already has the role **${role.name}**.`)
                    .setColor(0xFFA500);
                await interaction.editReply({ embeds: [alreadyHasRoleEmbed] });
                await logTempRole(client, "attempted", targetUser, role, interaction.user, guild, "Denied - Role Already Assigned");
                return;
            }

           
            await guildMember.roles.add(role);

            const expiresAt = new Date(Date.now() + interaction.options.getInteger('duration') * 24 * 60 * 60 * 1000).toISOString();

            temprolesDb.prepare(`
                INSERT INTO temporary_roles (user_id, role_id, expires_at) VALUES (?, ?, ?)
            `).run(targetUser.id, role.id, expiresAt);

            const embed = new EmbedBuilder()
                .setTitle('Temporary Role Added')
                .setDescription(`The role **${role.name}** has been assigned to <@${targetUser.id}> for **${interaction.options.getInteger('duration')} days**.`)
                .setColor(0x65a4d8);

            await interaction.editReply({ embeds: [embed], ephemeral: false });

            
            await logTempRole(client, "added", targetUser, role, interaction.user, guild, "Success");

        } catch (error) {
            console.error(`Error assigning role: ${error}`);
            await interaction.editReply({
                content: '❌ An error occurred while assigning the role. Please try again later.',
                ephemeral: true
            });
            await logTempRole(client, "attempted", targetUser, role, interaction.user, guild, "Failed - Error Assigning Role");
        }
    },


    async runRemove(client, interaction) {
        const targetUser = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const guild = interaction.guild;
        const executor = interaction.user;

        
        const stmt = temprolesDb.prepare(`
            SELECT role_id FROM permissions WHERE user_id = ?
        `);
        const allowedRoles = stmt.all(executor.id).map(row => row.role_id);

        const executorPermissions = interaction.member.permissions.toArray();
        const hasPermission = allowedRoles.includes(role.id) || interaction.member.permissions.has(PermissionFlagsBits.ManageRoles);

        if (!hasPermission) {
            await interaction.editReply({
                content: '❌ You do not have permission to remove this role.',
                ephemeral: true
            });
            await logTempRole(client, "attempted", targetUser, role, interaction.user, guild, "Failed", "Insufficient Permissions");
            return;
        }

        const botMember = await guild.members.fetchMe(); 
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.editReply({
                content: '❌ I do not have the `MANAGE_ROLES` permission to remove roles.',
                ephemeral: true
            });
            await logTempRole(client, "attempted", targetUser, role, interaction.user, guild, "Failed", "Missing Bot Permissions");
            return;
        }

        try {
            const guildMember = await guild.members.fetch(targetUser.id);
            await guildMember.roles.remove(role);

            temprolesDb.prepare(`
                DELETE FROM temporary_roles WHERE user_id = ? AND role_id = ?
            `).run(targetUser.id, role.id);

            const embed = new EmbedBuilder()
                .setTitle('Temporary Role Removed')
                .setDescription(`The role **${role.name}** has been removed from <@${targetUser.id}>.`)
                .setColor(0xff0000);

            await interaction.editReply({ embeds: [embed], ephemeral: false });

            
            await logTempRole(client, "removed", targetUser, role, interaction.user, guild, "Success");

        } catch (error) {
            console.error(`Error removing role: ${error}`);
            await interaction.editReply({
                content: '❌ An error occurred while removing the role. Please try again later.',
                ephemeral: true
            });
            await logTempRole(client, "attempted", targetUser, role, interaction.user, guild, "Failed", "Error Removing Role");
        }
    }
};
