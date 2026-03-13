require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tryout_pintar'
});

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'src/db/fix_table.sql'), 'utf8');
    console.log('Running SQL...');
    await pool.query(sql);
    console.log('Table tryout_subtest_progress created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('SQL Execution failed:', err);
    process.exit(1);
  }
}

run();
