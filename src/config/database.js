const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tryout_pintar',
    };

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000
});

// Helper to match mysql2 interface: returns [rows]
const db = {
  async execute(text, params) {
    const res = await pool.query(text, params);
    return [res.rows];
  },
  async query(text, params) {
    const res = await pool.query(text, params);
    return [res.rows];
  },
  async getConnection() {
    const client = await pool.connect();
    const conn = {
      async execute(text, params) {
        const res = await client.query(text, params);
        return [res.rows];
      },
      async query(text, params) {
        const res = await client.query(text, params);
        return [res.rows];
      },
      async beginTransaction() {
        await client.query('BEGIN');
      },
      async commit() {
        await client.query('COMMIT');
      },
      async rollback() {
        await client.query('ROLLBACK');
      },
      release() {
        client.release();
      }
    };
    return conn;
  }
};

module.exports = db;
