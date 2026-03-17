const { Pool } = require('pg');
require('dotenv').config();

const isUnixSocket = (process.env.DB_HOST || '').startsWith('/');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     isUnixSocket ? undefined : (parseInt(process.env.DB_PORT) || 5432),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      false,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL:', process.env.DB_NAME);
    release();
  }
});

module.exports = pool;
