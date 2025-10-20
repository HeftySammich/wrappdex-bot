const {
  Client,
  AccountId,
  PrivateKey,
  Hbar,
  TokenId,
  TransferTransaction,
  TokenInfoQuery,
  AccountBalanceQuery
} = require('@hashgraph/sdk');

// Hedera setup - only initialize if environment variables are present
let operatorId, operatorKey, client, NFT_TOKEN_IDS;

function initializeHedera() {
  if (!process.env.FAUCET_ACCOUNT_ID || !process.env.FAUCET_PRIVATE_KEY) {
    console.log('⚠️ Faucet environment variables not set - faucet features disabled');
    return false;
  }

  try {
    operatorId = AccountId.fromString(process.env.FAUCET_ACCOUNT_ID);

    // Try ECDSA first, then ED25519 as fallback
    try {
      operatorKey = PrivateKey.fromStringECDSA(process.env.FAUCET_PRIVATE_KEY);
      console.log('🔑 Using ECDSA private key');
    } catch (ecdsaError) {
      operatorKey = PrivateKey.fromStringED25519(process.env.FAUCET_PRIVATE_KEY);
      console.log('🔑 Using ED25519 private key');
    }

    const { TOKEN_IDS } = require('../utils/constants');
    NFT_TOKEN_IDS = TOKEN_IDS.map(id => TokenId.fromString(id));
    client = Client.forMainnet().setOperator(operatorId, operatorKey);

    console.log(`✅ Hedera faucet initialized with account: ${process.env.FAUCET_ACCOUNT_ID}`);
    console.log(`🎯 Supporting token IDs: ${TOKEN_IDS.join(', ')}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Hedera faucet:', error.message);
    return false;
  }
}

// Initialize on module load
const isHederaInitialized = initializeHedera();

// Helper function for retrying Hedera operations with exponential backoff
async function retryHederaOperation(operation, maxAttempts = 5) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      attempt++;
      return await operation();
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      if (attempt === maxAttempts) {
        throw new Error(`Max attempts (${maxAttempts}) reached: ${error.message}`);
      }

      // Exponential backoff: 1s, 2s, 4s, 8s
      const waitTime = Math.pow(2, attempt - 1) * 1000;
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Check if wallet is associated with tokens
async function checkAssociation(walletId) {
  if (!isHederaInitialized) {
    return '❌ Faucet service not configured. Please contact administrator.';
  }

  try {
    const result = await retryHederaOperation(() =>
      new AccountBalanceQuery().setAccountId(walletId).execute(client)
    );

    const { TOKEN_IDS } = require('../utils/constants');
    const associations = TOKEN_IDS.map(tokenId => ({
      tokenId,
      associated: result.tokens._map.has(tokenId)
    }));

    const associatedTokens = associations.filter(a => a.associated);

    if (associatedTokens.length === 0) {
      return `❌ Wallet \`${walletId}\` **is NOT associated** with any NFTs from this collection.`;
    } else {
      const tokenList = associatedTokens.map(a => a.tokenId).join(', ');
      return `✅ Wallet \`${walletId}\` **is associated** with NFTs: ${tokenList}`;
    }

  } catch (err) {
    console.error('❌ Association check error:', err);
    return `❌ Error checking association for wallet \`${walletId}\`: ${err.message}`;
  }
}

// Get wallet balance - specifically for faucet token (hbar.h)
async function getBalance(walletId) {
  if (!isHederaInitialized) {
    return '❌ Faucet service not configured. Please contact administrator.';
  }

  try {
    const result = await retryHederaOperation(() =>
      new AccountBalanceQuery().setAccountId(walletId).execute(client)
    );

    const hbarBalance = result.hbars.toBigNumber().toFixed(2);

    // Get faucet token balance (hbar.h - 0.0.9356476)
    const FAUCET_TOKEN_ID = process.env.FAUCET_TOKEN_ID || '0.0.9356476';
    let faucetTokenBalance = 0;

    try {
      const tokenBalance = result.tokens.get(FAUCET_TOKEN_ID);
      if (tokenBalance) {
        // hbar.h has 8 decimals, so divide by 10^8
        faucetTokenBalance = (BigInt(tokenBalance.toString()) / BigInt(100000000)).toString();
      }
    } catch (tokenErr) {
      console.log(`⚠️ Could not get faucet token balance: ${tokenErr.message}`);
    }

    return `💰 **Faucet Wallet Balance:**\n🔹 **HBAR:** ${hbarBalance}\n🎯 **hbar.h Tokens:** ${faucetTokenBalance}\n\n📍 **Wallet:** \`${walletId}\``;

  } catch (err) {
    console.error('❌ Balance check error:', err);
    return `❌ Error checking balance for wallet \`${walletId}\`: ${err.message}`;
  }
}

