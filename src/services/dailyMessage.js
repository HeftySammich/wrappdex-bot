const cron = require('node-cron');
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const { TOKEN_IDS, NEW_TOKEN_ID, HEDERA_MIRROR_NODE_URL, SENTX_API_BASE_URL, SENTX_API_KEY } = require('../utils/constants');

class DailyMessage {
  constructor(client) {
    this.client = client;
    this.channelId = process.env.DAILY_MESSAGE_CHANNEL_ID;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Daily message service is already running');
      return;
    }

    if (!this.channelId) {
      console.log('⚠️ DAILY_MESSAGE_CHANNEL_ID not configured - daily message service disabled');
      return;
    }

    // Schedule daily message at 9 AM EST (2 PM UTC)
    this.cronJob = cron.schedule('0 14 * * *', async () => {
      await this.sendDailyMessage();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.isRunning = true;
    console.log('📅 Daily message service started - sending at 9 AM EST daily');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.isRunning = false;
      console.log('⏹️ Daily message service stopped');
    }
  }

  async sendDailyMessage() {
    try {
      const channel = this.client.channels.cache.get(this.channelId);
      if (!channel) {
        console.error(`❌ Daily message channel ${this.channelId} not found`);
        return;
      }

      console.log('📊 Fetching daily report data...');

      // Fetch all data in parallel
      const [hbarData, slimeData] = await Promise.all([
        this.getHbarData(),
        this.getSlimeData()
      ]);

      // Create embedded daily report
      const embed = await this.createDailyReportEmbed(hbarData, slimeData);

      await channel.send({ embeds: [embed] });
      console.log('✅ Daily collection report sent successfully');

    } catch (error) {
      console.error('❌ Error sending daily message:', error);

      // Fallback message if data fetching fails
      try {
        const fallbackEmbed = new EmbedBuilder()
          .setTitle('🌟 Daily Collection Report')
          .setColor('#00ff40')
          .setDescription('Unable to fetch live data at this time. Please check back later!')
          .setTimestamp();

        await channel.send({ embeds: [fallbackEmbed] });
        console.log('✅ Fallback daily message sent');
      } catch (fallbackError) {
        console.error('❌ Error sending fallback message:', fallbackError);
      }
    }
  }

  // Fetch HBAR price data from CoinGecko
  async getHbarData() {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd&include_market_cap=true&include_24hr_change=true');

      const hbarData = response.data['hedera-hashgraph'];

      return {
        price: hbarData.usd,
        marketCap: hbarData.usd_market_cap,
        change24h: hbarData.usd_24h_change
      };
    } catch (error) {
      console.error('❌ Error fetching HBAR data:', error);
      return {
        price: null,
        marketCap: null,
        change24h: null
      };
    }
  }

  // Fetch token data using Mirror Node (for fungible HTS tokens)
  async getSlimeData() {
    try {
      console.log('📊 Fetching token data from Mirror Node...');

      // Get data in parallel
      const [tokenInfo, uniqueHolders] = await Promise.all([
        this.getTokenInfo(),
        this.getUniqueHolders()
      ]);

      return {
        supply: tokenInfo.totalSupply,
        holders: uniqueHolders,
        decimals: tokenInfo.decimals,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol
      };
    } catch (error) {
      console.error('❌ Error fetching token data:', error);
      return {
        supply: 0,
        holders: 0,
        decimals: 8,
        name: 'Unknown',
        symbol: 'Unknown'
      };
    }
  }

  // Get token info (total supply, decimals, etc.) from Mirror Node
  async getTokenInfo() {
    try {
      const tokenId = TOKEN_IDS[0]; // Use first token ID (should be 0.0.9356476)
      console.log(`🔍 Fetching token info for ${tokenId}...`);

      const response = await axios.get(`${HEDERA_MIRROR_NODE_URL}/api/v1/tokens/${tokenId}`);
      const tokenData = response.data;

      const totalSupply = parseInt(tokenData.total_supply) / Math.pow(10, parseInt(tokenData.decimals));

      console.log(`📊 Token ${tokenId}: Total supply = ${totalSupply.toLocaleString()}`);

      return {
        totalSupply: Math.floor(totalSupply),
        decimals: parseInt(tokenData.decimals),
        name: tokenData.name,
        symbol: tokenData.symbol
      };
    } catch (error) {
      console.error('❌ Error getting token info:', error);
      return {
        totalSupply: 0,
        decimals: 8,
        name: 'Unknown',
        symbol: 'Unknown'
      };
    }
  }

  // Get unique holders for fungible token using Mirror Node with pagination
  async getUniqueHolders() {
    try {
      const tokenId = TOKEN_IDS[0]; // Use first token ID (should be 0.0.9356476)
      console.log(`🔍 Fetching token balances for ${tokenId}...`);

      let nextLink = `${HEDERA_MIRROR_NODE_URL}/api/v1/tokens/${tokenId}/balances?limit=100&order=asc`;
      let totalHolders = 0;

      // Paginate through all token balances
      while (nextLink) {
        const response = await axios.get(nextLink);
        const data = response.data;
        const balances = data.balances || [];

        // Count accounts with non-zero balance
        const holdersInPage = balances.filter(b => parseInt(b.balance) > 0).length;
        totalHolders += holdersInPage;

        // Check if there's a next page
        nextLink = data.links && data.links.next ?
          `${HEDERA_MIRROR_NODE_URL}${data.links.next}` :
          null;

        console.log(`📄 Token ${tokenId}: Counted ${totalHolders} holders so far...`);

        // Add small delay to avoid overwhelming the API
        if (nextLink) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`👥 Total holders for token ${tokenId}: ${totalHolders}`);
      return totalHolders;
    } catch (error) {
      console.error('❌ Error getting unique holders:', error);
      return 0;
    }
  }



  // Create the daily report embed
  async createDailyReportEmbed(hbarData, tokenData) {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const embed = new EmbedBuilder()
      .setTitle('🌟 Daily Collection Report')
      .setColor('#00A1D6') // WRAPpDEX brand color
      .setDescription('Your daily snapshot of HBAR price and token statistics')
      .setTimestamp();

    // HBAR Price Section
    if (hbarData.price) {
      const priceChange = hbarData.change24h ?
        (hbarData.change24h >= 0 ? `+${hbarData.change24h.toFixed(2)}%` : `${hbarData.change24h.toFixed(2)}%`) :
        'N/A';

      const marketCapFormatted = hbarData.marketCap ?
        `$${(hbarData.marketCap / 1000000000).toFixed(2)}B` :
        'N/A';

      embed.addFields({
        name: '💰 HBAR Market Data',
        value: `**Price:** $${hbarData.price.toFixed(4)} | **24h Change:** ${priceChange}\n**Market Cap:** ${marketCapFormatted}`,
        inline: false
      });
    }

    // Hbar.ħ Token Stats Section
    embed.addFields({
      name: '🎯 Hbar.ħ Stats',
      value:
        `**Total Supply:** ${tokenData.supply.toLocaleString()} ${tokenData.symbol || 'tokens'}\n` +
        `**Unique Holders:** ${tokenData.holders.toLocaleString()}\n` +
        `**Token Name:** ${tokenData.name || 'Hbar.ħ'}\n` +
        `**Decimals:** ${tokenData.decimals}`,
      inline: false
    });

    embed.setFooter({
      text: `${today} • Data from Hedera Mirror Node & CoinGecko`
    });

    return embed;
  }

  // Manual trigger for testing
  async testDailyMessage() {
    console.log('🔧 Manual daily message test triggered');
    await this.sendDailyMessage();
  }
}

module.exports = DailyMessage;
