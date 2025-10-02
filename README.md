# Hedera AIO Community Bot 

An all-in-one Discord bot for Hedera NFT communities. Verify, assign roles, track sales, run giveaways, and more - all using **Hedera Mirror Node only** (no wallet connections required)!

## Features

- **NFT Verification**: Verify wallet ownership and auto-assign roles based on NFT holdings
- **Reaction Roles**: Verify new members with emoji reactions
- **Sales Monitoring**: Real-time NFT sales notifications from Hedera Mirror Node
- **Daily Reports**: Automated daily collection stats (holders, floor price, volume)
- **NFT Giveaways**: Weighted raffle system based on NFT holdings
- **Auto Scanner**: Scans every 30 mins and automatically updates roles when NFT holdings change
- **Safe & Secure**: Uses Mirror Node only - no private keys or wallet connections needed!

## Quick Deploy to Railway

Railway is the recommended hosting platform ($5/month). Follow these steps:

### 1. Prerequisites

- A [Discord Bot](https://discord.com/developers/applications) created and invited to your server
- A [Railway](https://railway.app) account
- Your Hedera NFT token ID(s)

### 2. Get Your Discord Bot Token & IDs

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (or create a new one)
3. **Bot Token**: Go to "Bot" tab → Click "Reset Token" → Copy the token
4. **Application ID**: Go to "General Information" → Copy "Application ID"
5. **Invite Bot**: Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Manage Roles`, `Send Messages`, `Manage Messages`, `Read Message History`, `Add Reactions`, `Use Slash Commands`
   - Copy the generated URL and open it to invite the bot to your server

### 3. Get Your Discord Channel & Role IDs

Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode), then:

1. **Channel IDs**: Right-click any channel → "Copy Channel ID"
2. **Role IDs**: Server Settings → Roles → Right-click role → "Copy Role ID"

You'll need IDs for:
- Welcome channel (where new member messages are sent)
- Verification channel (where users react to get verified)
- Daily message channel (for daily collection reports)
- Sales channel (for NFT sale notifications)
- Verified role (assigned via reaction roles)

### 4. Deploy to Railway

1. **Fork this repository** to your GitHub account
2. Go to [Railway](https://railway.app) and create a new project
3. Select "Deploy from GitHub repo" and choose your forked repository
4. Railway will automatically detect the Node.js project

### 5. Configure Environment Variables

In Railway, go to your project → Variables tab and add these:

#### Required Variables:
```
DISCORD_TOKEN=your_bot_token_here
DISCORD_APPLICATION_ID=your_application_id_here
WELCOME_CHANNEL_ID=your_welcome_channel_id
VERIFICATION_CHANNEL_ID=your_verification_channel_id
DAILY_MESSAGE_CHANNEL_ID=your_daily_channel_id
SALES_CHANNEL_ID=your_sales_channel_id
VERIFIED_ROLE_ID=your_verified_role_id
REACTION_EMOJI=✅
HEDERA_TOKEN_IDS=0.0.1234567,0.0.7654321
HEDERA_TOKEN_ID=0.0.1234567
HEDERA_NEW_TOKEN_ID=0.0.7654321
NODE_ENV=production
```

#### Optional Variables (for advanced features):
```
SENTX_API_KEY=your_sentx_api_key
FAUCET_ACCOUNT_ID=0.0.1234567
FAUCET_PRIVATE_KEY=your_private_key
```

> **Note**: Replace all placeholder values with your actual IDs. See `.env.example` for detailed descriptions.

### 6. Add PostgreSQL Database

1. In Railway, click "New" → "Database" → "Add PostgreSQL"
2. Railway automatically sets the `DATABASE_URL` variable
3. Your bot will use PostgreSQL in production!

### 7. Deploy!

Railway will automatically deploy your bot. Check the logs to confirm it's running:
```
✅ Bot successfully logged in as YourBot#1234
🚀 Bot is ready and running!
```

## Bot Commands

### Public Commands
- `/verify-wallet <accountId>` - Verify your Hedera wallet and get roles
- `/status` - Check your verification status
- `/help` - Get help with bot commands
- `/enter-giveaway` - Enter active NFT giveaway
- `/giveaway-status` - Check current giveaway status

### Admin Commands
- `/setup` - Initialize bot for your server
- `/set-rules` - Configure role assignment rules
- `/setup-reaction-roles` - Setup reaction roles for verification
- `/start-giveaway` - Start an NFT giveaway
- `/embed-modal` - Create custom embedded messages
- `/test-daily` - Test daily message (admin only)
- `/bot-status` - Check bot service status

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Built-by-SLIME/Hedera-community-bot.git
   cd Hedera-community-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Run the bot**
   ```bash
   npm start
   ```

## Discord Configuration Guide

### Setting Up Reaction Roles

1. Run `/setup-reaction-roles` in your Discord server
2. Bot will post a welcome message in your verification channel
3. New members react with the configured emoji to get verified!

### Setting Up Role Rules

Use `/set-rules` to configure automatic role assignment based on:
- **NFT Quantity**: Assign roles based on how many NFTs a user owns
- **Serial Numbers**: Assign special roles for specific NFT serials

### Configuring Daily Messages

Set `DAILY_MESSAGE_CHANNEL_ID` to enable daily collection reports at 9 AM EST, including:
- HBAR price and market cap
- Collection supply and holder count
- Floor price and listings (requires SentX API key)

### Enabling NFT Giveaways

To enable giveaway features:
1. Set `FAUCET_ACCOUNT_ID` to your Hedera account with NFTs
2. Set `FAUCET_PRIVATE_KEY` to your account's private key
3. Use `/start-giveaway` to launch giveaways!

## Customizing Messages for Your Community

All user-facing messages include `TODO` comments in the code for easy customization. Search for `TODO:` in these files:

### Files to Customize:

1. **Welcome Messages** (`src/bot.js`)
   - New member welcome message
   - Verification DM message

2. **Reaction Roles** (`src/commands/admin/setup-reaction-roles.js`)
   - Verification channel embed

3. **Help Command** (`src/commands/public/help.js`)
   - Help embed content and branding

4. **Giveaway Messages** (`src/commands/public/giveaway-help.js`, `src/services/faucetService.js`)
   - Giveaway announcements
   - Winner announcements
   - Help text

5. **Daily Reports** (`src/services/dailyMessage.js`)
   - Daily collection report embed

6. **Sales Notifications** (`src/services/hederaMirrorMonitor.js`)
   - NFT sale announcements

### Customization Tips:

- **Brand Colors**: Look for `.setColor('#00ff40')` and change the hex code
- **Embed Titles**: Update titles to match your community name
- **Descriptions**: Add your community's personality and tone
- **Footer Text**: Add your community tagline or links

**Example:**
```javascript
// Before (generic)
.setTitle('🎁 NFT Giveaway Help')

// After (customized)
.setTitle('🎁 CoolNFT Giveaway - How to Win!')
```

## Security Notes

- **Never commit `.env` files** to version control
- **Keep your bot token secret** - regenerate if exposed
- **Faucet private key**: Only needed for giveaways - keep it secure!
- **Mirror Node only**: Bot uses public Hedera Mirror Node API (no wallet connections)

## Support

Need help setting up the bot?

- **DIY**: Follow this README and the `.env.example` file
- **Paid Setup**: Contact us for professional configuration assistance

## License

This project is open source and available under the MIT License.

## Credits

 Built by SLIME with 💚 for the Hedera community.

---

**Powered by Hedera Hashgraph** | **Hosted on Railway**
