const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const AutoScanner = require('./services/autoScanner');
const HederaMirrorMonitor = require('./services/hederaMirrorMonitor');
const DailyMessage = require('./services/dailyMessage');
const FaucetService = require('./services/faucetService');
const fs = require('fs');
const path = require('path');
// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages
  ]
});

// Deploy commands function
async function deployCommands() {
  try {
    console.log('🔄 Deploying slash commands...');

    const commands = [];
    const commandFolders = ['public', 'admin'];

    for (const folder of commandFolders) {
      const commandFiles = fs.readdirSync(`./src/commands/${folder}`).filter(file => file.endsWith('.js'));
      for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        commands.push(command.data.toJSON());
      }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    // Clear global commands if deploying to guild (prevents duplicates)
    if (process.env.DISCORD_GUILD_ID) {
      try {
        console.log('🧹 Clearing global commands to prevent duplicates...');
        await rest.put(
          Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
          { body: [] }
        );
        console.log('✅ Global commands cleared');
      } catch (error) {
        console.log('⚠️ Could not clear global commands:', error.message);
      }
    }

    // Deploy to specific guild for instant updates (if DISCORD_GUILD_ID is set)
    // Otherwise deploy globally (takes up to 1 hour)
    if (process.env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_ID, process.env.DISCORD_GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Successfully deployed ${commands.length} slash commands to guild ${process.env.DISCORD_GUILD_ID} (instant)!`);
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
        { body: commands }
      );
      console.log(`✅ Successfully deployed ${commands.length} slash commands globally (may take up to 1 hour)!`);
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`✅ Bot successfully logged in as ${client.user.tag}`);

  // Deploy commands automatically on startup
  await deployCommands();

  console.log(`🚀 Bot is ready and running!`);

  // Start automatic scanner
  const scanner = new AutoScanner(client);
  scanner.start();

  // Start Hedera Mirror sales monitor
  const salesMonitor = new HederaMirrorMonitor(client);
  salesMonitor.start();

  // Start daily message service
  const dailyMessage = new DailyMessage(client);
  dailyMessage.start();
  client.dailyMessage = dailyMessage; // Make accessible to commands

  // Start faucet service
  const faucetService = new FaucetService(client);
  client.faucetService = faucetService; // Make accessible to commands
});

// Welcome message when new members join
client.on('guildMemberAdd', async (member) => {
  try {
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
    if (!welcomeChannelId) {
      console.log('⚠️ WELCOME_CHANNEL_ID not configured - skipping welcome message');
      return;
    }

    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

    if (welcomeChannel) {
      // TODO: Customize this welcome message for your community
      const welcomeMessage = `Welcome ${member} to **${member.guild.name}**!\n\n` +
                             `React in the verification channel to get started, then use \`/verify-wallet\` to verify your token holdings and receive roles!`;

      await welcomeChannel.send(welcomeMessage);
      console.log(`✅ Welcome message sent for ${member.user.tag}`);
    } else {
      console.log(`❌ Welcome channel not found: ${welcomeChannelId}`);
    }
  } catch (error) {
    console.error('❌ Error sending welcome message:', error);
  }
});

// Load commands
const commands = new Map();

// Load public commands
const publicCommandFiles = fs.readdirSync('./src/commands/public').filter(file => file.endsWith('.js'));
for (const file of publicCommandFiles) {
  const command = require(`./commands/public/${file}`);
  commands.set(command.data.name, command);
}

// Load admin commands
const adminCommandFiles = fs.readdirSync('./src/commands/admin').filter(file => file.endsWith('.js'));
for (const file of adminCommandFiles) {
  const command = require(`./commands/admin/${file}`);
  commands.set(command.data.name, command);
}