// Get random NFT serial from faucet wallet (from any supported token)
async function getRandomNFTSerial() {
  if (!isHederaInitialized) {
    throw new Error('Faucet service not configured');
  }

  try {
    const axios = require('axios');
    const { TOKEN_IDS, HEDERA_MIRROR_NODE_URL } = require('../utils/constants');

    let allNFTs = [];

    // Query all supported tokens and combine NFTs
    for (const tokenId of TOKEN_IDS) {
      try {
        const response = await axios.get(
          `${HEDERA_MIRROR_NODE_URL}/api/v1/accounts/${operatorId}/nfts?token.id=${tokenId}`
        );
        const nfts = response.data.nfts || [];
        // Add token ID to each NFT for later reference
        const nftsWithToken = nfts.map(nft => ({ ...nft, token_id: tokenId }));
        allNFTs = allNFTs.concat(nftsWithToken);
      } catch (tokenError) {
        console.error(`❌ Error querying faucet NFTs for token ${tokenId}:`, tokenError.message);
      }
    }

    if (allNFTs.length === 0) {
      throw new Error('No NFTs available in faucet wallet for any supported token');
    }

    // Pick random NFT from all available
    const randomIndex = Math.floor(Math.random() * allNFTs.length);
    const selectedNFT = allNFTs[randomIndex];

    console.log(`🎲 Selected random NFT: Token ${selectedNFT.token_id}, Serial #${selectedNFT.serial_number}`);

    return {
      serialNumber: selectedNFT.serial_number,
      tokenId: selectedNFT.token_id
    };

  } catch (error) {
    console.error('❌ Error getting random NFT serial:', error);
    throw error;
  }
}

// Transfer NFT to winner
async function transferNFT(winnerWalletId, serialNumber = null) {
  if (!isHederaInitialized) {
    return {
      success: false,
      error: 'Faucet service not configured',
      message: '❌ Faucet service not configured. Please contact administrator.'
    };
  }

  try {
    const walletStr = String(winnerWalletId);

    if (!walletStr.startsWith('0.0.')) {
      throw new Error('Invalid wallet format. Expected 0.0.xxxx');
    }

    let tokenId;

    // If no serial specified, get a random one
    if (!serialNumber) {
      const selectedNFT = await getRandomNFTSerial();
      serialNumber = selectedNFT.serialNumber;
      tokenId = selectedNFT.tokenId;
    } else {
      // If serial specified but no token, default to first token for backward compatibility
      const { TOKEN_IDS } = require('../utils/constants');
      tokenId = TOKEN_IDS[0];
    }

    console.log(`🎁 Transferring NFT serial #${serialNumber} from token ${tokenId} to ${walletStr}`);

    const nftTokenId = TokenId.fromString(tokenId);
    const tx = await new TransferTransaction()
      .addNftTransfer(nftTokenId, serialNumber, operatorId, AccountId.fromString(walletStr))
      .freezeWith(client)
      .sign(operatorKey);

    const result = await retryHederaOperation(() => tx.execute(client));

    console.log(`✅ NFT transfer successful! Transaction ID: ${result.transactionId}`);
    return {
      success: true,
      serialNumber: serialNumber,
      tokenId: tokenId,
      transactionId: result.transactionId.toString(),
      message: `✅ Successfully sent NFT #${serialNumber} (${tokenId}) to ${walletStr}`
    };

  } catch (err) {
    console.error('❌ NFT transfer failed:', err);
    return {
      success: false,
      error: err.message,
      message: `❌ NFT transfer failed: ${err.message}`
    };
  }
}

