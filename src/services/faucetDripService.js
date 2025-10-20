const { getOrCreateFaucetClaim, updateLastClaim, getFaucetConfig } = require('../database/models/faucet');
const { getNFTData } = require('./hederaService');
const { transferToken } = require('./hederaTransactions');

class FaucetDripService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Get current time in EST timezone
   */
  getEstTime() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  }

  /**
   * Get next reset time (midnight EST)
   */
  getNextResetTime() {
    const estNow = this.getEstTime();
    const nextReset = new Date(estNow);
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(0, 0, 0, 0);
    return nextReset;
  }

  /**
   * Check if user can claim (hasn't claimed today)
   */
  async canClaim(userId, guildId, walletAddress) {
    try {
      const claim = await getOrCreateFaucetClaim(userId, guildId, walletAddress);

      console.log(`🔍 Claim check for user ${userId}:`);
      console.log(`   - Faucet active: ${claim.is_faucet_active}`);
      console.log(`   - Last claim timestamp: ${claim.last_claim_timestamp}`);

      if (!claim.is_faucet_active) {
        return {
          canClaim: false,
          reason: '❌ Your faucet is currently OFF. Use `/faucet toggle` to turn it ON.'
        };
      }

      const estNow = this.getEstTime();
      const todayStart = new Date(estNow);
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();

      console.log(`   - EST now: ${estNow.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
      console.log(`   - Today start (EST): ${todayStart.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);

      // If no last claim, they can claim
      if (!claim.last_claim_timestamp) {
        console.log(`   ✅ No previous claim - user can claim`);
        return { canClaim: true };
      }

      const lastClaimDate = new Date(claim.last_claim_timestamp);
      const lastClaimEstDate = new Date(lastClaimDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      lastClaimEstDate.setHours(0, 0, 0, 0);
      const lastClaimDateMs = lastClaimEstDate.getTime();

      console.log(`   - Last claim date (raw): ${lastClaimDate}`);
      console.log(`   - Last claim date (EST): ${lastClaimEstDate.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
      console.log(`   - Last claim date ms: ${lastClaimDateMs}`);
      console.log(`   - Today start ms: ${todayStartMs}`);
      console.log(`   - Dates equal: ${lastClaimDateMs === todayStartMs}`);

      // If last claim was today, they can't claim
      if (lastClaimDateMs === todayStartMs) {
        const nextReset = this.getNextResetTime();
        const timeUntilReset = nextReset.getTime() - estNow.getTime();
        const hoursLeft = Math.floor(timeUntilReset / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

        console.log(`   ❌ Already claimed today - blocking claim`);
        return {
          canClaim: false,
          reason: `⏳ You already claimed today! Next claim available in **${hoursLeft}h ${minutesLeft}m** at midnight EST.`,
          nextClaimTime: nextReset
        };
      }

      console.log(`   ✅ Last claim was before today - user can claim`);
      return { canClaim: true };
    } catch (error) {
      console.error('❌ Error checking claim eligibility:', error);
      throw error;
    }
  }

  /**
   * Verify user has required role and NFT holdings
   */
  async verifyAccess(member, guildId, walletAddress, config) {
    try {
      // Check role
      if (!member.roles.cache.has(config.role_id)) {
        return {
          hasAccess: false,
          reason: `❌ You need the <@&${config.role_id}> role to use the faucet.`
        };
      }

      // Check NFT holdings
      const nftData = await getNFTData(walletAddress);
      
      if (nftData.nftQuantity === 0) {
        return {
          hasAccess: false,
          reason: `❌ You don't hold any SNOBBLE NFTs. You need at least 1 to use the faucet.`
        };
      }

      return { hasAccess: true };
    } catch (error) {
      console.error('❌ Error verifying access:', error);
      throw error;
    }
  }

  /**
   * Get user's faucet status
   */
  async getStatus(userId, guildId, walletAddress) {
    try {
      const claim = await getOrCreateFaucetClaim(userId, guildId, walletAddress);
      const config = await getFaucetConfig(guildId);

      if (!config) {
        return {
          status: '⚠️ Faucet not configured for this server.',
          isActive: false
        };
      }

      const estNow = this.getEstTime();
      const nextReset = this.getNextResetTime();
      const timeUntilReset = nextReset.getTime() - estNow.getTime();
      const hoursLeft = Math.floor(timeUntilReset / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

      let claimStatus = '✅ Ready to claim!';
      let canClaimToday = true;

      if (claim.last_claim_timestamp) {
        const lastClaimDate = new Date(claim.last_claim_timestamp);
        const lastClaimEstDate = new Date(lastClaimDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        lastClaimEstDate.setHours(0, 0, 0, 0);
        
        const todayStart = new Date(estNow);
        todayStart.setHours(0, 0, 0, 0);

        if (lastClaimEstDate.getTime() === todayStart.getTime()) {
          claimStatus = `⏳ Already claimed today. Next claim in **${hoursLeft}h ${minutesLeft}m**`;
          canClaimToday = false;
        }
      }

      return {
        isActive: claim.is_faucet_active,
        faucetStatus: claim.is_faucet_active ? '🟢 ON' : '🔴 OFF',
        claimStatus,
        canClaimToday,
        totalClaimed: claim.total_claimed_amount,
        amountPerClaim: config.amount_per_claim,
        nextResetIn: `${hoursLeft}h ${minutesLeft}m`,
        nextResetTime: nextReset.toLocaleString('en-US', { timeZone: 'America/New_York' })
      };
    } catch (error) {
      console.error('❌ Error getting faucet status:', error);
      throw error;
    }
  }

  /**
   * Process a claim
   */
  async processClaim(userId, guildId, walletAddress, config) {
    try {
      console.log(`\n💧 Processing claim for user ${userId}`);
      const claimCheck = await this.canClaim(userId, guildId, walletAddress);

      if (!claimCheck.canClaim) {
        console.log(`   ❌ Claim blocked: ${claimCheck.reason}`);
        return {
          success: false,
          message: claimCheck.reason
        };
      }

      console.log(`   ✅ Claim check passed - proceeding with transfer`);

      // Transfer tokens to user's wallet
      const transferResult = await transferToken(
        walletAddress,
        config.token_id,
        config.amount_per_claim,
        8 // hbar.h has 8 decimals
      );

      if (!transferResult.success) {
        console.log(`   ❌ Transfer failed: ${transferResult.error}`);
        return {
          success: false,
          message: `❌ Token transfer failed: ${transferResult.error}`
        };
      }

      console.log(`   ✅ Transfer successful: ${transferResult.transactionId}`);

      // Update claim record only after successful transfer
      const now = Date.now();
      console.log(`   📝 Updating claim record with timestamp: ${now}`);
      await updateLastClaim(userId, guildId, config.amount_per_claim);
      console.log(`   ✅ Claim record updated`);

      return {
        success: true,
        amount: config.amount_per_claim,
        transactionId: transferResult.transactionId,
        message: `✅ Claimed **${config.amount_per_claim} hbar.h**! Next claim available tomorrow at midnight EST.\n📝 Transaction: \`${transferResult.transactionId}\``
      };
    } catch (error) {
      console.error('❌ Error processing claim:', error);
      return {
        success: false,
        message: `❌ Error processing claim: ${error.message}`
      };
    }
  }
}

module.exports = FaucetDripService;

