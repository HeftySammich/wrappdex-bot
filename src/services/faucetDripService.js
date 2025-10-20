const { getOrCreateFaucetClaim, updateLastClaim, getFaucetConfig } = require('../database/models/faucet');
const { getNFTData } = require('./hederaService');

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

      // If no last claim, they can claim
      if (!claim.last_claim_timestamp) {
        return { canClaim: true };
      }

      const lastClaimDate = new Date(claim.last_claim_timestamp);
      const lastClaimEstDate = new Date(lastClaimDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      lastClaimEstDate.setHours(0, 0, 0, 0);
      const lastClaimDateMs = lastClaimEstDate.getTime();

      // If last claim was today, they can't claim
      if (lastClaimDateMs === todayStartMs) {
        const nextReset = this.getNextResetTime();
        const timeUntilReset = nextReset.getTime() - estNow.getTime();
        const hoursLeft = Math.floor(timeUntilReset / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

        return {
          canClaim: false,
          reason: `⏳ You already claimed today! Next claim available in **${hoursLeft}h ${minutesLeft}m** at midnight EST.`,
          nextClaimTime: nextReset
        };
      }

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
      const claimCheck = await this.canClaim(userId, guildId, walletAddress);
      
      if (!claimCheck.canClaim) {
        return {
          success: false,
          message: claimCheck.reason
        };
      }

      // Update claim record
      await updateLastClaim(userId, guildId, config.amount_per_claim);

      return {
        success: true,
        amount: config.amount_per_claim,
        message: `✅ Claimed **${config.amount_per_claim} hbar.h**! Next claim available tomorrow at midnight EST.`
      };
    } catch (error) {
      console.error('❌ Error processing claim:', error);
      throw error;
    }
  }
}

module.exports = FaucetDripService;

