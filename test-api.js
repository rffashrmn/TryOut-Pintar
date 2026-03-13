require('dotenv').config();
const db = require('./src/config/database');

async function testApi() {
  try {
    const attemptId = 3; // Latest attempt from debug output
    const [attempts] = await db.execute('SELECT * FROM attempts WHERE id = $1', [attemptId]);
    const attempt = attempts[0];
    
    const [subtests] = await db.execute(
      'SELECT * FROM tryout_subtests WHERE tryout_package_id = $1 ORDER BY sort_order', [attempt.package_id]
    );

    const [progress] = await db.execute(
      'SELECT *, EXTRACT(EPOCH FROM (NOW() - started_at))::INT as elapsed FROM tryout_subtest_progress WHERE attempt_id = $1',
      [attemptId]
    );

    console.log('API Response Structure:');
    console.log('Attempt Package ID:', attempt.package_id);
    console.log('Subtests count:', subtests.length);
    console.log('Subtest names:', subtests.map(s => s.subtest));
    console.log('Progress count:', progress.length);
    console.log('Progress subtest names:', progress.map(p => p.subtest_name));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testApi();
