const db = require('./src/config/database');
const { generateAnalysis } = require('./src/utils/analysis');

async function test() {
  try {
    const attemptId = 3;
    const [attempts] = await db.execute('SELECT * FROM attempts WHERE id = $1', [attemptId]);
    if (attempts.length === 0) {
      console.log('Attempt 3 not found');
      process.exit(0);
    }
    
    console.log('Attempt 3 found for UserID:', attempts[0].user_id);
    
    const [answerDetails] = await db.execute(
      'SELECT aa.*, q.category, q.difficulty, q.subtest ' +
      'FROM attempt_answers aa ' +
      'JOIN questions q ON q.id = aa.question_id ' +
      'WHERE aa.attempt_id = $1', [attemptId]
    );
    
    console.log('Answer count:', answerDetails.length);
    
    const analysis = generateAnalysis(answerDetails, answerDetails.map(a => ({ 
      id: a.question_id, 
      category: a.category, 
      subtest: a.subtest, 
      difficulty: a.difficulty 
    })));
    
    console.log('ANALYSIS_SUBTEST_ANALYSIS_COUNT:', analysis.subtestAnalysis.length);
    console.log('FIRST_SUBTEST:', JSON.stringify(analysis.subtestAnalysis[0], null, 2));

    const userId = attempts[0].user_id;
    const [perfData] = await db.execute(
      'SELECT aa.subtest, COUNT(*) as total, SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) as correct ' +
      'FROM attempt_answers aa ' +
      'JOIN attempts a ON a.id = aa.attempt_id ' +
      'WHERE a.user_id = $1 AND a.package_type = $2 AND a.status = $3 ' +
      'GROUP BY aa.subtest', [userId, 'tryout', 'completed']
    );
    
    console.log('DASHBOARD_PERF_DATA_COUNT:', perfData.length);
    console.log('DASHBOARD_PERF_DATA:', JSON.stringify(perfData, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Test script failed:', err);
    process.exit(1);
  }
}

test();
