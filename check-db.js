require('dotenv').config();
const db = require('./src/config/database');

async function check() {
  try {
    const [progress] = await db.execute('SELECT * FROM tryout_subtest_progress LIMIT 5');
    console.log('Progress Sample:', JSON.stringify(progress, null, 2));
    
    const [attempts] = await db.execute('SELECT * FROM attempts WHERE package_type = $1 LIMIT 5', ['tryout']);
    console.log('Attempts Sample:', JSON.stringify(attempts, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
