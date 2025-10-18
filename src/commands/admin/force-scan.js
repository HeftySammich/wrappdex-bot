const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('force-scan')
    .setDescription('Force an immediate scan of all verified users and update roles (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      if (!interaction.client.autoScanner) {
        await interaction.editReply({
          content: 'Auto scanner is not initialized. Please try again later.'
        });
        return;
      }

      await interaction.editReply({
        content: 'Starting manual scan of all verified users... This may take a moment.'
      });

      // Trigger the manual scan
      await interaction.client.autoScanner.manualScan();

      await interaction.followUp({
        content: 'Manual scan completed! Check the bot logs for details on which users were updated.'
      });

      console.log(`Force scan triggered by ${interaction.user.tag}`);
    } catch (error) {
      console.error('Error in force-scan command:', error);
      await interaction.editReply({
        content: 'There was an error running the force scan. Please try again.'
      });
    }
  }
};