// Handle embed modal submissions
async function handleEmbedModal(interaction) {
  try {
    // Parse the custom ID to get user ID
    const [, , userId] = interaction.customId.split('_');

    // Verify the user matches
    if (userId !== interaction.user.id) {
      await interaction.reply({ content: '❌ You can only submit your own embed forms!', ephemeral: true });
      return;
    }

    // Get form values
    const title = interaction.fields.getTextInputValue('embed_title');
    const description = interaction.fields.getTextInputValue('embed_description');
    const options = interaction.fields.getTextInputValue('embed_options') || '';
    const colorAndFooter = interaction.fields.getTextInputValue('embed_color') || '';
    const imageUrl = interaction.fields.getTextInputValue('embed_image');

    // Parse options (channel and pin)
    let targetChannel = interaction.channel;
    let shouldPin = false;

    if (options.trim()) {
      const optionsParts = options.trim().split(' ');

      // Look for channel mention
      const channelMention = optionsParts.find(part => part.startsWith('#'));
      if (channelMention) {
        const channelName = channelMention.slice(1);
        const foundChannel = interaction.guild.channels.cache.find(ch => ch.name === channelName);
        if (foundChannel) {
          targetChannel = foundChannel;
        }
      }

      // Look for pin option
      if (optionsParts.includes('pin')) {
        shouldPin = true;
      }
    }

    // Parse color and footer
    let color = '#00A1D6';
    let footer = '';

    if (colorAndFooter.trim()) {
      if (colorAndFooter.includes('|')) {
        const [colorPart, footerPart] = colorAndFooter.split('|').map(s => s.trim());
        if (colorPart) color = colorPart;
        if (footerPart) footer = footerPart;
      } else {
        // Just color or just footer
        if (colorAndFooter.startsWith('#')) {
          color = colorAndFooter.trim();
        } else {
          footer = colorAndFooter.trim();
        }
      }
    }

    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color);

    // Add footer with username
    const footerText = footer ? footer : `Created by ${interaction.user.username}`;
    embed.setFooter({
      text: footerText,
      iconURL: interaction.user.displayAvatarURL()
    });

    if (imageUrl) {
      try {
        embed.setImage(imageUrl);
      } catch (error) {
        console.log('Invalid image URL provided');
      }
    }

    // Send the embed
    const sentMessage = await targetChannel.send({ embeds: [embed] });

    // Pin if requested
    if (shouldPin) {
      try {
        await sentMessage.pin();
      } catch (pinError) {
        console.error('Failed to pin message:', pinError);
      }
    }

    // Success response
    let successMessage = `✅ **Embed sent successfully!**\n\n`;
    successMessage += `📍 **Channel:** ${targetChannel}\n`;
    successMessage += `📝 **Title:** ${title}\n`;
    if (shouldPin) successMessage += `📌 **Pinned:** Yes\n`;
    successMessage += `🔗 **[Jump to Message](${sentMessage.url})**`;

    await interaction.reply({ content: successMessage, ephemeral: true });

    console.log(`✅ Embed created via modal by ${interaction.user.tag} in ${targetChannel.name}`);

  } catch (error) {
    console.error('❌ Error handling embed modal:', error);
    await interaction.reply({
      content: 'Sorry, there was an error creating the embed. Please try again.',
      ephemeral: true
    });
  }
}

