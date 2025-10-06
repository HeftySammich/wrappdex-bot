const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction-role-setup')
    .setDescription('Create a new reaction role message (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to post the reaction role message')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of the reaction role embed')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description text for the reaction role embed')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor('#00A1D6')
        .setTitle(title)
        .setDescription(description + '\n\n*No reaction roles configured yet. Use `/reaction-role-add` to add emoji-role pairs.*')
        .setFooter({
          text: `Created by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      // Send the embed to the target channel
      const message = await channel.send({ embeds: [embed] });

      await interaction.editReply({
        content: `✅ **Reaction Role Message Created!**\n\n` +
                 `📍 **Channel:** ${channel}\n` +
                 `📝 **Message ID:** \`${message.id}\`\n\n` +
                 `**Next Steps:**\n` +
                 `Use \`/reaction-role-add message_id:${message.id} emoji:🎮 role:@RoleName\` to add reaction roles!`
      });

      console.log(`✅ Reaction role message created by ${interaction.user.tag} in ${channel.name} (ID: ${message.id})`);

    } catch (error) {
      console.error('❌ Error in reaction-role-setup command:', error);
      await interaction.editReply({
        content: '❌ **Error creating reaction role message.** Please try again or check bot permissions.'
      });
    }
  }
};

