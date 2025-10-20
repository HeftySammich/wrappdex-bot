# Faucet Testing Guide - Quick Start

Now that you have hbar.h in your wallet, here's how to test everything:

---

## ✅ Step 1: Configure the Faucet (Admin)

In your Discord server, run:

```
/faucet-config
  token_id: 0.0.9356476
  amount_per_claim: 1111
  channel: #forever-snobble-leemon
  role: @Snobble
  nft_token_id: 0.0.10032995
```

**Expected Response:** Green embed showing all settings configured ✅

---

## ✅ Step 2: Check Wallet Balance (Admin)

Run:

```
/faucet-wallet-check
```

**Expected Response:** Shows:
- 💰 HBAR balance (for transaction fees)
- 💰 hbar.h token balance (should show your tokens)
- 🔐 Wallet address

---

## ✅ Step 3: User Setup

Have a test user (with Snobble role + SNOBBLE NFT) do:

### 3a. Verify Wallet
```
/verify-wallet
accountid: 0.0.xxxxx
```

**Expected Response:** ✅ Wallet verified

### 3b. Turn ON Faucet
```
/faucet toggle
state: ON
```

**Expected Response:** Green embed showing faucet is ON ✅

### 3c. Check Status
```
/faucet status
```

**Expected Response:** Shows:
- 🟢 Faucet Status: ON
- ✅ Claim Status: Ready to claim!
- 💰 Total Claimed: 0
- 📈 Per Claim: 1111
- ⏱️ Next Reset: Tomorrow at midnight EST

---

## ✅ Step 4: Test Claim (The Real Test!)

Run:

```
/faucet claim
```

**Expected Response:** 
- ✅ Green embed showing success
- 💰 Amount Claimed: 1111 hbar.h
- ⏰ Next Claim: Tomorrow at midnight EST
- 📝 Transaction ID shown

**Check Hedera:** Go to [Hedera Explorer](https://hashscan.io) and search the transaction ID to verify tokens were transferred!

---

## ✅ Step 5: Test Daily Reset

Try claiming again immediately:

```
/faucet claim
```

**Expected Response:** 
- ❌ "You already claimed today! Next claim available in Xh Ym at midnight EST"

This confirms the daily reset logic is working! ✅

---

## ✅ Step 6: Test Role Verification

Have a user WITHOUT the Snobble role try:

```
/faucet claim
```

**Expected Response:**
- ❌ "You need the @Snobble role to use the faucet"

---

## ✅ Step 7: Test NFT Verification

Have a user with Snobble role but NO SNOBBLE NFTs try:

```
/faucet claim
```

**Expected Response:**
- ❌ "You don't hold any SNOBBLE NFTs. You need at least 1 to use the faucet"

---

## ✅ Step 8: Test Channel Gating

Try running `/faucet claim` in a different channel:

**Expected Response:**
- ❌ "Faucet commands can only be used in #forever-snobble-leemon"

---

## ✅ Step 9: Test Faucet OFF

User runs:

```
/faucet toggle
state: OFF
```

Then tries to claim:

```
/faucet claim
```

**Expected Response:**
- ❌ "Your faucet is currently OFF. Use `/faucet toggle` to turn it ON"

---

## 🧪 Full Test Checklist

- [ ] `/faucet-config` works and saves settings
- [ ] `/faucet-wallet-check` shows correct balance
- [ ] User can verify wallet
- [ ] User can toggle faucet ON
- [ ] `/faucet status` shows correct info
- [ ] `/faucet claim` transfers tokens successfully
- [ ] Transaction ID is shown and valid on Hedera Explorer
- [ ] Second claim same day is blocked
- [ ] Role verification works
- [ ] NFT verification works
- [ ] Channel gating works
- [ ] Faucet OFF toggle works

---

## 🔍 Verification on Hedera Explorer

After a successful claim:

1. Go to [Hedera Explorer](https://hashscan.io)
2. Search the transaction ID from the claim response
3. You should see:
   - **From:** Your faucet wallet (0.0.xxxxx)
   - **To:** User's wallet (0.0.xxxxx)
   - **Token:** hbar.h (0.0.9356476)
   - **Amount:** 1111

---

## ⚠️ Troubleshooting

### "Faucet not configured"
- Run `/faucet-config` first

### "Wallet not verified"
- User needs to run `/verify-wallet` first

### "Token transfer failed"
- Check wallet has enough hbar.h tokens
- Check wallet has enough HBAR for fees (~0.1 HBAR per transfer)
- Check wallet is associated with hbar.h token

### "Invalid wallet format"
- Make sure wallet address is in format `0.0.xxxxx`

### "Already claimed today"
- This is correct! Daily reset works. Try tomorrow or check the time.

---

## 📊 Expected Math

- **Total hbar.h:** 11,111,111
- **Per claim:** 1,111
- **Total claims possible:** 9,999
- **With 80 users:** ~125 days

---

## 🎉 Success!

If all tests pass, your faucet is working perfectly! 

Users can now:
- ✅ Turn faucet ON/OFF
- ✅ Claim 1,111 hbar.h per day
- ✅ See their status and next claim time
- ✅ Receive tokens automatically

---

## 📝 Notes

- All times are in **EST timezone**
- Daily reset is at **midnight EST**
- Each user can claim **once per day**
- Claims are **non-stackable** (can't accumulate)
- Only users with **Snobble role + SNOBBLE NFTs** can claim
- Commands only work in **#forever-snobble-leemon**

---

**Questions?** Check `FAUCET_SETUP.md` for more details!

