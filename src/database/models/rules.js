const { db, isProduction } = require('../db');

async function initializeRulesTable() {
  try {
    if (isProduction) {
      // PostgreSQL - Rules table
      await db.query(`
        CREATE TABLE IF NOT EXISTS rules (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          value VARCHAR(255) NOT NULL,
          role_id VARCHAR(255) NOT NULL,
          guild_id VARCHAR(255) NOT NULL,
          token_type VARCHAR(50) DEFAULT 'hts',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add token_type column if it doesn't exist (for existing databases)
      await db.query(`
        ALTER TABLE rules ADD COLUMN IF NOT EXISTS token_type VARCHAR(50) DEFAULT 'hts'
      `);

      // PostgreSQL - Verified users table
      await db.query(`
        CREATE TABLE IF NOT EXISTS verified_users (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          guild_id VARCHAR(255) NOT NULL,
          wallet_address VARCHAR(255) NOT NULL,
          last_nft_count INTEGER DEFAULT 0,
          last_serials TEXT DEFAULT '',
          last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, guild_id, wallet_address)
        )
      `);

      // PostgreSQL - Giveaway entries table
      await db.query(`
        CREATE TABLE IF NOT EXISTS giveaway_entries (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          guild_id VARCHAR(255) NOT NULL,
          wallet_address VARCHAR(255) NOT NULL,
          ticket_count INTEGER NOT NULL,
          giveaway_id VARCHAR(255) NOT NULL,
          entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, guild_id, giveaway_id)
        )
      `);

      // PostgreSQL - Reaction roles table
      await db.query(`
        CREATE TABLE IF NOT EXISTS reaction_roles (
          id SERIAL PRIMARY KEY,
          guild_id VARCHAR(255) NOT NULL,
          channel_id VARCHAR(255) NOT NULL,
          message_id VARCHAR(255) NOT NULL,
          emoji VARCHAR(255) NOT NULL,
          role_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(message_id, emoji)
        )
      `);

      console.log('✅ PostgreSQL tables initialized');
    } else {
      // SQLite - Rules table
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            value TEXT NOT NULL,
            role_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            token_type TEXT DEFAULT 'hts'
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Add token_type column if it doesn't exist (for existing databases)
      await new Promise((resolve, reject) => {
        db.run(`
          ALTER TABLE rules ADD COLUMN token_type TEXT DEFAULT 'hts'
        `, (err) => {
          if (err && err.message.includes('duplicate column')) {
            resolve(); // Column already exists
          } else if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // SQLite - Verified users table
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS verified_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            wallet_address TEXT NOT NULL,
            last_nft_count INTEGER DEFAULT 0,
            last_serials TEXT DEFAULT '',
            last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, guild_id, wallet_address)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // SQLite - Giveaway entries table
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS giveaway_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            wallet_address TEXT NOT NULL,
            ticket_count INTEGER NOT NULL,
            giveaway_id TEXT NOT NULL,
            entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, guild_id, giveaway_id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // SQLite - Reaction roles table
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS reaction_roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            emoji TEXT NOT NULL,
            role_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(message_id, emoji)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log('✅ SQLite tables initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing tables:', error);
    throw error;
  }
}

async function addRule(type, value, roleId, guildId, tokenType = 'hts') {
  try {
    if (isProduction) {
      // PostgreSQL
      const result = await db.query(
        'INSERT INTO rules (type, value, role_id, guild_id, token_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [type, value, roleId, guildId, tokenType]
      );
      return { changes: 1, lastInsertRowid: result.rows[0].id };
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        db.run('INSERT INTO rules (type, value, role_id, guild_id, token_type) VALUES (?, ?, ?, ?, ?)',
          [type, value, roleId, guildId, tokenType],
          function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes, lastInsertRowid: this.lastID });
          });
      });
    }
  } catch (error) {
    console.error('❌ Error adding rule:', error);
    throw error;
  }
}

async function getRulesByGuild(guildId) {
  try {
    if (isProduction) {
      // PostgreSQL
      const result = await db.query('SELECT * FROM rules WHERE guild_id = $1', [guildId]);
      return result.rows;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM rules WHERE guild_id = ?', [guildId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error getting rules:', error);
    throw error;
  }
}

// Verified Users Functions
async function addVerifiedUser(userId, guildId, walletAddress, nftCount, serials) {
  try {
    const serialsString = serials.join(',');

    if (isProduction) {
      // PostgreSQL
      await db.query(`
        INSERT INTO verified_users (user_id, guild_id, wallet_address, last_nft_count, last_serials, last_checked)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, guild_id, wallet_address)
        DO UPDATE SET
          last_nft_count = $4,
          last_serials = $5,
          last_checked = CURRENT_TIMESTAMP
      `, [userId, guildId, walletAddress, nftCount, serialsString]);
    } else {
      // SQLite
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO verified_users
          (user_id, guild_id, wallet_address, last_nft_count, last_serials, last_checked)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [userId, guildId, walletAddress, nftCount, serialsString], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } catch (error) {
    console.error('❌ Error adding verified user:', error);
    throw error;
  }
}

async function getAllVerifiedUsers() {
  try {
    if (isProduction) {
      // PostgreSQL
      const result = await db.query('SELECT * FROM verified_users');
      return result.rows;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM verified_users', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error getting verified users:', error);
    throw error;
  }
}

// Initialize tables on module load
initializeRulesTable().catch(console.error);

// Giveaway entry functions
async function addGiveawayEntry(userId, guildId, walletAddress, ticketCount, giveawayId) {
  try {
    if (isProduction) {
      // PostgreSQL
      await db.query(`
        INSERT INTO giveaway_entries (user_id, guild_id, wallet_address, ticket_count, giveaway_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, guild_id, giveaway_id)
        DO UPDATE SET ticket_count = $4, entered_at = CURRENT_TIMESTAMP
      `, [userId, guildId, walletAddress, ticketCount, giveawayId]);
    } else {
      // SQLite
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO giveaway_entries
          (user_id, guild_id, wallet_address, ticket_count, giveaway_id, entered_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [userId, guildId, walletAddress, ticketCount, giveawayId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } catch (error) {
    console.error('❌ Error adding giveaway entry:', error);
    throw error;
  }
}

async function getGiveawayEntries(guildId, giveawayId) {
  try {
    if (isProduction) {
      // PostgreSQL
      const result = await db.query(`
        SELECT * FROM giveaway_entries
        WHERE guild_id = $1 AND giveaway_id = $2
        ORDER BY entered_at ASC
      `, [guildId, giveawayId]);
      return result.rows;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM giveaway_entries
          WHERE guild_id = ? AND giveaway_id = ?
          ORDER BY entered_at ASC
        `, [guildId, giveawayId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error getting giveaway entries:', error);
    return [];
  }
}

