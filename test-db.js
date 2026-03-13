require('dotenv').config();
const db = require('./src/config/database');

async function test() {
  try {
    console.log('Testing connection...');
    const [rows] = await db.execute('SELECT NOW() as now');
    console.log('Connection successful:', rows[0].now);
    
    console.log('Testing users table...');
    const [users] = await db.execute('SELECT * FROM users LIMIT 1');
    console.log('Users found:', users.length);
    if (users.length > 0) {
      console.log('First user:', users[0].email);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
