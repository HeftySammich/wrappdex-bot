// Parse token IDs from environment variable (comma-separated)
const parseTokenIds = () => {
  const tokenIdsEnv = process.env.HEDERA_TOKEN_IDS;
  if (!tokenIdsEnv) {
    console.warn('⚠️ HEDERA_TOKEN_IDS not set in environment variables');
    return [];
  }
  return tokenIdsEnv.split(',').map(id => id.trim());
};

const TOKEN_IDS = parseTokenIds();

module.exports = {
  TOKEN_IDS,
  // Legacy support for existing code
  TOKEN_ID: process.env.HEDERA_TOKEN_ID || TOKEN_IDS[0] || '',
  // New token for daily messages and public displays
  NEW_TOKEN_ID: process.env.HEDERA_NEW_TOKEN_ID || TOKEN_IDS[1] || TOKEN_IDS[0] || '',
  HEDERA_MIRROR_NODE_URL: process.env.HEDERA_MIRROR_NODE_URL || 'https://mainnet-public.mirrornode.hedera.com',
  // SentX API configuration
  SENTX_API_BASE_URL: 'https://api.sentx.io',
  SENTX_API_KEY: process.env.SENTX_API_KEY,
  SENTX_AUTH_TOKEN: process.env.SENTX_AUTH_TOKEN
};