// Handle reaction role modal submissions
async function handleReactionRoleModal(interaction) {
  try {
    // Defer reply immediately to prevent timeout
    await interaction.deferReply({ ephemeral: true });

    const { addReactionRole, getReactionRolesByMessage } = require('./database/models/rules');
    const { EmbedBuilder } = require('discord.js');

    console.log('📝 Processing reaction role modal submission...');
    console.log('Custom ID:', interaction.customId);

    // Extract channel ID from custom ID
    const channelId = interaction.customId.split('_')[3];
    console.log('Channel ID:', channelId);

    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
      console.error('❌ Channel not found:', channelId);
      await interaction.editReply({ content: '❌ Channel not found!' });
      return;
    }

    // Get form values
    const titleDesc = interaction.fields.getTextInputValue('title_desc');
    const pair1 = interaction.fields.getTextInputValue('pair1') || '';
    const pair2 = interaction.fields.getTextInputValue('pair2') || '';
    const pair3 = interaction.fields.getTextInputValue('pair3') || '';
    const pair4 = interaction.fields.getTextInputValue('pair4') || '';

    console.log('Form values:', { titleDesc, pair1, pair2, pair3, pair4 });

    // Parse title and description
    let title = 'Reaction Roles';
    let description = 'React below to get roles!';

    if (titleDesc.includes('|')) {
      const [t, d] = titleDesc.split('|').map(s => s.trim());
      if (t) title = t;
      if (d) description = d;
    } else {
      title = titleDesc.trim();
    }

    // Parse emoji-role pairs
    const pairs = [pair1, pair2, pair3, pair4].filter(p => p.trim());
    const parsedPairs = [];

    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;

      // Split by space - first part is emoji, rest is role
      const parts = trimmed.split(' ');
      if (parts.length < 2) {
        console.error('❌ Invalid format:', trimmed);
        await interaction.editReply({
          content: `❌ Invalid format for pair: "${trimmed}"\n\nUse format: \`emoji @role\` or \`emoji role_id\``
        });
        return;
      }

      const emoji = parts[0];
      const roleInput = parts.slice(1).join(' ');

      // Parse role (either @mention or ID)
      let roleId = null;
      if (roleInput.startsWith('<@&') && roleInput.endsWith('>')) {
        // Role mention format
        roleId = roleInput.slice(3, -1);
      } else if (/^\d+$/.test(roleInput)) {
        // Role ID format
        roleId = roleInput;
      } else {
        console.error('❌ Invalid role format:', roleInput);
        await interaction.editReply({
          content: `❌ Invalid role format: "${roleInput}"\n\nUse \`@role\` or role ID`
        });
        return;
      }

      // Verify role exists
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        console.error('❌ Role not found:', roleInput);
        await interaction.editReply({
          content: `❌ Role not found: ${roleInput}`
        });
        return;
      }

      parsedPairs.push({ emoji, roleId, roleName: role.name });
    }

    if (parsedPairs.length === 0) {
      console.error('❌ No emoji-role pairs provided');
      await interaction.editReply({
        content: '❌ You must provide at least one emoji-role pair!'
      });
      return;
    }

    console.log(`✅ Parsed ${parsedPairs.length} emoji-role pairs`);

    // Create the embed
    let rolesList = '';
    for (const pair of parsedPairs) {
      rolesList += `${pair.emoji} - ${pair.roleName}\n`;
    }

    const embed = new EmbedBuilder()
      .setColor('#00A1D6')
      .setTitle(title)
      .setDescription(description + '\n\n**Available Roles:**\n' + rolesList + '\n*React with any emoji above to receive that role!*\n*Remove your reaction to remove the role.*')
      .setFooter({
        text: `Created by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Send the embed
    const message = await channel.send({ embeds: [embed] });

    // Add reactions and save to database
    console.log('Adding reactions and saving to database...');
    for (const pair of parsedPairs) {
      try {
        console.log(`Adding reaction: ${pair.emoji}`);
        await message.react(pair.emoji);
        await addReactionRole(interaction.guildId, channelId, message.id, pair.emoji, pair.roleId);
        console.log(`✅ Saved: ${pair.emoji} → ${pair.roleName}`);
      } catch (error) {
        console.error(`❌ Error adding reaction ${pair.emoji}:`, error.message);
        await interaction.editReply({
          content: `❌ Invalid emoji: ${pair.emoji}\n\nMake sure it's a valid emoji or custom emoji from this server.`
        });
        // Delete the message if we can't add reactions
        try {
          await message.delete();
        } catch (deleteError) {
          console.error('Could not delete message:', deleteError.message);
        }
        return;
      }
    }

    await interaction.editReply({
      content: `✅ **Reaction Role Message Created!**\n\n` +
               `📍 **Channel:** ${channel}\n` +
               `📝 **Message ID:** \`${message.id}\`\n` +
               `🎭 **Roles:** ${parsedPairs.length}\n\n` +
               `Users can now react to get roles!\n\n` +
               `**Add more roles:** Use \`/reaction-role-add message_id:${message.id}\``
    });

    console.log(`✅ Reaction role message created by ${interaction.user.tag} in ${channel.name} with ${parsedPairs.length} roles`);

  } catch (error) {
    console.error('❌ Error handling reaction role modal:', error);
    console.error('Stack trace:', error.stack);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error creating reaction role message. Please try again.',
        ephemeral: true
      });
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Error creating reaction role message. Please try again.'
      });
    }
  }
}

