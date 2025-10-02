const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-reaction-roles')
    .setDescription('Setup reaction roles for verification (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    try {
      // Get configuration from environment variables
      const VERIFICATION_CHANNEL_ID = process.env.VERIFICATION_CHANNEL_ID;
      const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
      const REACTION_EMOJI = process.env.REACTION_EMOJI;

      // Check if environment variables are configured
      if (!VERIFICATION_CHANNEL_ID || !VERIFIED_ROLE_ID || !REACTION_EMOJI) {
        return await interaction.reply({
          content: '❌ **Error**: Reaction roles not configured. Please set VERIFICATION_CHANNEL_ID, VERIFIED_ROLE_ID, and REACTION_EMOJI environment variables.',
          ephemeral: true
        });
      }

      // Get the verification channel
      const verificationChannel = interaction.guild.channels.cache.get(VERIFICATION_CHANNEL_ID);

      if (!verificationChannel) {
        return await interaction.reply({
          content: `❌ **Error**: Verification channel not found (ID: ${VERIFICATION_CHANNEL_ID})`,
          ephemeral: true
        });
      }

      // Check if the verified role exists
      const verifiedRole = interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);

      if (!verifiedRole) {
        return await interaction.reply({
          content: `❌ **Error**: Verified role not found (ID: ${VERIFIED_ROLE_ID})`,
          ephemeral: true
        });
      }
      
      // Create the embedded welcome message
      // TODO: Customize this embed for your community
      const welcomeEmbed = new EmbedBuilder()
        .setTitle(`🎉 Welcome to ${interaction.guild.name}!`)
        .setDescription(
          `**Get Started:**\n\n` +
          `React with ${REACTION_EMOJI} below to verify yourself and unlock access to the server!\n\n` +
          `**What's Next?**\n` +
          `• Get the verified role instantly\n` +
          `• Access all channels\n` +
          `• Use \`/verify-wallet\` to link your NFT wallet and get additional roles\n\n` +
          `We're glad you're here! 🚀`
        )
        .setColor(0x00FF00) // Green color - customize this hex code for your brand
        .setFooter({ text: 'React below to get started!' })
        .setTimestamp();

      // Send the embedded message to the verification channel
      const sentMessage = await verificationChannel.send({ embeds: [welcomeEmbed] });

      // Try to add the reaction emoji
      try {
        await sentMessage.react(REACTION_EMOJI);
      } catch (error) {
        console.error('❌ Error adding reaction emoji:', error);
        // If custom emoji fails, we'll still proceed but log the error
      }

      // Pin the message
      try {
        await sentMessage.pin();
      } catch (error) {
        console.error('❌ Error pinning message:', error);
      }

      // Reply to the admin with success message
      await interaction.reply({
        content: `✅ **Reaction Roles Setup Complete!**\n\n` +
                 `📍 **Channel**: ${verificationChannel}\n` +
                 `🎭 **Role**: ${verifiedRole}\n` +
                 `📝 **Message ID**: ${sentMessage.id}\n\n` +
                 `Users can now react with ${REACTION_EMOJI} to get the verified role!`,
        ephemeral: true
      });
      
      console.log(`✅ Reaction roles setup completed by ${interaction.user.tag}`);
      
    } catch (error) {
      console.error('❌ Error setting up reaction roles:', error);
      
      await interaction.reply({
        content: '❌ **Error**: Failed to setup reaction roles. Please check the bot permissions and try again.',
        ephemeral: true
      });
    }
  }
};
