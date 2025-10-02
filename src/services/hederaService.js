const axios = require('axios');
const { TOKEN_IDS, HEDERA_MIRROR_NODE_URL } = require('../utils/constants');

async function getNFTData(accountId) {
  try {
    console.log(`🌐 Checking NFTs for account: ${accountId}`);
    console.log(`🎯 Token IDs: ${TOKEN_IDS.join(', ')}`);

    let totalNFTs = [];
    let totalQuantity = 0;
    let allSerials = [];

    // Query each token ID and combine results
    for (const tokenId of TOKEN_IDS) {
      try {
        const url = `${HEDERA_MIRROR_NODE_URL}/api/v1/accounts/${accountId}/nfts?token.id=${tokenId}`;
        console.log(`🔍 Querying: ${url}`);

        const response = await axios.get(url);
        const nfts = response.data.nfts || [];

        console.log(`📊 Token ${tokenId}: ${nfts.length} NFTs found`);

        totalNFTs = totalNFTs.concat(nfts);
        totalQuantity += nfts.length;
        allSerials = allSerials.concat(nfts.map(nft => nft.serial_number));
      } catch (tokenError) {
        console.error(`❌ Error querying token ${tokenId}:`, tokenError.message);
        // Continue with other tokens even if one fails
      }
    }

    console.log(`📈 Combined results: ${totalQuantity} total NFTs across both tokens`);

    return {
      ownsToken: totalQuantity > 0,
      quantity: totalQuantity,
      serials: allSerials
    };
  } catch (error) {
    console.error('❌ Hedera API error:', error.message);
    console.error('❌ Full error:', error);
    return { ownsToken: false, quantity: 0, serials: [] };
  }
}

module.exports = { getNFTData };