// Get available NFTs in faucet wallet (across all supported tokens)
async function getAvailableNFTs() {
  if (!isHederaInitialized) {
    return {
      count: 0,
      hasNFTs: false,
      error: 'Faucet service not configured'
    };
  }

  try {
    const axios = require('axios');
    const { TOKEN_IDS, HEDERA_MIRROR_NODE_URL } = require('../utils/constants');

    let totalNFTs = 0;
    const tokenCounts = {};

    // Check each supported token
    for (const tokenId of TOKEN_IDS) {
      try {
        const response = await axios.get(
          `${HEDERA_MIRROR_NODE_URL}/api/v1/accounts/${operatorId}/nfts?token.id=${tokenId}`
        );
        const nfts = response.data.nfts || [];
        const count = nfts.length;

        tokenCounts[tokenId] = count;
        totalNFTs += count;

        console.log(`🎯 Faucet wallet has ${count} NFTs for token ${tokenId}`);
      } catch (tokenError) {
        console.error(`❌ Error checking NFTs for token ${tokenId}:`, tokenError.message);
        tokenCounts[tokenId] = 0;
      }
    }

    console.log(`🎯 Total NFTs available in faucet wallet: ${totalNFTs}`);

    return {
      count: totalNFTs,
      hasNFTs: totalNFTs > 0,
      tokenCounts: tokenCounts
    };

  } catch (err) {
    console.error('❌ Error checking available NFTs:', err);
    return {
      count: 0,
      hasNFTs: false,
      error: err.message
    };
  }
}

// Transfer fungible tokens (like hbar.h) to a wallet
async function transferToken(recipientWalletId, tokenId, amount, decimals = 8) {
  if (!isHederaInitialized) {
    return {
      success: false,
      error: 'Faucet service not configured',
      message: '❌ Faucet service not configured. Please contact administrator.'
    };
  }

  try {
    const walletStr = String(recipientWalletId);

    if (!walletStr.startsWith('0.0.')) {
      throw new Error('Invalid wallet format. Expected 0.0.xxxx');
    }

    if (!tokenId.startsWith('0.0.')) {
      throw new Error('Invalid token ID format. Expected 0.0.xxxx');
    }

    // Convert amount to smallest unit (considering decimals)
    const amountInSmallestUnit = BigInt(amount) * BigInt(Math.pow(10, decimals));

    console.log(`💰 Transferring ${amount} tokens (${tokenId}) to ${walletStr}`);

    const token = TokenId.fromString(tokenId);
    const recipientId = AccountId.fromString(walletStr);

    const tx = await new TransferTransaction()
      .addTokenTransfer(token, operatorId, -amountInSmallestUnit)
      .addTokenTransfer(token, recipientId, amountInSmallestUnit)
      .freezeWith(client)
      .sign(operatorKey);

    const result = await retryHederaOperation(() => tx.execute(client));

    console.log(`✅ Token transfer successful! Transaction ID: ${result.transactionId}`);
    return {
      success: true,
      amount: amount,
      tokenId: tokenId,
      recipientWallet: walletStr,
      transactionId: result.transactionId.toString(),
      message: `✅ Successfully sent ${amount} tokens (${tokenId}) to ${walletStr}`
    };

  } catch (err) {
    console.error('❌ Token transfer failed:', err);
    return {
      success: false,
      error: err.message,
      message: `❌ Token transfer failed: ${err.message}`
    };
  }
}

module.exports = {
  checkAssociation,
  getBalance,
  transferNFT,
  transferToken,
  getAvailableNFTs,
  retryHederaOperation,
  isHederaInitialized,
  get operatorId() { return operatorId; },
  get operatorKey() { return operatorKey; },
  get NFT_TOKEN_IDS() { return NFT_TOKEN_IDS; },
  get client() { return client; }
};
