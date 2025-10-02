const { getRulesByGuild } = require('../database/models/rules');

async function assignRolesBasedOnNFT(nftData, guildId) {
  const rules = await getRulesByGuild(guildId);
  const rolesToAssign = [];

  for (const rule of rules) {
    if (rule.type === 'quantity' && nftData.quantity >= parseInt(rule.value)) {
      rolesToAssign.push(rule.role_id);
    } else if (rule.type === 'serial') {
      const [min, max] = rule.value.split('-').map(Number);
      if (nftData.serials.some(serial => serial >= min && serial <= max)) {
        rolesToAssign.push(rule.role_id);
      }
    }
  }

  return rolesToAssign;
}

module.exports = { assignRolesBasedOnNFT };
