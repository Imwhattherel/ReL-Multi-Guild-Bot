const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("eval")
        .setDescription("Executes JavaScript code (Owner Only).")
        .addStringOption(option =>
            option.setName("code")
                .setDescription("The JavaScript code to execute")
                .setRequired(true)),
    run: async (client, interaction) => {
        const allowedOwners = ["YOUR-DISCORD-ID"]; 
        if (!allowedOwners.includes(interaction.user.id)) {
            return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
        }

        const code = interaction.options.getString("code");

        try {
            let evaled = eval(code);
            if (typeof evaled !== "string") evaled = require("util").inspect(evaled);

            const embed = new EmbedBuilder()
                .setTitle("Evaluation Result")
                .setDescription(`\`\`\`js\n${evaled}\n\`\`\``)
                .setColor(0x2ecc71);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle("Evaluation Error")
                .setDescription(`\`\`\`js\n${error.message}\n\`\`\``)
                .setColor(0xe74c3c);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
