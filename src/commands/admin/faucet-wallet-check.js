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
        .setColor('#00A1D6')
        .setTitle('💰 Faucet Wallet Balance Check')
        .setDescription(balanceInfo)
        .addFields(
          {
            name: '📝 What This Shows',
            value: '**HBAR:** Native Hedera balance\n**hbar.h Tokens:** Fungible tokens available for distribution to Snobble members',
            inline: false
          },
          {
            name: '⚠️ Important',
            value: 'Only Snobble role holders (who own SNOBBLE NFTs) can claim hbar.h tokens from the faucet.',
            inline: false
          }
        )
        .setFooter({ text: 'Check this regularly to ensure sufficient hbar.h tokens for claims' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Error checking wallet balance:', error);
      await interaction.editReply({
        content: '❌ Error checking wallet balance. Please try again.'
      });
    }
  }
};

