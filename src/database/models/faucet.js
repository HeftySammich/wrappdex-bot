const { db, isProduction } = require('../db');

async function initializeFaucetTables() {
  try {
    if (isProduction) {
      // PostgreSQL - Faucet claims table
      await db.query(`
        CREATE TABLE IF NOT EXISTS faucet_claims (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          guild_id VARCHAR(255) NOT NULL,
          wallet_address VARCHAR(255) NOT NULL,
          last_claim_timestamp BIGINT,
          total_claimed_amount BIGINT DEFAULT 0,
          is_faucet_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, guild_id)
        )
      `);

      // PostgreSQL - Faucet config table
      await db.query(`
        CREATE TABLE IF NOT EXISTS faucet_config (
          id SERIAL PRIMARY KEY,
          guild_id VARCHAR(255) NOT NULL UNIQUE,
          token_id VARCHAR(255) NOT NULL,
          amount_per_claim BIGINT DEFAULT 1111,
          reset_hour_est INTEGER DEFAULT 0,
          reset_minute_est INTEGER DEFAULT 0,
          channel_id VARCHAR(255),
          role_id VARCHAR(255),
          nft_token_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ PostgreSQL faucet tables initialized');
    } else {
      // SQLite - Faucet claims table
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS faucet_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            wallet_address TEXT NOT NULL,
            last_claim_timestamp INTEGER,
            total_claimed_amount INTEGER DEFAULT 0,
            is_faucet_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, guild_id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // SQLite - Faucet config table
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS faucet_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL UNIQUE,
            token_id TEXT NOT NULL,
            amount_per_claim INTEGER DEFAULT 1111,
            reset_hour_est INTEGER DEFAULT 0,
            reset_minute_est INTEGER DEFAULT 0,
            channel_id TEXT,
            role_id TEXT,
            nft_token_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log('✅ SQLite faucet tables initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing faucet tables:', error);
    throw error;
  }
}

// Get or create faucet claim record for user
async function getOrCreateFaucetClaim(userId, guildId, walletAddress) {
  try {
    if (isProduction) {
      const result = await db.query(
        'SELECT * FROM faucet_claims WHERE user_id = $1 AND guild_id = $2',
        [userId, guildId]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Create new record
      const newRecord = await db.query(
        `INSERT INTO faucet_claims (user_id, guild_id, wallet_address, is_faucet_active)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
        [userId, guildId, walletAddress]
      );

      return newRecord.rows[0];
    } else {
      return new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM faucet_claims WHERE user_id = ? AND guild_id = ?',
          [userId, guildId],
          (err, row) => {
            if (err) reject(err);
            else if (row) resolve(row);
            else {
              // Create new record
              db.run(
                `INSERT INTO faucet_claims (user_id, guild_id, wallet_address, is_faucet_active)
                 VALUES (?, ?, ?, 1)`,
                [userId, guildId, walletAddress],
                function(err) {
                  if (err) reject(err);
                  else {
                    db.get(
                      'SELECT * FROM faucet_claims WHERE user_id = ? AND guild_id = ?',
                      [userId, guildId],
                      (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                      }
                    );
                  }
                }
              );
            }
          }
        );
      });
    }
  } catch (error) {
    console.error('❌ Error getting/creating faucet claim:', error);
    throw error;
  }
}

// Update last claim timestamp
async function updateLastClaim(userId, guildId, amount) {
  try {
    const now = Date.now();

    if (isProduction) {
      await db.query(
        `UPDATE faucet_claims 
         SET last_claim_timestamp = $1, total_claimed_amount = total_claimed_amount + $2, updated_at = NOW()
         WHERE user_id = $3 AND guild_id = $4`,
        [now, amount, userId, guildId]
      );
    } else {
      return new Promise((resolve, reject) => {
        db.run(
          `UPDATE faucet_claims 
           SET last_claim_timestamp = ?, total_claimed_amount = total_claimed_amount + ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND guild_id = ?`,
          [now, amount, userId, guildId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
  } catch (error) {
    console.error('❌ Error updating last claim:', error);
    throw error;
  }
}

// Toggle faucet on/off for user
async function toggleFaucet(userId, guildId, isActive) {
  try {
    if (isProduction) {
      await db.query(
        `UPDATE faucet_claims 
         SET is_faucet_active = $1, updated_at = NOW()
         WHERE user_id = $2 AND guild_id = $3`,
        [isActive, userId, guildId]
      );
    } else {
      return new Promise((resolve, reject) => {
        db.run(
          `UPDATE faucet_claims 
           SET is_faucet_active = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND guild_id = ?`,
          [isActive ? 1 : 0, userId, guildId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
  } catch (error) {
    console.error('❌ Error toggling faucet:', error);
    throw error;
  }
}

// Get faucet config for guild
async function getFaucetConfig(guildId) {
  try {
    if (isProduction) {
      const result = await db.query(
        'SELECT * FROM faucet_config WHERE guild_id = $1',
        [guildId]
      );
      return result.rows[0] || null;
    } else {
      return new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM faucet_config WHERE guild_id = ?',
          [guildId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
          }
        );
      });
    }
  } catch (error) {
    console.error('❌ Error getting faucet config:', error);
    throw error;
  }
}

// Set faucet config for guild
async function setFaucetConfig(guildId, config) {
  try {
    if (isProduction) {
      await db.query(
        `INSERT INTO faucet_config (guild_id, token_id, amount_per_claim, reset_hour_est, reset_minute_est, channel_id, role_id, nft_token_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (guild_id) DO UPDATE SET
         token_id = $2, amount_per_claim = $3, reset_hour_est = $4, reset_minute_est = $5, channel_id = $6, role_id = $7, nft_token_id = $8, updated_at = NOW()`,
        [guildId, config.token_id, config.amount_per_claim, config.reset_hour_est, config.reset_minute_est, config.channel_id, config.role_id, config.nft_token_id]
      );
    } else {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO faucet_config (guild_id, token_id, amount_per_claim, reset_hour_est, reset_minute_est, channel_id, role_id, nft_token_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [guildId, config.token_id, config.amount_per_claim, config.reset_hour_est, config.reset_minute_est, config.channel_id, config.role_id, config.nft_token_id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
  } catch (error) {
    console.error('❌ Error setting faucet config:', error);
    throw error;
  }
}

module.exports = {
  initializeFaucetTables,
  getOrCreateFaucetClaim,
  updateLastClaim,
  toggleFaucet,
  getFaucetConfig,
  setFaucetConfig
};

