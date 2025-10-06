const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addReactionRole, getReactionRolesByMessage } = require('../../database/models/rules');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction-role-add')
    .setDescription('Add an emoji-role pair to a reaction role message (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID to add the reaction role to')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('The emoji to react with (e.g., 🎮 or :custom_emoji:)')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to assign when users react')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const messageId = interaction.options.getString('message_id');
      const emoji = interaction.options.getString('emoji');
      const role = interaction.options.getRole('role');

      // Try to fetch the message
      let message = null;
      let channel = null;

      // Search through all text channels in the guild
      for (const [, ch] of interaction.guild.channels.cache) {
        if (ch.isTextBased()) {
          try {
            message = await ch.messages.fetch(messageId);
            channel = ch;
            break;
          } catch (err) {
            // Message not in this channel, continue searching
            continue;
          }
        }
      }

      if (!message) {
        await interaction.editReply({
          content: `❌ **Message Not Found**\n\nCouldn't find a message with ID \`${messageId}\` in this server.`
        });
        return;
      }

      // Add the reaction to the message
      try {
        await message.react(emoji);
      } catch (error) {
        await interaction.editReply({
          content: `❌ **Invalid Emoji**\n\nCouldn't add reaction \`${emoji}\`. Make sure it's a valid emoji or custom emoji from this server.`
        });
        return;
      }

      // Save to database
      await addReactionRole(
        interaction.guildId,
        channel.id,
        messageId,
        emoji,
        role.id
      );

      // Update the embed to show the new reaction role
      const allReactionRoles = await getReactionRolesByMessage(messageId);

      if (message.embeds.length > 0) {
        const embed = message.embeds[0];
        let rolesList = '';

        for (const rr of allReactionRoles) {
          const rrRole = interaction.guild.roles.cache.get(rr.role_id);
          if (rrRole) {
            rolesList += `${rr.emoji} - ${rrRole.name}\n`;
          }
        }

        // Get the base description (everything before "Available Roles")
        let baseDescription = embed.description;

        // Remove old "Available Roles" section if it exists
        if (baseDescription.includes('\n\n**Available Roles:**')) {
          baseDescription = baseDescription.split('\n\n**Available Roles:**')[0];
        } else if (baseDescription.includes('\n\n*No reaction roles')) {
          baseDescription = baseDescription.split('\n\n*No reaction roles')[0];
        }

        const updatedEmbed = {
          ...embed.data,
          description: baseDescription +
                       '\n\n**Available Roles:**\n' + rolesList +
                       '\n*React with any emoji above to receive that role!*\n*Remove your reaction to remove the role.*'
        };

        await message.edit({ embeds: [updatedEmbed] });
      }

      await interaction.editReply({
        content: `✅ **Reaction Role Added!**\n\n` +
                 `${emoji} → ${role}\n\n` +
                 `Users can now react with ${emoji} to get the ${role} role!`
      });

      console.log(`✅ Reaction role added: ${emoji} → ${role.name} (Message: ${messageId})`);

    } catch (error) {
      console.error('❌ Error in reaction-role-add command:', error);
      await interaction.editReply({
        content: '❌ **Error adding reaction role.** Please try again.'
      });
    }
  }
};

