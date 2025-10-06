const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-modal')
    .setDescription('Create a custom embed using a modal form (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      // Default to current channel, no pin
      const targetChannel = interaction.channel;
      const shouldPin = false;

      // Create the modal
      const modal = new ModalBuilder()
        .setCustomId(`embed_modal_${interaction.user.id}`)
        .setTitle('Create Custom Embed');

      // Title input
      const titleInput = new TextInputBuilder()
        .setCustomId('embed_title')
        .setLabel('Embed Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(256)
        .setPlaceholder('Enter the embed title...');

      // Description input (multi-line)
      const descriptionInput = new TextInputBuilder()
        .setCustomId('embed_description')
        .setLabel('Embed Description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(4000)
        .setPlaceholder('Enter description... Use Ctrl+Enter for new lines!');

      // Channel and options input
      const optionsInput = new TextInputBuilder()
        .setCustomId('embed_options')
        .setLabel('Channel & Options (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(100)
        .setPlaceholder('#channel-name pin (leave blank for current channel)');

      // Color input
      const colorInput = new TextInputBuilder()
        .setCustomId('embed_color')
        .setLabel('Color & Footer (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(100)
        .setPlaceholder('#00A1D6 | Footer text here');

      // Image URL input
      const imageInput = new TextInputBuilder()
        .setCustomId('embed_image')
        .setLabel('Image URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('https://example.com/image.png');

      // Add inputs to action rows
      const titleRow = new ActionRowBuilder().addComponents(titleInput);
      const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
      const optionsRow = new ActionRowBuilder().addComponents(optionsInput);
      const colorRow = new ActionRowBuilder().addComponents(colorInput);
      const imageRow = new ActionRowBuilder().addComponents(imageInput);

      // Add rows to modal (Discord allows max 5 components)
      modal.addComponents(titleRow, descriptionRow, optionsRow, colorRow, imageRow);

      // Show the modal
      await interaction.showModal(modal);

      console.log(`✅ Embed modal opened by ${interaction.user.tag}`);

    } catch (error) {
      console.error('❌ Error showing embed modal:', error);
      await interaction.reply({ 
        content: 'Sorry, there was an error opening the embed form. Please try again.', 
        ephemeral: true 
      });
    }
  },
};
