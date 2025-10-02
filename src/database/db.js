const { Pool } = require('pg');
// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Use PostgreSQL in production (Railway), SQLite in development
const isProduction = process.env.DATABASE_URL;

console.log('🔍 Database Environment Check:');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0);
console.log('isProduction:', isProduction);

let db;

if (isProduction) {
  // PostgreSQL for production
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('🐘 Using PostgreSQL database');
} else {
  // SQLite for development
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database(process.env.DATABASE_PATH || './data.db');
  console.log('📁 Using SQLite database');
}

module.exports = { db, isProduction };
