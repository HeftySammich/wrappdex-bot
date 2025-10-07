const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('all-commands')
    .setDescription('Show all available bot commands (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setColor('#00A1D6')
        .setTitle('📋 Bot Commands')
        .setDescription('Complete list of all available commands')
        .addFields(
          {
            name: '👥 MEMBER COMMANDS',
            value: 
              '`/verify-wallet` - Link your Hedera wallet to get roles\n' +
              '`/status` - Check your wallet verification status\n' +
              '`/help` - Get help with verification and see server rules\n' +
              '`/enter-giveaway` - Enter the active token giveaway\n' +
              '`/giveaway-help` - Get help and instructions for token giveaways\n' +
              '`/giveaway-status` - Check your giveaway entry status',
            inline: false
          },
          {
            name: '🔧 ADMIN COMMANDS',
            value:
              '`/setup` - Initialize bot for this server\n' +
              '`/set-rules` - Create role assignment rules\n' +
              '`/bot-status` - Show bot status, database connection, and statistics\n' +
              '`/setup-reaction-roles` - Setup reaction roles for verification\n' +
              '`/reaction-role-setup` - Create reaction role message (modal)\n' +
              '`/reaction-role-add` - Add role to existing reaction message\n' +
              '`/reaction-role-remove` - Remove role from reaction message\n' +
              '`/reaction-role-list` - List all reaction role messages\n' +
              '`/embed-modal` - Create custom embed message\n' +
              '`/start-giveaway` - Start a token giveaway\n' +
              '`/test-daily` - Test the daily message\n' +
              '`/all-commands` - Show this command list',
            inline: false
          }
        )
        .setFooter({ text: 'Admin commands require Administrator permission' })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

    } catch (error) {
      console.error('❌ Error in all-commands command:', error);
      await interaction.reply({
        content: '❌ Error displaying commands list.',
        ephemeral: true
      });
    }
  }
};

