const { EmbedBuilder } = require('discord.js');
const { transferNFT, getAvailableNFTs } = require('./hederaTransactions');
const { getGiveawayEntries, clearGiveawayEntries } = require('../database/models/rules');

class FaucetService {
  constructor(client) {
    this.client = client;
    this.activeGiveaways = new Map(); // guildId -> giveaway data
  }

  // Start a new giveaway
  async startGiveaway(guildId, channelId, duration, adminUser) {
    try {
      // Check if giveaway already active
      if (this.activeGiveaways.has(guildId)) {
        return {
          success: false,
          message: '❌ A giveaway is already active in this server!'
        };
      }

      // Check available NFTs
      const nftStatus = await getAvailableNFTs();
      if (!nftStatus.hasNFTs) {
        return {
          success: false,
          message: '❌ No NFTs available in faucet wallet for giveaway!'
        };
      }

      // Generate unique giveaway ID
      const giveawayId = `${guildId}_${Date.now()}`;
      
      // Calculate end time
      const durationMs = this.parseDuration(duration);
      const endTime = Date.now() + durationMs;

      // Store giveaway data
      const giveawayData = {
        id: giveawayId,
        guildId,
        channelId,
        duration,
        endTime,
        startedBy: adminUser.id,
        startedAt: Date.now(),
        isActive: true
      };

      this.activeGiveaways.set(guildId, giveawayData);

      // Set timer to end giveaway
      setTimeout(async () => {
        await this.endGiveaway(guildId);
      }, durationMs);

      // Create announcement embed
      // TODO: Customize this giveaway announcement for your community
      const embed = new EmbedBuilder()
        .setTitle('🎁 NFT GIVEAWAY STARTED! 🎁')
        .setColor('#00ff40') // Customize this color for your brand
        .setDescription('A new NFT giveaway has begun! Enter now for your chance to win!')
        .addFields(
          {
            name: '⏰ Duration',
            value: `**${duration}**`,
            inline: true
          },
          {
            name: '🎯 Prize',
            value: '**1 Random NFT from Collection**',
            inline: true
          },
          {
            name: '🎫 How to Enter',
            value: 'Use `/enter-giveaway` to participate!\n\n**Raffle System:** Each NFT you own = 1 ticket',
            inline: false
          },
          {
            name: '📋 Requirements',
            value: 'Must have verified wallet with `/verify-wallet`',
            inline: false
          }
        )
        .setFooter({
          text: `Started by ${adminUser.username} • Ends at`,
          iconURL: adminUser.displayAvatarURL()
        })
        .setTimestamp(new Date(endTime));

      return {
        success: true,
        embed,
        giveawayData
      };

    } catch (error) {
      console.error('❌ Error starting giveaway:', error);
      return {
        success: false,
        message: '❌ Error starting giveaway. Please try again.'
      };
    }
  }

  // End giveaway and pick winner
  async endGiveaway(guildId) {
    try {
      const giveawayData = this.activeGiveaways.get(guildId);
      if (!giveawayData || !giveawayData.isActive) {
        return;
      }

      // Mark as inactive
      giveawayData.isActive = false;

      // Get all entries
      const entries = await getGiveawayEntries(guildId, giveawayData.id);
      
      const channel = this.client.channels.cache.get(giveawayData.channelId);
      if (!channel) {
        console.error(`❌ Giveaway channel ${giveawayData.channelId} not found`);
        return;
      }

      if (entries.length === 0) {
        // No entries
        // TODO: Customize this no-entries message
        const embed = new EmbedBuilder()
          .setTitle('😔 Giveaway Ended - No Participants')
          .setColor('#ff0000')
          .setDescription('The NFT giveaway has ended with no entries. Better luck next time!')
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        this.activeGiveaways.delete(guildId);
        return;
      }

      // Pick weighted random winner
      const winner = this.pickWeightedWinner(entries);
      
      // Transfer NFT to winner
      const transferResult = await transferNFT(winner.wallet_address, null); // null = random available NFT

      let embed;
      if (transferResult.success) {
        // Success embed
        // TODO: Customize this winner announcement for your community
        embed = new EmbedBuilder()
          .setTitle('🎉 GIVEAWAY WINNER ANNOUNCED! 🎉')
          .setColor('#00ff40') // Customize this color for your brand
          .setDescription(`Congratulations to our winner! The NFT has been automatically sent to your verified wallet!`)
          .addFields(
            {
              name: '🏆 Winner',
              value: `<@${winner.user_id}>`,
              inline: true
            },
            {
              name: '🎫 Winning Tickets',
              value: `${winner.ticket_count} ticket${winner.ticket_count !== 1 ? 's' : ''}`,
              inline: true
            },
            {
              name: '👥 Total Participants',
              value: `${entries.length}`,
              inline: true
            },
            {
              name: '🎯 Prize Won',
              value: transferResult.serialNumber ? `**NFT #${transferResult.serialNumber}**` : '**1 NFT from Collection**',
              inline: false
            },
            {
              name: '💼 Wallet',
              value: `\`${winner.wallet_address}\``,
              inline: false
            },
            {
              name: '🔗 Transaction',
              value: transferResult.transactionId ? `Transaction ID: \`${transferResult.transactionId}\`` : 'Processing...',
              inline: false
            }
          )
          .setTimestamp();
      } else {
        // Error embed
        embed = new EmbedBuilder()
          .setTitle('⚠️ Giveaway Winner Selected')
          .setColor('#ffaa00')
          .setDescription('Winner selected but NFT transfer failed. Manual intervention required.')
          .addFields(
            {
              name: '🏆 Winner',
              value: `<@${winner.user_id}>`,
              inline: true
            },
            {
              name: '💼 Wallet',
              value: `\`${winner.wallet_address}\``,
              inline: false
            },
            {
              name: '❌ Error',
              value: transferResult.message,
              inline: false
            }
          )
          .setTimestamp();
      }

      await channel.send({ embeds: [embed] });

      // Clean up
      await clearGiveawayEntries(guildId, giveawayData.id);
      this.activeGiveaways.delete(guildId);

    } catch (error) {
      console.error('❌ Error ending giveaway:', error);
    }
  }

  // Pick weighted random winner
  pickWeightedWinner(entries) {
    // Calculate total tickets
    const totalTickets = entries.reduce((sum, entry) => sum + entry.ticket_count, 0);
    
    // Generate random number
    const randomNum = Math.floor(Math.random() * totalTickets) + 1;
    
    // Find winner based on weighted selection
    let currentSum = 0;
    for (const entry of entries) {
      currentSum += entry.ticket_count;
      if (randomNum <= currentSum) {
        return entry;
      }
    }
    
    // Fallback (shouldn't happen)
    return entries[0];
  }

  // Parse duration string to milliseconds
  parseDuration(duration) {
    const durationMap = {
      '5min': 5 * 60 * 1000,
      '30min': 30 * 60 * 1000,
      '1hr': 60 * 60 * 1000,
      '12hr': 12 * 60 * 60 * 1000,
      '24hr': 24 * 60 * 60 * 1000,
      '48hr': 48 * 60 * 60 * 1000
    };
    
    return durationMap[duration] || durationMap['1hr']; // Default to 1 hour
  }

  // Get active giveaway for guild
  getActiveGiveaway(guildId) {
    return this.activeGiveaways.get(guildId) || null;
  }

  // Check if giveaway is active
  isGiveawayActive(guildId) {
    const giveaway = this.activeGiveaways.get(guildId);
    return giveaway && giveaway.isActive && Date.now() < giveaway.endTime;
  }
}

module.exports = FaucetService;
