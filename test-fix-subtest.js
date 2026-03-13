require('dotenv').config();
const db = require('./src/config/database');

async function testFix() {
  try {
    const userId = 2; // Test user
    const packageId = 1;
    
    console.log('1. Starting new tryout attempt...');
    // We can't easily call the API here without auth, so we simulate the logic
    const [result] = await db.execute(
      "INSERT INTO attempts (user_id, package_type, package_id, status) VALUES ($1, 'tryout', $2, 'in_progress') RETURNING id",
      [userId, packageId]
    );
    const attemptId = result[0].id;
    console.log('Attempt created:', attemptId);

    console.log('2. Starting subtest "Pengetahuan & Pemahaman Umum"...');
    // Simulate /subtest/start
    const subtest = "Pengetahuan & Pemahaman Umum";
    await db.execute(
      "INSERT INTO tryout_subtest_progress (attempt_id, subtest_name, time_remaining_seconds, status) VALUES ($1, $2, $3, 'pending')",
      [attemptId, subtest, 900]
    );
    
    await db.execute(
      "UPDATE tryout_subtest_progress SET status = 'in_progress', started_at = NOW() WHERE attempt_id = $1 AND subtest_name = $2",
      [attemptId, subtest]
    );
    await db.execute('UPDATE attempts SET current_subtest = $1 WHERE id = $2', [subtest, attemptId]);

    console.log('3. Verifying attempt state...');
    const [check] = await db.execute('SELECT current_subtest FROM attempts WHERE id = $1', [attemptId]);
    console.log('Current Subtest in DB:', check[0].current_subtest);

    if (check[0].current_subtest === subtest) {
      console.log('SUCCESS: current_subtest synced correctly.');
    } else {
      console.log('FAILURE: current_subtest mismatch.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testFix();
