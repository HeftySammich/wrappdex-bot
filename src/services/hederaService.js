const axios = require('axios');
const { TOKEN_IDS, HEDERA_MIRROR_NODE_URL } = require('../utils/constants');

/**
 * Get token type (FUNGIBLE or NFT) from Hedera Mirror Node
 */
async function getTokenType(tokenId) {
  try {
    const url = `${HEDERA_MIRROR_NODE_URL}/api/v1/tokens/${tokenId}`;
    const response = await axios.get(url, { timeout: 10000 }); // 10 second timeout
    return response.data.type; // Returns "FUNGIBLE_COMMON" or "NON_FUNGIBLE_UNIQUE"
  } catch (error) {
    console.error(`❌ Error getting token type for ${tokenId}:`, error.message);
    return null;
  }
}

async function getNFTData(accountId) {
  try {
    console.log(`🌐 Checking tokens for account: ${accountId}`);
    console.log(`🎯 Token IDs: ${TOKEN_IDS.join(', ')}`);

    let totalQuantity = 0;
    let htsQuantity = 0;
    let nftQuantity = 0;
    let allSerials = [];

    // Query each token ID and combine results
    for (const tokenId of TOKEN_IDS) {
      try {
        // First, check what type of token this is
        const tokenType = await getTokenType(tokenId);
        console.log(`🔍 Token ${tokenId} type: ${tokenType}`);

        if (tokenType === 'FUNGIBLE_COMMON') {
          // Query fungible token balance
          const url = `${HEDERA_MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`;
          console.log(`🔍 Querying fungible balance: ${url}`);

          const response = await axios.get(url, { timeout: 10000 }); // 10 second timeout
          const tokens = response.data.tokens || [];

          if (tokens.length > 0) {
            const balance = parseInt(tokens[0].balance);
            const decimals = parseInt(tokens[0].decimals);
            // Convert balance to whole tokens (divide by 10^decimals)
            const actualBalance = balance / Math.pow(10, decimals);

            console.log(`📊 Token ${tokenId}: Balance = ${actualBalance} tokens (raw: ${balance}, decimals: ${decimals})`);

            // For fungible tokens, we use the whole token balance as quantity
            const htsAmount = Math.floor(actualBalance);
            htsQuantity += htsAmount;
            totalQuantity += htsAmount;
          } else {
            console.log(`📊 Token ${tokenId}: No balance found`);
          }

        } else if (tokenType === 'NON_FUNGIBLE_UNIQUE') {
          // Query NFT holdings
          const url = `${HEDERA_MIRROR_NODE_URL}/api/v1/accounts/${accountId}/nfts?token.id=${tokenId}`;
          console.log(`🔍 Querying NFTs: ${url}`);

          const response = await axios.get(url, { timeout: 10000 }); // 10 second timeout
          const nfts = response.data.nfts || [];

          console.log(`📊 Token ${tokenId}: ${nfts.length} NFTs found`);

          nftQuantity += nfts.length;
          totalQuantity += nfts.length;
          allSerials = allSerials.concat(nfts.map(nft => nft.serial_number));
        } else {
          console.log(`⚠️ Unknown token type for ${tokenId}: ${tokenType}`);
        }

      } catch (tokenError) {
        console.error(`❌ Error querying token ${tokenId}:`, tokenError.message);
        // Continue with other tokens even if one fails
      }
    }

    console.log(`📈 Combined results: ${totalQuantity} total (HTS: ${htsQuantity}, NFT: ${nftQuantity})`);

    return {
      ownsToken: totalQuantity > 0,
      quantity: totalQuantity,
      htsQuantity: htsQuantity,
      nftQuantity: nftQuantity,
      serials: allSerials
    };
  } catch (error) {
    console.error('❌ Hedera API error:', error.message);
    console.error('❌ Full error:', error);
    return { ownsToken: false, quantity: 0, htsQuantity: 0, nftQuantity: 0, serials: [] };
  }
}

module.exports = { getNFTData };
