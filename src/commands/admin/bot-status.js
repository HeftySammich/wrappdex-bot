const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db, isProduction } = require('../../database/db');
const { getRulesByGuild, getAllVerifiedUsers } = require('../../database/models/rules');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot-status')
    .setDescription('Show bot status, database connection, and statistics (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const statusEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🤖 Bot Status Dashboard')
        .setThumbnail(interaction.client.user.displayAvatarURL());

      // Database Status
      let dbStatus = '';
      let dbConnectionTest = '';
      
      try {
        if (isProduction) {
          // Test PostgreSQL connection
          const result = await db.query('SELECT NOW() as current_time');
          dbStatus = '✅ PostgreSQL Connected';
          dbConnectionTest = `Server Time: ${result.rows[0].current_time}`;
        } else {
          // SQLite connection
          dbStatus = '✅ SQLite Connected';
          dbConnectionTest = 'Local development database';
        }
      } catch (dbError) {
        dbStatus = '❌ Database Connection Failed';
        dbConnectionTest = `Error: ${dbError.message}`;
      }

      // Get statistics
      let totalVerifiedUsers = 0;
      let guildVerifiedUsers = 0;
      let totalRules = 0;
      let guildRules = 0;

      try {
        const allVerifiedUsers = await getAllVerifiedUsers();
        totalVerifiedUsers = allVerifiedUsers.length;
        guildVerifiedUsers = allVerifiedUsers.filter(user => user.guild_id === interaction.guildId).length;

        const rules = await getRulesByGuild(interaction.guildId);
        guildRules = rules.length;
        
        // Get total rules across all guilds (if PostgreSQL)
        if (isProduction) {
          const allRulesResult = await db.query('SELECT COUNT(*) as count FROM rules');
          totalRules = parseInt(allRulesResult.rows[0].count);
        } else {
          totalRules = guildRules; // SQLite only has one guild typically
        }
      } catch (statsError) {
        console.error('Error getting statistics:', statsError);
      }

      // Bot uptime
      const uptime = process.uptime();
      const uptimeHours = Math.floor(uptime / 3600);
      const uptimeMinutes = Math.floor((uptime % 3600) / 60);
      const uptimeSeconds = Math.floor(uptime % 60);

      // Memory usage
      const memUsage = process.memoryUsage();
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      statusEmbed.addFields(
        {
          name: '🗄️ Database Status',
          value: `${dbStatus}\n${dbConnectionTest}`,
          inline: true
        },
        {
          name: '📊 This Server Stats',
          value: `**Verified Users:** ${guildVerifiedUsers}\n**Rules:** ${guildRules}`,
          inline: true
        },
        {
          name: '🌐 Global Stats',
          value: `**Total Verified:** ${totalVerifiedUsers}\n**Total Rules:** ${totalRules}`,
          inline: true
        },
        {
          name: '⏱️ Bot Uptime',
          value: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
          inline: true
        },
        {
          name: '💾 Memory Usage',
          value: `${memUsedMB}MB / ${memTotalMB}MB`,
          inline: true
        },
        {
          name: '🔧 Environment',
          value: `**Database:** ${isProduction ? 'PostgreSQL' : 'SQLite'}\n**Node.js:** ${process.version}`,
          inline: true
        }
      );

      // Add service status
      const { TOKEN_IDS } = require('../../utils/constants');
      let serviceStatus = '';
      serviceStatus += '🔄 **Auto Scanner:** Running (30min intervals)\n';
      serviceStatus += '📈 **Sales Monitor:** Running (2min intervals)\n';
      serviceStatus += `🎯 **Token IDs:** ${TOKEN_IDS.join(', ')}\n`;
      serviceStatus += '🌐 **Hedera Network:** Mainnet';

      statusEmbed.addFields({
        name: '⚙️ Services Status',
        value: serviceStatus,
        inline: false
      });

      statusEmbed.setFooter({ 
        text: `Requested by ${interaction.user.tag} • Bot: ${interaction.client.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      });

      await interaction.editReply({ embeds: [statusEmbed] });

      console.log(`✅ Bot-status command used by ${interaction.user.tag}`);

    } catch (error) {
      console.error('❌ Error in bot-status command:', error);
      
      const errorMessage = 'Sorry, there was an error retrieving bot status. Please try again or contact a developer.';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};
