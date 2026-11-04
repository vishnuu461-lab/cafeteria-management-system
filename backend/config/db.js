require('dotenv').config();
const mysql = require('mysql2/promise');

// Aiven MySQL requires SSL — enabled when DB_SSL=true in environment
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cafeteria_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
  // SSL for Aiven Cloud (and other cloud MySQL providers)
  ...(process.env.DB_SSL === 'true' && {
    ssl: { rejectUnauthorized: false }
  })
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log(`✅ MySQL connected successfully to: ${process.env.DB_NAME}`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env');
  });

module.exports = pool;
