require('dotenv').config();
const db = require('./src/config/database');

async function debug() {
  try {
    const [attempts] = await db.execute("SELECT id, package_id, status FROM attempts WHERE package_type = 'tryout' ORDER BY id DESC LIMIT 5");
    console.log('Recent Tryout Attempts:', JSON.stringify(attempts, null, 2));

    if (attempts.length > 0) {
      const attemptId = attempts[0].id;
      const [counts] = await db.execute(
        "SELECT subtest, COUNT(*) as count FROM attempt_answers WHERE attempt_id = $1 GROUP BY subtest",
        [attemptId]
      );
      console.log(`Subtest Distribution for Attempt ${attemptId}:`, JSON.stringify(counts, null, 2));
      
      const [details] = await db.execute(
        "SELECT aa.subtest as aa_subtest, q.subtest as q_subtest, q.question_text FROM attempt_answers aa JOIN questions q ON q.id = aa.question_id WHERE aa.attempt_id = $1 LIMIT 5",
        [attemptId]
      );
      console.log(`Sample Answers for Attempt ${attemptId}:`, JSON.stringify(details, null, 2));
    }

    const [questionStats] = await db.execute(
      "SELECT subtest, package_number, COUNT(*) FROM questions GROUP BY subtest, package_number"
    );
    console.log('Question Stats by Subtest and Package:', JSON.stringify(questionStats, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Debug failed:', err);
    process.exit(1);
  }
}

debug();
