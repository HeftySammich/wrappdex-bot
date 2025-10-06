const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removeReactionRole, getReactionRolesByMessage } = require('../../database/models/rules');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction-role-remove')
    .setDescription('Remove an emoji-role pair from a reaction role message (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID to remove the reaction role from')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('The emoji to remove (e.g., 🎮)')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const messageId = interaction.options.getString('message_id');
      const emoji = interaction.options.getString('emoji');

      // Try to fetch the message
      let message = null;
      let channel = null;

      for (const [, ch] of interaction.guild.channels.cache) {
        if (ch.isTextBased()) {
          try {
            message = await ch.messages.fetch(messageId);
            channel = ch;
            break;
          } catch (err) {
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

      // Remove from database
      await removeReactionRole(messageId, emoji);

      // Remove the reaction from the message
      try {
        const userReactions = message.reactions.cache.filter(reaction => reaction.emoji.name === emoji || reaction.emoji.toString() === emoji);
        for (const reaction of userReactions.values()) {
          await reaction.remove();
        }
      } catch (error) {
        console.log('Could not remove reaction from message:', error.message);
      }

      // Update the embed
      const allReactionRoles = await getReactionRolesByMessage(messageId);

      if (message.embeds.length > 0) {
        const embed = message.embeds[0];

        // Get the base description (everything before "Available Roles")
        let baseDescription = embed.description;

        if (baseDescription.includes('\n\n**Available Roles:**')) {
          baseDescription = baseDescription.split('\n\n**Available Roles:**')[0];
        } else if (baseDescription.includes('\n\n*No reaction roles')) {
          baseDescription = baseDescription.split('\n\n*No reaction roles')[0];
        }

        if (allReactionRoles.length > 0) {
          let rolesList = '';
          for (const rr of allReactionRoles) {
            const rrRole = interaction.guild.roles.cache.get(rr.role_id);
            if (rrRole) {
              rolesList += `${rr.emoji} - ${rrRole.name}\n`;
            }
          }

          const updatedEmbed = {
            ...embed.data,
            description: baseDescription +
                         '\n\n**Available Roles:**\n' + rolesList +
                         '\n*React with any emoji above to receive that role!*\n*Remove your reaction to remove the role.*'
          };

          await message.edit({ embeds: [updatedEmbed] });
        } else {
          // No more reaction roles
          const updatedEmbed = {
            ...embed.data,
            description: baseDescription +
                         '\n\n*No reaction roles configured yet. Use `/reaction-role-add` to add emoji-role pairs.*'
          };

          await message.edit({ embeds: [updatedEmbed] });
        }
      }

      await interaction.editReply({
        content: `✅ **Reaction Role Removed!**\n\n` +
                 `Removed ${emoji} from the reaction role message.`
      });

      console.log(`✅ Reaction role removed: ${emoji} (Message: ${messageId})`);

    } catch (error) {
      console.error('❌ Error in reaction-role-remove command:', error);
      await interaction.editReply({
        content: '❌ **Error removing reaction role.** Please try again.'
      });
    }
  }
};

