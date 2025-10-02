const { SlashCommandBuilder } = require('discord.js');
const { getAllVerifiedUsers, addGiveawayEntry, getUserGiveawayEntry } = require('../../database/models/rules');
const { getNFTData } = require('../../services/hederaService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enter-giveaway')
    .setDescription('Enter the active NFT giveaway'),

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
                   'You must verify your wallet first to enter giveaways!\n' +
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
        await interaction.editReply({
          content: '❌ **No Active Giveaway**\n\n' +
                   'There is currently no active giveaway in this server.\n' +
                   'Check back later or ask an admin to start one!'
        });
        return;
      }

      // Check if user already entered
      const existingEntry = await getUserGiveawayEntry(
        interaction.user.id,
        interaction.guildId,
        activeGiveaway.id
      );

      // Get current NFT data for ticket count
      const nftData = await getNFTData(userVerification.wallet_address);
      
      if (!nftData.ownsToken || nftData.quantity === 0) {
        await interaction.editReply({
          content: '❌ **No NFTs Found**\n\n' +
                   `Your verified wallet (\`${userVerification.wallet_address}\`) doesn't currently own any NFTs from this collection.\n` +
                   'You need at least 1 NFT to enter the giveaway!'
        });
        return;
      }

      // Add/update entry
      await addGiveawayEntry(
        interaction.user.id,
        interaction.guildId,
        userVerification.wallet_address,
        nftData.quantity,
        activeGiveaway.id
      );

      // Calculate time remaining
      const timeRemaining = activeGiveaway.endTime - Date.now();
      const timeRemainingText = this.formatTimeRemaining(timeRemaining);

      if (existingEntry) {
        // Updated existing entry
        await interaction.editReply({
          content: '✅ **Giveaway Entry Updated!**\n\n' +
                   `🎫 **Your Tickets:** ${nftData.quantity} (based on current NFT count)\n` +
                   `💼 **Wallet:** \`${userVerification.wallet_address}\`\n` +
                   `⏰ **Time Remaining:** ${timeRemainingText}\n\n` +
                   '🔄 Your ticket count was updated based on your current NFT holdings!'
        });
      } else {
        // New entry
        await interaction.editReply({
          content: '✅ **Successfully Entered Giveaway!**\n\n' +
                   `🎫 **Your Tickets:** ${nftData.quantity}\n` +
                   `💼 **Wallet:** \`${userVerification.wallet_address}\`\n` +
                   `⏰ **Time Remaining:** ${timeRemainingText}\n\n` +
                   '🍀 Good luck! Each NFT you own gives you one raffle ticket.'
        });
      }

      console.log(`🎫 ${interaction.user.tag} entered giveaway with ${nftData.quantity} tickets`);

    } catch (error) {
      console.error('❌ Error in enter-giveaway command:', error);
      await interaction.editReply({
        content: '❌ **Error entering giveaway.** Please try again later.'
      });
    }
  },

  formatTimeRemaining(ms) {
    if (ms <= 0) return 'Ended';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
};
