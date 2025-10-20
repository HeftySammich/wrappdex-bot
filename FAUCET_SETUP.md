# Faucet System Setup Guide

## Overview

The faucet system allows users with a specific role and NFT holdings to claim daily drips of tokens. All times are in **EST timezone**.

## Features

- ✅ Daily token drips (non-stackable)
- ✅ Automatic reset at midnight EST
- ✅ Role-based access control
- ✅ NFT ownership verification
- ✅ Channel-gated commands
- ✅ User ON/OFF toggle
- ✅ Claim history tracking

## Setup Instructions

### Step 1: Configure Faucet Settings (Admin)

Use the `/faucet-config` command to set up the faucet:

```
/faucet-config
  token_id: 0.0.9356476 (hbar.h token)
  amount_per_claim: 1111 (or your desired amount)
  channel: #forever-snobble-leemon
  role: @Snobble
  nft_token_id: 0.0.10032995 (SNOBBLE NFT)
```

**Parameters:**
- `token_id`: The token ID to distribute (hbar.h = 0.0.9356476)
- `amount_per_claim`: Amount each user gets per claim (default: 1111)
- `channel`: Channel where faucet commands work
- `role`: Role required to use faucet
- `nft_token_id`: NFT token ID required to hold

### Step 2: Verify Faucet Wallet

Use `/faucet-wallet-check` to verify your faucet wallet has sufficient balance:

```
/faucet-wallet-check
```

This shows:
- HBAR balance (for transaction fees)
- hbar.h token balance
- Any other token balances

**Important:** The wallet must be:
- Associated with hbar.h token
- Funded with hbar.h tokens
- Have enough HBAR for transaction fees (~0.1 HBAR per transfer)

### Step 3: Users Enable Faucet

Users must:

1. **Verify wallet** (if not already done):
   ```
   /verify-wallet
   accountid: 0.0.123456
   ```

2. **Turn ON faucet** in the faucet channel:
   ```
   /faucet toggle
   state: ON
   ```

3. **Check status**:
   ```
   /faucet status
   ```

4. **Claim daily drip**:
   ```
   /faucet claim
   ```

## User Commands

### `/faucet toggle`
Turn your faucet ON or OFF. When OFF, you won't receive drips.

```
/faucet toggle state: ON
/faucet toggle state: OFF
```

### `/faucet claim`
Claim your daily drip. Can only claim once per day (resets at midnight EST).

```
/faucet claim
```

**Response:**
- ✅ Success: Shows amount claimed and next claim time
- ❌ Error: Shows reason (already claimed, faucet OFF, missing role/NFT, etc.)

### `/faucet status`
Check your faucet status, total claimed, and next claim time.

```
/faucet status
```

**Shows:**
- Faucet status (ON/OFF)
- Claim status (ready or time until next claim)
- Total claimed amount
- Amount per claim
- Next reset time (in EST)

## Admin Commands

### `/faucet-config`
Configure faucet settings for the server.

```
/faucet-config
  token_id: 0.0.9356476
  amount_per_claim: 1111
  channel: #forever-snobble-leemon
  role: @Snobble
  nft_token_id: 0.0.10032995
```

### `/faucet-wallet-check`
Check the faucet wallet balance and token holdings.

```
/faucet-wallet-check
```

## Timezone Information

All times are in **EST (Eastern Standard Time)**:
- Daily reset: **Midnight EST (00:00 EST)**
- Next claim times shown in EST
- All timestamps stored in EST

## Database Schema

### faucet_claims
Tracks user claims and faucet status:
- `user_id`: Discord user ID
- `guild_id`: Discord guild ID
- `wallet_address`: Hedera wallet address
- `last_claim_timestamp`: Last claim time (milliseconds)
- `total_claimed_amount`: Total tokens claimed
- `is_faucet_active`: ON/OFF toggle

### faucet_config
Stores faucet configuration per guild:
- `guild_id`: Discord guild ID
- `token_id`: Token to distribute
- `amount_per_claim`: Amount per claim
- `reset_hour_est`: Reset hour (0 = midnight)
- `reset_minute_est`: Reset minute (0 = on the hour)
- `channel_id`: Channel where commands work
- `role_id`: Required role
- `nft_token_id`: Required NFT token

## Testing Without Tokens

You can test the entire system without funding the wallet:

1. ✅ Configure faucet with `/faucet-config`
2. ✅ Test role verification
3. ✅ Test NFT ownership checks
4. ✅ Test daily reset logic
5. ✅ Test claim flow and UI
6. ❌ Token transfers (requires funded wallet)

Once you fund the wallet with hbar.h tokens, actual token transfers will work.

## Troubleshooting

### "Faucet not configured"
- Run `/faucet-config` to set up the faucet

### "You need the X role"
- User doesn't have the required role
- Admin should assign the role or adjust config

### "You don't hold any SNOBBLE NFTs"
- User doesn't own the required NFT
- User should verify wallet with `/verify-wallet`

### "Already claimed today"
- User already claimed today
- Next claim available at midnight EST

### "Faucet is OFF"
- User turned off their faucet
- Use `/faucet toggle state: ON` to enable

## Environment Variables

Required (already set):
- `FAUCET_ACCOUNT_ID`: Your faucet wallet address
- `FAUCET_PRIVATE_KEY`: Your faucet wallet private key

Optional (set via `/faucet-config`):
- `HBAR_H_TOKEN_ID`: Token to distribute (0.0.9356476)
- `SNOBBLE_FAUCET_CHANNEL_ID`: Channel for faucet commands
- `SNOBBLE_ROLE_ID`: Required role
- `SNOBBLE_NFT_TOKEN_ID`: Required NFT token

## Support

For issues or questions, contact an administrator.

