const cron = require('node-cron');
const { getAllVerifiedUsers, addVerifiedUser } = require('../database/models/rules');
const { getNFTData } = require('./hederaService');
const { assignRolesBasedOnNFT } = require('./roleAssignment');
const { assignRole, removeRole } = require('./discordService');

class AutoScanner {
  constructor(client) {
    this.client = client;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Auto scanner is already running');
      return;
    }

    // Run every 30 minutes
    this.job = cron.schedule('*/30 * * * *', async () => {
      await this.scanAllUsers();
    }, {
      scheduled: false
    });

    this.job.start();
    this.isRunning = true;
    console.log('🔄 Auto scanner started - will run every 30 minutes');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.isRunning = false;
      console.log('⏹️ Auto scanner stopped');
    }
  }

  async scanAllUsers() {
    try {
      console.log('🔍 Starting automatic scan of all verified users...');
      const verifiedUsers = await getAllVerifiedUsers();
      console.log(`👥 Found ${verifiedUsers.length} verified users to scan`);

      let updatedCount = 0;
      
      for (const user of verifiedUsers) {
        try {
          const hasChanges = await this.scanUser(user);
          if (hasChanges) updatedCount++;
        } catch (error) {
          console.error(`❌ Error scanning user ${user.user_id}:`, error.message);
        }
      }

      console.log(`✅ Automatic scan complete! Updated ${updatedCount} users`);
    } catch (error) {
      console.error('❌ Error in automatic scan:', error);
    }
  }

  async scanUser(user) {
    const { user_id, guild_id, wallet_address, last_nft_count, last_serials } = user;
    
    // Get current NFT data
    const currentNFTData = await getNFTData(wallet_address);
    const currentSerials = currentNFTData.serials.sort((a, b) => a - b);
    const previousSerials = last_serials ? last_serials.split(',').map(Number).sort((a, b) => a - b) : [];
    
    // Check if anything changed
    const quantityChanged = currentNFTData.quantity !== last_nft_count;
    const serialsChanged = JSON.stringify(currentSerials) !== JSON.stringify(previousSerials);
    
    if (!quantityChanged && !serialsChanged) {
      // No changes, just update last_checked timestamp
      await addVerifiedUser(user_id, guild_id, wallet_address, currentNFTData.quantity, currentNFTData.serials);
      return false;
    }

    console.log(`🔄 Changes detected for user ${user_id}:`);
    console.log(`  NFT count: ${last_nft_count} → ${currentNFTData.quantity}`);
    console.log(`  Serials: [${previousSerials.join(',')}] → [${currentSerials.join(',')}]`);

    // Get the guild and member
    const guild = this.client.guilds.cache.get(guild_id);
    if (!guild) {
      console.log(`⚠️ Guild ${guild_id} not found, skipping user ${user_id}`);
      return false;
    }

    const member = await guild.members.fetch(user_id).catch(() => null);
    if (!member) {
      console.log(`⚠️ Member ${user_id} not found in guild ${guild_id}`);
      return false;
    }

    // Get current roles that should be assigned
    const newRoles = await assignRolesBasedOnNFT(currentNFTData, guild_id);
    const oldRoles = await assignRolesBasedOnNFT(
      { quantity: last_nft_count, serials: previousSerials, ownsToken: last_nft_count > 0 },
      guild_id
    );

    // Remove roles that no longer apply
    for (const roleId of oldRoles) {
      if (!newRoles.includes(roleId)) {
        const success = await removeRole(member, roleId);
        if (success) {
          const role = guild.roles.cache.get(roleId);
          console.log(`➖ Removed role ${role ? role.name : roleId} from ${member.user.tag}`);
        }
      }
    }

    // Add new roles
    for (const roleId of newRoles) {
      if (!oldRoles.includes(roleId)) {
        const success = await assignRole(member, roleId);
        if (success) {
          const role = guild.roles.cache.get(roleId);
          console.log(`➕ Added role ${role ? role.name : roleId} to ${member.user.tag}`);
        }
      }
    }

    // Update user record
    await addVerifiedUser(user_id, guild_id, wallet_address, currentNFTData.quantity, currentNFTData.serials);
    
    return true;
  }

  // Manual scan trigger for testing
  async manualScan() {
    console.log('🔧 Manual scan triggered');
    await this.scanAllUsers();
  }
}

module.exports = AutoScanner;