client.on('interactionCreate', async (interaction) => {
  // Handle slash commands
  if (interaction.isCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      console.log(`🔧 Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
      await command.execute(interaction);
    } catch (error) {
      console.error('❌ Error executing command:', error);
      const errorMessage = 'There was an error while executing this command!';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('embed_modal_')) {
      await handleEmbedModal(interaction);
    } else if (interaction.customId.startsWith('reaction_role_modal_')) {
      await handleReactionRoleModal(interaction);
    }
  }
});

// Reaction roles event handlers
client.on('messageReactionAdd', async (reaction, user) => {
  // Ignore bot reactions
  if (user.bot) return;

  try {
    const { getReactionRole } = require('./database/models/rules');

    // Check if this is a custom reaction role first
    const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const reactionRole = await getReactionRole(reaction.message.id, emoji);

    if (reactionRole) {
      // This is a custom reaction role
      const member = await reaction.message.guild.members.fetch(user.id);
      if (!member) return;

      try {
        await member.roles.add(reactionRole.role_id);
        const role = reaction.message.guild.roles.cache.get(reactionRole.role_id);
        console.log(`✅ Assigned reaction role ${role ? role.name : reactionRole.role_id} to ${user.tag} via ${emoji}`);
      } catch (error) {
        console.error(`❌ Error assigning reaction role to ${user.tag}:`, error.message);
      }
      return; // Don't process verification reaction if this was a custom reaction role
    }

    // If not a custom reaction role, check for verification reaction
    const VERIFICATION_CHANNEL_ID = process.env.VERIFICATION_CHANNEL_ID;
    const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
    const REACTION_EMOJI = process.env.REACTION_EMOJI;

    // Skip if not configured
    if (!VERIFICATION_CHANNEL_ID || !VERIFIED_ROLE_ID || !REACTION_EMOJI) {
      return;
    }

    // Check if reaction is in the verification channel
    if (reaction.message.channel.id !== VERIFICATION_CHANNEL_ID) return;

    // Check if reaction is the configured emoji
    if (reaction.emoji.name !== REACTION_EMOJI) return;

    // Get the guild member
    const member = await reaction.message.guild.members.fetch(user.id);
    if (!member) return;

    // Check if member already has the verified role
    if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
      console.log(`✅ User ${user.tag} already has verified role`);
      return;
    }

    // Assign the verified role
    await member.roles.add(VERIFIED_ROLE_ID);
    console.log(`✅ Assigned verified role to ${user.tag} via reaction`);

    // Send a DM to the user (optional)
    // TODO: Customize this DM message for your community
    try {
      await user.send(
        `🎉 Welcome to **${member.guild.name}**!\n\n` +
        `You've been verified and can now access all channels.\n\n` +
        `**Next Steps:**\n` +
        `• Use \`/verify-wallet <your-hedera-account-id>\` to link your wallet\n` +
        `• Get roles based on your token holdings\n` +
        `• Explore the server and have fun!`
      );
    } catch (error) {
      console.log(`❌ Could not send DM to ${user.tag}: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error handling reaction add:', error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  // Ignore bot reactions
  if (user.bot) return;

  try {
    const { getReactionRole } = require('./database/models/rules');

    // Check if this is a custom reaction role first
    const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const reactionRole = await getReactionRole(reaction.message.id, emoji);

    if (reactionRole) {
      // This is a custom reaction role - remove it
      const member = await reaction.message.guild.members.fetch(user.id);
      if (!member) return;

      try {
        await member.roles.remove(reactionRole.role_id);
        const role = reaction.message.guild.roles.cache.get(reactionRole.role_id);
        console.log(`✅ Removed reaction role ${role ? role.name : reactionRole.role_id} from ${user.tag} via ${emoji}`);
      } catch (error) {
        console.error(`❌ Error removing reaction role from ${user.tag}:`, error.message);
      }
      return; // Don't process verification reaction if this was a custom reaction role
    }

    // If not a custom reaction role, check for verification reaction
    const VERIFICATION_CHANNEL_ID = process.env.VERIFICATION_CHANNEL_ID;
    const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
    const REACTION_EMOJI = process.env.REACTION_EMOJI;

    // Skip if not configured
    if (!VERIFICATION_CHANNEL_ID || !VERIFIED_ROLE_ID || !REACTION_EMOJI) {
      return;
    }

    // Check if reaction is in the verification channel
    if (reaction.message.channel.id !== VERIFICATION_CHANNEL_ID) return;

    // Check if reaction is the configured emoji
    if (reaction.emoji.name !== REACTION_EMOJI) return;

    // Get the guild member
    const member = await reaction.message.guild.members.fetch(user.id);
    if (!member) return;

    // Remove the verified role
    await member.roles.remove(VERIFIED_ROLE_ID);
    console.log(`✅ Removed verified role from ${user.tag} via reaction removal`);

  } catch (error) {
    console.error('❌ Error handling reaction remove:', error);
  }
});

// Debug environment variables
console.log('🔍 Environment check:');
console.log('DISCORD_TOKEN exists:', !!process.env.DISCORD_TOKEN);
console.log('DISCORD_TOKEN length:', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0);

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN environment variable is not set!');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('❌ Failed to login to Discord:', error.message);
  process.exit(1);
});
