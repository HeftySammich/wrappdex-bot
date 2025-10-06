const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction-role-setup')
    .setDescription('Create a new reaction role message with modal (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to post the reaction role message')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const channel = interaction.options.getChannel('channel');

      // Store channel ID for later use
      const channelId = channel.id;

      // Create modal
      const modal = new ModalBuilder()
        .setCustomId(`reaction_role_modal_${channelId}`)
        .setTitle('Create Reaction Role Message');

      // Title and Description combined (to save space for more pairs)
      const titleDescInput = new TextInputBuilder()
        .setCustomId('title_desc')
        .setLabel('Title | Description (separate with |)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Choose Your Roles! | React below to get roles')
        .setRequired(true)
        .setMaxLength(300);

      // Emoji-Role Pair 1
      const pair1Input = new TextInputBuilder()
        .setCustomId('pair1')
        .setLabel('Pair 1: emoji @role or emoji role_id')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('🎮 @Gamer')
        .setRequired(false)
        .setMaxLength(100);

      // Emoji-Role Pair 2
      const pair2Input = new TextInputBuilder()
        .setCustomId('pair2')
        .setLabel('Pair 2: emoji @role or emoji role_id')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('🎨 @Artist')
        .setRequired(false)
        .setMaxLength(100);

      // Emoji-Role Pair 3
      const pair3Input = new TextInputBuilder()
        .setCustomId('pair3')
        .setLabel('Pair 3: emoji @role or emoji role_id')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('💰 @Trader')
        .setRequired(false)
        .setMaxLength(100);

      // Emoji-Role Pair 4
      const pair4Input = new TextInputBuilder()
        .setCustomId('pair4')
        .setLabel('Pair 4: emoji @role or emoji role_id')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('📰 @News')
        .setRequired(false)
        .setMaxLength(100);

      // Add inputs to action rows (max 5 rows in a modal)
      const row1 = new ActionRowBuilder().addComponents(titleDescInput);
      const row2 = new ActionRowBuilder().addComponents(pair1Input);
      const row3 = new ActionRowBuilder().addComponents(pair2Input);
      const row4 = new ActionRowBuilder().addComponents(pair3Input);
      const row5 = new ActionRowBuilder().addComponents(pair4Input);

      modal.addComponents(row1, row2, row3, row4, row5);

      // Show modal
      await interaction.showModal(modal);

      console.log(`📝 Reaction role modal shown to ${interaction.user.tag} for channel ${channel.name}`);

    } catch (error) {
      console.error('❌ Error in reaction-role-setup command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ **Error showing modal.** Please try again.',
          ephemeral: true
        });
      }
    }
  }
};

