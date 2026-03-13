const db = require('./src/config/database');

async function test() {
  try {
    const userId = 1; // Assume admin or first user
    console.log('Testing /packages query...');
    const [packages] = await db.execute('SELECT * FROM tryout_packages ORDER BY package_number');
    const [purchases] = await db.execute(
      'SELECT package_id FROM user_purchases WHERE user_id = $1 AND package_type = $2', [userId, 'tryout']
    );
    const [inProgress] = await db.execute(
      `SELECT a.package_id, a.id as attempt_id, tsp.subtest_name, tsp.time_remaining_seconds, tsp.started_at
       FROM attempts a
       JOIN tryout_subtest_progress tsp ON tsp.attempt_id = a.id
       WHERE a.user_id = $1 AND a.package_type = 'tryout' AND a.status = 'in_progress' AND tsp.status = 'in_progress'`,
      [userId]
    );
    const [completed] = await db.execute(
      'SELECT package_id, id as attempt_id FROM attempts WHERE user_id = $1 AND package_type = $2 AND status = $3', [userId, 'tryout', 'completed']
    );

    console.log('Packages:', packages.length);
    console.log('Purchases:', purchases.length);
    console.log('InProgress:', inProgress.length);
    console.log('Completed:', completed.length);

    const inProgressMap = Object.fromEntries(inProgress.map(a => {
      const now = new Date();
      const startedAt = new Date(a.started_at);
      const elapsed = Math.floor((now - startedAt) / 1000);
      const remaining = Math.max(0, a.time_remaining_seconds - elapsed);
      return [a.package_id, { attempt_id: a.attempt_id, subtest_name: a.subtest_name, time_remaining: remaining }];
    }));

    console.log('Map success');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

test();
