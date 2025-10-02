const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Initialize bot for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const { TOKEN_IDS } = require('../../utils/constants');
    await interaction.reply({
      content: '✅ **Bot Setup Complete!**\n\n' +
               '🎯 **Next Steps:**\n' +
               '1. Use `/set-rules` to configure role assignments\n' +
               '2. Users can then use `/verify-wallet` to get roles\n\n' +
               `📋 **Supported Tokens:** \`${TOKEN_IDS.join('`, `')}\``,
      ephemeral: true
    });
  }
};
