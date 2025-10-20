# Quick Test Steps - TL;DR

## 🚀 Get Started in 5 Minutes

### 1️⃣ Configure Faucet (Admin)
```
/faucet-config
  token_id: 0.0.9356476
  amount_per_claim: 1111
  channel: #forever-snobble-leemon
  role: @Snobble
  nft_token_id: 0.0.10032995
```

### 2️⃣ Check Wallet (Admin)
```
/faucet-wallet-check
```
Should show your hbar.h balance ✅

### 3️⃣ User Verifies Wallet
```
/verify-wallet
accountid: 0.0.xxxxx
```

### 4️⃣ User Turns ON Faucet
```
/faucet toggle
state: ON
```

### 5️⃣ User Claims Tokens
```
/faucet claim
```

**Expected:** ✅ 1,111 hbar.h transferred + transaction ID shown

### 6️⃣ Verify on Hedera Explorer
- Go to [hashscan.io](https://hashscan.io)
- Paste the transaction ID
- See the token transfer confirmed!

---

## ✅ Test Checklist

- [ ] Config saved
- [ ] Wallet shows hbar.h balance
- [ ] User verified wallet
- [ ] Faucet toggled ON
- [ ] Claim successful with transaction ID
- [ ] Transaction visible on Hedera Explorer
- [ ] Second claim blocked (daily limit works)

---

## 🎯 That's It!

Your faucet is live and working! 🎉

For detailed testing, see `FAUCET_TESTING_GUIDE.md`

