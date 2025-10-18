const { getRulesByGuild } = require('../database/models/rules');

async function assignRolesBasedOnNFT(nftData, guildId) {
  const rules = await getRulesByGuild(guildId);
  const rolesToAssign = [];

  for (const rule of rules) {
    const tokenType = rule.token_type || 'hts'; // Default to 'hts' for backward compatibility

    if (rule.type === 'quantity') {
      // Determine which quantity to check based on token_type
      const quantityToCheck = tokenType === 'nft' ? nftData.nftQuantity : nftData.quantity;

      if (quantityToCheck >= parseInt(rule.value)) {
        rolesToAssign.push(rule.role_id);
      }
    } else if (rule.type === 'serial') {
      // Serial rules only apply to NFTs
      if (tokenType === 'nft') {
        const [min, max] = rule.value.split('-').map(Number);
        if (nftData.serials.some(serial => serial >= min && serial <= max)) {
          rolesToAssign.push(rule.role_id);
        }
      }
    }
  }

  return rolesToAssign;
}

module.exports = { assignRolesBasedOnNFT };
