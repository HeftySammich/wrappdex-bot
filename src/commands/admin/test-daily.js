const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-daily')
    .setDescription('Test the daily message (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Get the daily message service from the bot
      const dailyMessage = interaction.client.dailyMessage;
      if (!dailyMessage) {
        await interaction.editReply({
          content: '❌ Daily message service not found. Please contact bot administrator.'
        });
        return;
      }

      await interaction.editReply({
        content: '🧪 **Testing Daily Message...**\n\nSending test daily report to the channel now!'
      });

      // Trigger the daily message test
      await dailyMessage.testDailyMessage();

      console.log(`✅ Daily message test triggered by ${interaction.user.tag}`);

    } catch (error) {
      console.error('❌ Error in test-daily command:', error);
      await interaction.editReply({
        content: '❌ **Error testing daily message.** Please try again later.'
      });
    }
  }
};
