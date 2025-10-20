const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateFaucetClaim, toggleFaucet, getFaucetConfig } = require('../../database/models/faucet');
const FaucetDripService = require('../../services/faucetDripService');
const { getAllVerifiedUsers } = require('../../database/models/rules');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faucet')
    .setDescription('Manage your faucet drips')
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Turn your faucet ON or OFF')
        .addStringOption(option =>
          option.setName('state')
            .setDescription('Turn faucet ON or OFF')
            .setRequired(true)
            .addChoices(
              { name: 'ON', value: 'on' },
              { name: 'OFF', value: 'off' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('claim')
        .setDescription('Claim your daily hbar.h drip')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check your faucet status and next claim time')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const faucetService = new FaucetDripService(interaction.client);
    const config = await getFaucetConfig(interaction.guildId);

    // Check if faucet is configured
    if (!config) {
      await interaction.reply({
        content: '⚠️ Faucet is not configured for this server. Please contact an administrator.',
        ephemeral: true
      });
      return;
    }

    // Check if command is in correct channel
    if (interaction.channelId !== config.channel_id) {
      await interaction.reply({
        content: `❌ Faucet commands can only be used in <#${config.channel_id}>`,
        ephemeral: true
      });
      return;
    }

    // Get user's verified wallet
    const verifiedUsers = await getAllVerifiedUsers();
    const userVerification = verifiedUsers.find(user =>
      user.user_id === interaction.user.id && user.guild_id === interaction.guildId
    );

    if (!userVerification) {
      await interaction.reply({
        content: '❌ You need to verify your wallet first using `/verify-wallet`',
        ephemeral: true
      });
      return;
    }

    try {
      if (subcommand === 'toggle') {
        const state = interaction.options.getString('state');
        const isActive = state === 'on';

        await toggleFaucet(interaction.user.id, interaction.guildId, isActive);

        const statusEmoji = isActive ? '🟢' : '🔴';
        const statusText = isActive ? 'ON' : 'OFF';

        const embed = new EmbedBuilder()
          .setColor(isActive ? '#00ff40' : '#ff0000')
          .setTitle(`${statusEmoji} Faucet ${statusText}`)
          .setDescription(
            isActive
              ? '✅ Your faucet is now **ON**. You will receive daily drips at midnight EST!'
              : '❌ Your faucet is now **OFF**. You will not receive drips until you turn it back ON.'
          )
          .setFooter({ text: 'Use /faucet status to check your status' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (subcommand === 'claim') {
        await interaction.deferReply({ ephemeral: true });

        // Verify access (role + NFT)
        const accessCheck = await faucetService.verifyAccess(
          interaction.member,
          interaction.guildId,
          userVerification.wallet_address,
          config
        );

        if (!accessCheck.hasAccess) {
          await interaction.editReply({ content: accessCheck.reason });
          return;
        }

        // Process claim
        const claimResult = await faucetService.processClaim(
          interaction.user.id,
          interaction.guildId,
          userVerification.wallet_address,
          config
        );

        if (!claimResult.success) {
          await interaction.editReply({ content: claimResult.message });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor('#00ff40')
          .setTitle('💰 Claim Successful!')
          .setDescription(claimResult.message)
          .addFields(
            {
              name: '📊 Amount Claimed',
              value: `**${claimResult.amount} hbar.h**`,
              inline: true
            },
            {
              name: '⏰ Next Claim',
              value: '**Tomorrow at Midnight EST**',
              inline: true
            }
          )
          .setFooter({ text: 'Use /faucet status to check your total claimed' });

        await interaction.editReply({ embeds: [embed] });
      } else if (subcommand === 'status') {
        await interaction.deferReply({ ephemeral: true });

        const status = await faucetService.getStatus(
          interaction.user.id,
          interaction.guildId,
          userVerification.wallet_address
        );

        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('📊 Faucet Status')
          .addFields(
            {
              name: '🔌 Faucet Status',
              value: status.faucetStatus,
              inline: true
            },
            {
              name: '💧 Claim Status',
              value: status.claimStatus,
              inline: true
            },
            {
              name: '💰 Total Claimed',
              value: `**${status.totalClaimed} hbar.h**`,
              inline: true
            },
            {
              name: '📈 Per Claim',
              value: `**${status.amountPerClaim} hbar.h**`,
              inline: true
            },
            {
              name: '⏱️ Next Reset',
              value: `**${status.nextResetIn}**\n${status.nextResetTime}`,
              inline: false
            }
          )
          .setFooter({ text: 'All times in EST timezone' });

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('❌ Error in faucet command:', error);
      await interaction.editReply({
        content: '❌ An error occurred. Please try again later.'
      });
    }
  }
};

