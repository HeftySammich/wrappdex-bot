const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addRule } = require('../../database/models/rules');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-rules')
    .setDescription('Set role assignment rules')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Rule type (quantity or serial)')
        .setRequired(true)
        .addChoices(
          { name: 'Quantity', value: 'quantity' },
          { name: 'Serial', value: 'serial' }
        )
    )
    .addStringOption(option =>
      option.setName('value')
        .setDescription('Value (e.g., 5 for quantity, 100-200 for serial)')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to assign')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const type = interaction.options.getString('type');
      const value = interaction.options.getString('value');
      const role = interaction.options.getRole('role');

      await addRule(type, value, role.id, interaction.guildId);

      const typeDescription = type === 'quantity' ? 'NFTs owned' : 'Serial numbers';
      await interaction.reply({
        content: `✅ **Rule Added Successfully!**\n\n` +
                 `📋 **Rule Details:**\n` +
                 `• **Type:** ${typeDescription}\n` +
                 `• **Requirement:** ${value}\n` +
                 `• **Role:** ${role.name}\n\n` +
                 `🎯 Users can now use \`/verify-wallet\` to get this role!`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error adding rule:', error);
      await interaction.reply({
        content: '❌ **Error adding rule.** Please try again.',
        ephemeral: true
      });
    }
  }
};
