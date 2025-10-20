const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setFaucetConfig, getFaucetConfig } = require('../../database/models/faucet');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faucet-config')
    .setDescription('Configure faucet settings (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('token_id')
        .setDescription('Token ID to distribute (e.g., 0.0.9356476)')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount_per_claim')
        .setDescription('Amount to distribute per claim (default: 1111)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel where faucet commands work')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role required to use faucet')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('nft_token_id')
        .setDescription('NFT token ID required to use faucet (e.g., 0.0.10032995)')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const tokenId = interaction.options.getString('token_id');
      const amountPerClaim = interaction.options.getInteger('amount_per_claim') || 1111;
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');
      const nftTokenId = interaction.options.getString('nft_token_id');

      // Validate token IDs format
      const tokenIdRegex = /^0\.0\.\d+$/;
      if (!tokenIdRegex.test(tokenId)) {
        await interaction.editReply({
          content: '❌ Invalid token ID format. Use format: 0.0.123456'
        });
        return;
      }

      if (!tokenIdRegex.test(nftTokenId)) {
        await interaction.editReply({
          content: '❌ Invalid NFT token ID format. Use format: 0.0.123456'
        });
        return;
      }

      // Validate amount
      if (amountPerClaim <= 0) {
        await interaction.editReply({
          content: '❌ Amount per claim must be greater than 0'
        });
        return;
      }

      // Save config
      await setFaucetConfig(interaction.guildId, {
        token_id: tokenId,
        amount_per_claim: amountPerClaim,
        reset_hour_est: 0,
        reset_minute_est: 0,
        channel_id: channel.id,
        role_id: role.id,
        nft_token_id: nftTokenId
      });

      const embed = new EmbedBuilder()
        .setColor('#00ff40')
        .setTitle('✅ Faucet Configured')
        .addFields(
          {
            name: '💰 Token ID',
            value: `\`${tokenId}\``,
            inline: true
          },
          {
            name: '📊 Amount Per Claim',
            value: `**${amountPerClaim}**`,
            inline: true
          },
          {
            name: '📍 Channel',
            value: `<#${channel.id}>`,
            inline: true
          },
          {
            name: '🎭 Required Role',
            value: `<@&${role.id}>`,
            inline: true
          },
          {
            name: '🎨 NFT Token ID',
            value: `\`${nftTokenId}\``,
            inline: true
          },
          {
            name: '⏰ Daily Reset',
            value: '**Midnight EST**',
            inline: true
          }
        )
        .setFooter({ text: 'Faucet is ready to use!' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Error configuring faucet:', error);
      await interaction.editReply({
        content: '❌ Error configuring faucet. Please try again.'
      });
    }
  }
};

