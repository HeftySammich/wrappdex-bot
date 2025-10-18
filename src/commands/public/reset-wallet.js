const { SlashCommandBuilder } = require('discord.js');
const { deleteVerifiedUsersByUserId } = require('../../database/models/rules');
const { removeRole } = require('../../services/discordService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-wallet')
    .setDescription('Remove your verified wallet and reset token-based roles'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Token-based role IDs to remove
      const TOKEN_ROLE_IDS = [
        '1424023310328660111', // Snobble
        '1423668292027158659', // Holder (.h)
        '1424022878889705623'  // DAO
      ];

      // Remove all verified wallets for this user
      await deleteVerifiedUsersByUserId(interaction.user.id, interaction.guildId);

      // Remove token-based roles
      for (const roleId of TOKEN_ROLE_IDS) {
        try {
          await removeRole(interaction.member, roleId);
        } catch (error) {
          console.error(`Error removing role ${roleId}:`, error.message);
        }
      }

      await interaction.editReply({
        content: 'Your wallet has been reset. You can now verify a new wallet with `/verify-wallet`.'
      });

      console.log(`Reset wallet for user ${interaction.user.tag}`);
    } catch (error) {
      console.error('Error in reset-wallet command:', error);
      await interaction.editReply({
        content: 'There was an error resetting your wallet. Please try again.'
      });
    }
  }
};

