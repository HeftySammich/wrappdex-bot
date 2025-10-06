const { REST, Routes } = require('discord.js');
require('dotenv').config();

async function clearGlobalCommands() {
  try {
    console.log('🔄 Clearing global commands...');

    if (!process.env.DISCORD_TOKEN) {
      throw new Error('❌ DISCORD_TOKEN is not set in environment variables!');
    }
    if (!process.env.DISCORD_APPLICATION_ID) {
      throw new Error('❌ DISCORD_APPLICATION_ID is not set in environment variables!');
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    // Get all global commands
    const globalCommands = await rest.get(
      Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID)
    );

    console.log(`📋 Found ${globalCommands.length} global commands`);

    if (globalCommands.length === 0) {
      console.log('✅ No global commands to clear!');
      return;
    }

    // Delete all global commands
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
      { body: [] }
    );

    console.log(`✅ Successfully cleared ${globalCommands.length} global commands!`);
    console.log('💡 Guild-specific commands are still active and will remain.');

  } catch (error) {
    console.error('❌ Error clearing global commands:', error);
    process.exit(1);
  }
}

clearGlobalCommands();

