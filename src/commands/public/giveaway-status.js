const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllVerifiedUsers, getUserGiveawayEntry, getGiveawayEntries } = require('../../database/models/rules');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway-status')
    .setDescription('Check your giveaway entry status and current active giveaway'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Check if user has verified wallet
      const verifiedUsers = await getAllVerifiedUsers();
      const userVerification = verifiedUsers.find(user => 
        user.user_id === interaction.user.id && user.guild_id === interaction.guildId
      );

      if (!userVerification) {
        await interaction.editReply({
          content: '❌ **Wallet Not Verified**\n\n' +
                   'You must verify your wallet first to check giveaway status!\n' +
                   'Use `/verify-wallet` to get started.'
        });
        return;
      }

      // Check if giveaway is active
      const faucetService = interaction.client.faucetService;
      if (!faucetService) {
        await interaction.editReply({
          content: '❌ Faucet service not available. Please contact bot administrator.'
        });
        return;
      }

      const activeGiveaway = faucetService.getActiveGiveaway(interaction.guildId);
      
      if (!activeGiveaway || !activeGiveaway.isActive) {
        // No active giveaway
        const embed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('📭 No Active Giveaway')
          .setDescription('There is currently no active giveaway in this server.')
          .addFields(
            {
              name: '💼 Your Verified Wallet',
              value: `\`${userVerification.wallet_address}\``,
              inline: false
            },
            {
              name: '📋 What to do',
              value: '• Wait for an admin to start a giveaway\n' +
                     '• Use `/giveaway-help` for more information\n' +
                     '• Make sure you own tokens from this collection to participate!',
              inline: false
            }
          )
          .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Get user's entry status
      const userEntry = await getUserGiveawayEntry(
        interaction.user.id,
        interaction.guildId,
        activeGiveaway.id
      );

      // Get total entries for stats
      const allEntries = await getGiveawayEntries(interaction.guildId, activeGiveaway.id);
      const totalEntries = allEntries.length;
      const totalTickets = allEntries.reduce((sum, entry) => sum + entry.ticket_count, 0);

      // Calculate time remaining
      const timeRemaining = activeGiveaway.endTime - Date.now();
      const timeRemainingText = this.formatTimeRemaining(timeRemaining);

      // Create status embed
      const embed = new EmbedBuilder()
        .setColor(userEntry ? '#00ff40' : '#ffaa00')
        .setTitle('🎁 Giveaway Status')
        .setDescription(`Current giveaway information and your entry status`)
        .addFields(
          {
            name: '⏰ Time Remaining',
            value: timeRemainingText,
            inline: true
          },
          {
            name: '👥 Total Entries',
            value: `${totalEntries} participants`,
            inline: true
          },
          {
            name: '🎫 Total Tickets',
            value: `${totalTickets} tickets`,
            inline: true
          }
        );

      if (userEntry) {
        // User has entered
        const winChance = totalTickets > 0 ? ((userEntry.ticket_count / totalTickets) * 100).toFixed(2) : '0';
        
        embed.addFields(
          {
            name: '✅ Your Entry Status',
            value: '**ENTERED**',
            inline: true
          },
          {
            name: '🎫 Your Tickets',
            value: `${userEntry.ticket_count}`,
            inline: true
          },
          {
            name: '📊 Win Chance',
            value: `~${winChance}%`,
            inline: true
          },
          {
            name: '💼 Your Wallet',
            value: `\`${userEntry.wallet_address}\``,
            inline: false
          },
          {
            name: '📅 Entered At',
            value: `<t:${Math.floor(new Date(userEntry.entered_at).getTime() / 1000)}:R>`,
            inline: false
          }
        );
      } else {
        // User hasn't entered
        embed.addFields(
          {
            name: '❌ Your Entry Status',
            value: '**NOT ENTERED**',
            inline: false
          },
          {
            name: '💼 Your Verified Wallet',
            value: `\`${userVerification.wallet_address}\``,
            inline: false
          },
          {
            name: '🎯 How to Enter',
            value: 'Use `/enter-giveaway` to participate!\nYour ticket count will be based on your current token holdings.',
            inline: false
          }
        );
      }

      embed.setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      console.log(`📊 Giveaway status checked by ${interaction.user.tag}`);

    } catch (error) {
      console.error('❌ Error in giveaway-status command:', error);
      await interaction.editReply({
        content: '❌ **Error checking giveaway status.** Please try again later.'
      });
    }
  },

  formatTimeRemaining(ms) {
    if (ms <= 0) return '**ENDED**';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `**${days}d ${hours}h ${minutes}m**`;
    } else if (hours > 0) {
      return `**${hours}h ${minutes}m**`;
    } else {
      return `**${minutes}m**`;
    }
  }
};
