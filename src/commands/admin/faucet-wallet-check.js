const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getBalance } = require('../../services/hederaTransactions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faucet-wallet-check')
    .setDescription('Check faucet wallet balance (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const { operatorId, isHederaInitialized } = require('../../services/hederaTransactions');

      if (!isHederaInitialized) {
        await interaction.editReply({
          content: '❌ Faucet wallet not configured. Please set `FAUCET_ACCOUNT_ID` and `FAUCET_PRIVATE_KEY` environment variables.'
        });
        return;
      }

      const walletId = operatorId.toString();
      const balanceInfo = await getBalance(walletId);

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('💰 Faucet Wallet Balance')
        .setDescription(balanceInfo)
        .addFields(
          {
            name: '🔐 Wallet Address',
            value: `\`${walletId}\``,
            inline: false
          }
        )
        .setFooter({ text: 'Check this regularly to ensure sufficient funds' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Error checking wallet balance:', error);
      await interaction.editReply({
        content: '❌ Error checking wallet balance. Please try again.'
      });
    }
  }
};

