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

  // Fetch collection data using Mirror Node + SentX
  async getSlimeData() {
    try {
      console.log('📊 Fetching collection data from Mirror Node and SentX...');

      // Get data in parallel
      const [uniqueHolders, newTokenSupply, marketplaceData] = await Promise.all([
        this.getUniqueHolders(),
        this.getNewTokenSupply(),
        this.getMarketplaceData()
      ]);

      return {
        supply: newTokenSupply,
        holders: uniqueHolders,
        floorPrice: marketplaceData.floorPrice,
        listedCount: marketplaceData.listedCount,
        volume24h: marketplaceData.volume24h,
        recentSales: marketplaceData.recentSales
      };
    } catch (error) {
      console.error('❌ Error fetching collection data:', error);
      return {
        supply: 0,
        holders: 0,
        floorPrice: 0,
        listedCount: 0,
        volume24h: 0,
        recentSales: 0
      };
    }
  }

  // Get unique holders across both tokens using Mirror Node with pagination
  async getUniqueHolders() {
    try {
      const allHolders = new Set();

      // Query both tokens with pagination
      for (const tokenId of TOKEN_IDS) {
        try {
          console.log(`🔍 Fetching all NFTs for token ${tokenId}...`);

          let nextLink = `${HEDERA_MIRROR_NODE_URL}/api/v1/tokens/${tokenId}/nfts?limit=100&order=asc`;
          let totalNFTs = 0;

          // Paginate through all NFTs for this token
          while (nextLink) {
            const response = await axios.get(nextLink);
            const data = response.data;
            const nfts = data.nfts || [];

            // Add all account IDs to the set (automatically deduplicates)
            nfts.forEach(nft => {
              if (nft.account_id) {
                allHolders.add(nft.account_id);
              }
            });

            totalNFTs += nfts.length;

            // Check if there's a next page
            nextLink = data.links && data.links.next ?
              `${HEDERA_MIRROR_NODE_URL}${data.links.next}` :
              null;

            console.log(`📄 Token ${tokenId}: Processed ${totalNFTs} NFTs so far...`);

            // Add small delay to avoid overwhelming the API
            if (nextLink) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          console.log(`📊 Token ${tokenId}: Total ${totalNFTs} NFTs processed`);
        } catch (tokenError) {
          console.error(`❌ Error fetching holders for token ${tokenId}:`, tokenError.message);
        }
      }

      const uniqueHolderCount = allHolders.size;
      console.log(`👥 Total unique holders across both tokens: ${uniqueHolderCount}`);
      return uniqueHolderCount;
    } catch (error) {
      console.error('❌ Error getting unique holders:', error);
      return 0;
    }
  }

  // Get supply count for new token only using Mirror Node with pagination
  async getNewTokenSupply() {
    try {
      console.log(`🔍 Counting minted NFTs for new token ${NEW_TOKEN_ID}...`);

      let nextLink = `${HEDERA_MIRROR_NODE_URL}/api/v1/tokens/${NEW_TOKEN_ID}/nfts?limit=100&order=asc`;
      let totalSupply = 0;

      // Paginate through all NFTs for this token
      while (nextLink) {
        const response = await axios.get(nextLink);
        const data = response.data;
        const nfts = data.nfts || [];

        totalSupply += nfts.length;

        // Check if there's a next page
        nextLink = data.links && data.links.next ?
          `${HEDERA_MIRROR_NODE_URL}${data.links.next}` :
          null;

        console.log(`📄 New token: Counted ${totalSupply} NFTs so far...`);

        // Add small delay to avoid overwhelming the API
        if (nextLink) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`📊 New token (${NEW_TOKEN_ID}) supply: ${totalSupply} NFTs`);
      return totalSupply;
    } catch (error) {
      console.error('❌ Error getting new token supply:', error);
      return 0;
    }
  }

  // Get marketplace data from SentX for new token only
  async getMarketplaceData() {
    try {
      if (!SENTX_API_KEY) {
        console.warn('⚠️ SENTX_API_KEY not configured - marketplace data unavailable');
        return {
          floorPrice: 0,
          listedCount: 0,
          volume24h: 0,
          recentSales: 0
        };
      }

      console.log(`🔍 Fetching marketplace data for token ${NEW_TOKEN_ID} from SentX API...`);

      // Get listings data for the specific token
      const listingsResponse = await axios.get(`${SENTX_API_BASE_URL}/v1/public/market/listings`, {
        params: {
          apikey: SENTX_API_KEY,
          token: NEW_TOKEN_ID,
          limit: 10000 // Get all listings to count them
        }
      });

      const listings = listingsResponse.data.marketListings || [];
      const listedCount = listings.length;

      // Calculate floor price from listings
      let floorPrice = 0;
      if (listings.length > 0) {
        const prices = listings.map(listing => parseFloat(listing.salePrice || 0)).filter(price => price > 0);
        if (prices.length > 0) {
          floorPrice = Math.min(...prices); // Price is already in HBAR
        }
      }

      console.log(`📊 SentX marketplace data: ${listedCount} listings, floor price: ${floorPrice} HBAR`);

      return {
        floorPrice,
        listedCount,
        volume24h: 0, // TODO: Implement if SentX provides volume endpoint
        recentSales: 0 // TODO: Implement if SentX provides sales endpoint
      };
    } catch (error) {
      console.error('❌ Error fetching marketplace data from SentX:', error.message);
      if (error.response) {
        console.error('❌ SentX API response:', error.response.status, error.response.data);
      }
      return {
        floorPrice: 0,
        listedCount: 0,
        volume24h: 0,
        recentSales: 0
      };
    }
  }

  // Create the daily report embed
  async createDailyReportEmbed(hbarData, slimeData) {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // TODO: Customize this daily report embed for your community
    const embed = new EmbedBuilder()
      .setTitle('🌟 Daily Collection Report')
      .setColor('#00ff40') // Customize this color for your brand
      .setDescription('Your daily snapshot of HBAR price and NFT collection statistics')
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

    // NFT Collection Section
    const floorPriceDisplay = slimeData.floorPrice > 0 ?
      `${slimeData.floorPrice} HBAR` :
      'No active listings';

    const listedPercentage = slimeData.supply > 0 ?
      `${((slimeData.listedCount / slimeData.supply) * 100).toFixed(1)}%` :
      '0%';

    embed.addFields({
      name: '🎯 NFT Collection Stats',
      value:
        `**Total Supply:** ${slimeData.supply.toLocaleString()} NFTs\n` +
        `**Unique Holders:** ${slimeData.holders.toLocaleString()}\n` +
        `**Floor Price:** ${floorPriceDisplay}\n` +
        `**Listed for Sale:** ${slimeData.listedCount} NFTs (${listedPercentage} of supply)`,
      inline: false
    });

    // 24h Activity Section
    if (slimeData.volume24h > 0 || slimeData.recentSales > 0) {
      embed.addFields({
        name: '📈 24-Hour Trading Activity',
        value:
          `**Trading Volume:** ${slimeData.volume24h.toFixed(2)} HBAR\n` +
          `**Sales Count:** ${slimeData.recentSales} transaction${slimeData.recentSales !== 1 ? 's' : ''}`,
        inline: false
      });
    }

    embed.setFooter({
      text: `${today} • Data from Hedera Mirror Node, SentX & CoinGecko`
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
