const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deployCommands() {
  try {
    console.log('🔄 Starting command deployment...');

    const commands = [];
    const commandFolders = ['public', 'admin'];

    // Load all commands
    for (const folder of commandFolders) {
      const commandsPath = path.join(__dirname, '..', 'src', 'commands', folder);
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      
      console.log(`📂 Loading ${commandFiles.length} commands from ${folder}/`);
      
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          console.log(`  ✅ Loaded: ${command.data.name}`);
        } else {
          console.log(`  ⚠️  Skipped ${file}: missing 'data' or 'execute'`);
        }
      }
    }

    console.log(`\n📦 Total commands to deploy: ${commands.length}`);

    // Verify environment variables
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('❌ DISCORD_TOKEN is not set in environment variables!');
    }
    if (!process.env.DISCORD_APPLICATION_ID) {
      throw new Error('❌ DISCORD_APPLICATION_ID is not set in environment variables!');
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    console.log('\n🚀 Deploying commands to Discord...');

    // Deploy globally (takes up to 1 hour to propagate)
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
      { body: commands }
    );

    console.log(`\n✅ Successfully deployed ${data.length} slash commands globally!`);
    console.log('\n⏱️  Note: Global commands may take up to 1 hour to appear in Discord.');
    console.log('💡 Tip: For instant updates during testing, use guild-specific deployment.\n');

    // List all deployed commands
    console.log('📋 Deployed commands:');
    for (const cmd of data) {
      console.log(`  • /${cmd.name} - ${cmd.description}`);
    }

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands();

