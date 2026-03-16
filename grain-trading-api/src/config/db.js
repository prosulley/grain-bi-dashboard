const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool(
  isProduction ? {
    host:     `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  } : {
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }
);

pool.connect((err, client, release) => {
  if (err) console.error('❌ Database connection failed:', err.message);
  else { console.log('✅ Connected to PostgreSQL:', process.env.DB_NAME); release(); }
});

module.exports = pool;
