const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getAllReactionRolesByGuild } = require('../../database/models/rules');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction-role-list')
    .setDescription('List all reaction role messages in this server (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const reactionRoles = await getAllReactionRolesByGuild(interaction.guildId);

      if (reactionRoles.length === 0) {
        await interaction.editReply({
          content: '📭 **No Reaction Roles Found**\n\n' +
                   'There are no reaction role messages set up in this server.\n\n' +
                   'Use `/reaction-role-setup` to create one!'
        });
        return;
      }

      // Group by message ID
      const messageGroups = {};
      for (const rr of reactionRoles) {
        if (!messageGroups[rr.message_id]) {
          messageGroups[rr.message_id] = [];
        }
        messageGroups[rr.message_id].push(rr);
      }

      const embed = new EmbedBuilder()
        .setColor('#00A1D6')
        .setTitle('🎭 Reaction Role Messages')
        .setDescription(`Found ${Object.keys(messageGroups).length} reaction role message(s) in this server.`)
        .setTimestamp();

      for (const [messageId, roles] of Object.entries(messageGroups)) {
        const channel = interaction.guild.channels.cache.get(roles[0].channel_id);
        const channelName = channel ? `#${channel.name}` : 'Unknown Channel';
        
        let rolesList = '';
        for (const rr of roles) {
          const role = interaction.guild.roles.cache.get(rr.role_id);
          const roleName = role ? role.name : 'Unknown Role';
          rolesList += `${rr.emoji} → ${roleName}\n`;
        }

        embed.addFields({
          name: `📍 ${channelName}`,
          value: `**Message ID:** \`${messageId}\`\n` +
                 `**Roles:**\n${rolesList}\n` +
                 `[Jump to Message](https://discord.com/channels/${interaction.guildId}/${roles[0].channel_id}/${messageId})`,
          inline: false
        });
      }

      embed.setFooter({
        text: `Total: ${reactionRoles.length} emoji-role pair(s)`,
        iconURL: interaction.client.user.displayAvatarURL()
      });

      await interaction.editReply({ embeds: [embed] });

      console.log(`✅ Reaction role list viewed by ${interaction.user.tag}`);

    } catch (error) {
      console.error('❌ Error in reaction-role-list command:', error);
      await interaction.editReply({
        content: '❌ **Error loading reaction roles.** Please try again.'
      });
    }
  }
};

