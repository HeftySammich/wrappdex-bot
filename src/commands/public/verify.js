const { SlashCommandBuilder } = require('discord.js');
const { getNFTData } = require('../../services/hederaService');
const { assignRolesBasedOnNFT } = require('../../services/roleAssignment');
const { assignRole } = require('../../services/discordService');
const { addVerifiedUser } = require('../../database/models/rules');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify-wallet')
    .setDescription('Verify your Hedera wallet to get roles')
    .addStringOption(option =>
      option.setName('accountid')
        .setDescription('Your Hedera account ID (e.g., 0.0.1231234)')
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const accountId = interaction.options.getString('accountid');

    try {
      console.log(`🔍 Verifying wallet: ${accountId}`);
      const nftData = await getNFTData(accountId);
      console.log(`📊 NFT Data:`, nftData);

      if (!nftData.ownsToken) {
        const { TOKEN_IDS } = require('../../utils/constants');
        await interaction.editReply({
          content: `❌ **No Tokens Found**\n\n` +
                   `🔍 **Wallet:** \`${accountId}\`\n` +
                   `📋 **Tokens:** \`${TOKEN_IDS.join(', ')}\`\n\n` +
                   `This wallet doesn't own any tokens from these collections.`
        });
        return;
      }

      const roles = await assignRolesBasedOnNFT(nftData, interaction.guildId);
      console.log(`🎭 Roles to assign:`, roles);

      let assignedRoles = [];
      for (const roleId of roles) {
        const success = await assignRole(interaction.member, roleId);
        if (success) {
          const role = interaction.guild.roles.cache.get(roleId);
          assignedRoles.push(role ? role.name : roleId);
        }
      }

      // Track this user for automatic scanning
      await addVerifiedUser(
        interaction.user.id,
        interaction.guildId,
        accountId,
        nftData.quantity,
        nftData.serials
      );
      console.log(`👤 Added user ${interaction.user.tag} to automatic scanning`);

      // Build success message
      let successMessage = `✅ **Verification Complete!**\n\n` +
                           `🔍 **Wallet:** \`${accountId}\`\n` +
                           `🎯 **Tokens Found:** ${nftData.quantity}\n`;

      // Only show serial numbers if they exist (for NFTs)
      if (nftData.serials && nftData.serials.length > 0) {
        successMessage += `📋 **Serial Numbers:** ${nftData.serials.join(', ')}\n`;
      }

      successMessage += `\n🎭 **Roles Assigned:** ${assignedRoles.length > 0 ? assignedRoles.join(', ') : 'None (no matching rules)'}\n\n` +
                        `🔄 **Auto-Scan Enabled:** Your roles will be automatically updated every 30 minutes!`;

      await interaction.editReply({
        content: successMessage
      });
    } catch (error) {
      console.error('❌ Error in verify command:', error);
      await interaction.editReply({
        content: `❌ **Verification Failed**\n\n` +
                 `There was an error checking your wallet. Please try again later.`
      });
    }
  }
};