async function getUserGiveawayEntry(userId, guildId, giveawayId) {
  try {
    if (isProduction) {
      // PostgreSQL
      const result = await db.query(`
        SELECT * FROM giveaway_entries
        WHERE user_id = $1 AND guild_id = $2 AND giveaway_id = $3
      `, [userId, guildId, giveawayId]);
      return result.rows[0] || null;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        db.get(`
          SELECT * FROM giveaway_entries
          WHERE user_id = ? AND guild_id = ? AND giveaway_id = ?
        `, [userId, guildId, giveawayId], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error getting user giveaway entry:', error);
    return null;
  }
}

async function clearGiveawayEntries(guildId, giveawayId) {
  try {
    if (isProduction) {
      // PostgreSQL
      await db.query(`
        DELETE FROM giveaway_entries
        WHERE guild_id = $1 AND giveaway_id = $2
      `, [guildId, giveawayId]);
    } else {
      // SQLite
      await new Promise((resolve, reject) => {
        db.run(`
          DELETE FROM giveaway_entries
          WHERE guild_id = ? AND giveaway_id = ?
        `, [guildId, giveawayId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } catch (error) {
    console.error('❌ Error clearing giveaway entries:', error);
    throw error;
  }
}

// ==================== REACTION ROLES ====================

async function addReactionRole(guildId, channelId, messageId, emoji, roleId) {
  try {
    if (isProduction) {
      await db.query(`
        INSERT INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (message_id, emoji) DO UPDATE SET role_id = $5
      `, [guildId, channelId, messageId, emoji, roleId]);
    } else {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id)
          VALUES (?, ?, ?, ?, ?)
        `, [guildId, channelId, messageId, emoji, roleId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } catch (error) {
    console.error('❌ Error adding reaction role:', error);
    throw error;
  }
}

async function getReactionRolesByMessage(messageId) {
  try {
    if (isProduction) {
      const result = await db.query(`
        SELECT * FROM reaction_roles WHERE message_id = $1
      `, [messageId]);
      return result.rows;
    } else {
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM reaction_roles WHERE message_id = ?
        `, [messageId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error getting reaction roles:', error);
    return [];
  }
}

async function getReactionRole(messageId, emoji) {
  try {
    if (isProduction) {
      const result = await db.query(`
        SELECT * FROM reaction_roles WHERE message_id = $1 AND emoji = $2
      `, [messageId, emoji]);
      return result.rows[0] || null;
    } else {
      return new Promise((resolve, reject) => {
        db.get(`
          SELECT * FROM reaction_roles WHERE message_id = ? AND emoji = ?
        `, [messageId, emoji], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error getting reaction role:', error);
    return null;
  }
}

async function getAllReactionRolesByGuild(guildId) {
  try {
    if (isProduction) {
      const result = await db.query(`
        SELECT * FROM reaction_roles WHERE guild_id = $1 ORDER BY message_id, created_at
      `, [guildId]);
      return result.rows;
    } else {
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM reaction_roles WHERE guild_id = ? ORDER BY message_id, created_at
        `, [guildId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error getting all reaction roles:', error);
    return [];
  }
}

async function removeReactionRole(messageId, emoji) {
  try {
    if (isProduction) {
      await db.query(`
        DELETE FROM reaction_roles WHERE message_id = $1 AND emoji = $2
      `, [messageId, emoji]);
    } else {
      await new Promise((resolve, reject) => {
        db.run(`
          DELETE FROM reaction_roles WHERE message_id = ? AND emoji = ?
        `, [messageId, emoji], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } catch (error) {
    console.error('❌ Error removing reaction role:', error);
    throw error;
  }
}

module.exports = {
  initializeRulesTable,
  addRule,
  getRulesByGuild,
  addVerifiedUser,
  getAllVerifiedUsers,
  addGiveawayEntry,
  getGiveawayEntries,
  getUserGiveawayEntry,
  clearGiveawayEntries,
  addReactionRole,
  getReactionRolesByMessage,
  getReactionRole,
  getAllReactionRolesByGuild,
  removeReactionRole
};
