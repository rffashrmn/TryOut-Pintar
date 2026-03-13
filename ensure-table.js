require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tryout_pintar'
});

async function check() {
  try {
    const tablesRes = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', tablesRes.rows.map(r => r.table_name));

    const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tryout_subtest_progress'
      );
    `);
    console.log('Table tryout_subtest_progress exists:', res.rows[0].exists);
    
    if (!res.rows[0].exists) {
        console.log('Re-creating table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tryout_subtest_progress (
                id SERIAL PRIMARY KEY,
                attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
                subtest_name VARCHAR(100) NOT NULL,
                status VARCHAR(15) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
                started_at TIMESTAMP NULL,
                time_remaining_seconds INT NOT NULL,
                UNIQUE(attempt_id, subtest_name)
            );
        `);
        console.log('Table created!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Check/Fix failed:', err);
    process.exit(1);
  }
}

check();
