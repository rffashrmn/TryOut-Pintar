const router = require('express').Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const { calculateTryoutScore } = require('../utils/scoring');
const { generateAnalysis, generateSubtestAnalysis } = require('../utils/analysis');

// List tryout packages
router.get('/packages', auth, async (req, res) => {
  try {
    const [packages] = await db.execute('SELECT * FROM tryout_packages ORDER BY package_number');
    const [purchases] = await db.execute(
      'SELECT package_id FROM user_purchases WHERE user_id = $1 AND package_type = $2', [req.user.id, 'tryout']
    );
    let inProgress = [];
    try {
      const [res] = await db.execute(
        `SELECT a.package_id, a.id as attempt_id, tsp.subtest_name, tsp.time_remaining_seconds, tsp.started_at
         FROM attempts a
         JOIN tryout_subtest_progress tsp ON tsp.attempt_id = a.id
         WHERE a.user_id = $1 AND a.package_type = 'tryout' AND a.status = 'in_progress' AND tsp.status = 'in_progress'`,
        [req.user.id]
      );
      inProgress = res;
    } catch (e) {
      console.warn('Tryout in-progress query failed (schema issue?):', e.message);
    }
    const [completed] = await db.execute(
      'SELECT package_id, id as attempt_id FROM attempts WHERE user_id = $1 AND package_type = $2 AND status = $3', [req.user.id, 'tryout', 'completed']
    );
    const purchasedIds = new Set(purchases.map(p => p.package_id));
    const inProgressMap = Object.fromEntries(inProgress.map(a => {
      const now = new Date();
      const startedAt = new Date(a.started_at);
      const elapsed = Math.floor((now - startedAt) / 1000);
      const remaining = Math.max(0, a.time_remaining_seconds - elapsed);
      return [a.package_id, { attempt_id: a.attempt_id, subtest_name: a.subtest_name, time_remaining: remaining }];
    }));
    const completedMap = Object.fromEntries(completed.map(c => [c.package_id, c.attempt_id]));

    const result = packages.map(pkg => ({ 
      ...pkg, 
      purchased: purchasedIds.has(pkg.id), 
      in_progress: !!inProgressMap[pkg.id],
      time_remaining_seconds: inProgressMap[pkg.id]?.time_remaining || null,
      completed_attempt_id: completedMap[pkg.id] || null
    }));
    res.json({ packages: result });
  } catch (err) {
    console.error('Tryout packages error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get tryout subtests
router.get('/packages/:id/subtests', auth, async (req, res) => {
  try {
    const [subtests] = await db.execute(
      'SELECT * FROM tryout_subtests WHERE tryout_package_id = $1 ORDER BY sort_order', [req.params.id]
    );
    res.json({ subtests });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const Mayar = require('../utils/mayar');

// Purchase tryout
router.post('/purchase/:id', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const packageId = parseInt(req.params.id);

    const [existing] = await conn.execute(
      'SELECT id FROM user_purchases WHERE user_id = $1 AND package_type = $2 AND package_id = $3',
      [req.user.id, 'tryout', packageId]
    );
    if (existing.length > 0) { await conn.rollback(); conn.release(); return res.json({ message: 'Paket sudah dibeli', already_purchased: true }); }

    const [pkgs] = await conn.execute('SELECT * FROM tryout_packages WHERE id = $1', [packageId]);
    if (pkgs.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Paket tidak ditemukan' }); }
    const pkg = pkgs[0];
    const price = pkg.price_credit;

    const [users] = await conn.execute('SELECT credit_balance, mayar_customer_id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const user = users[0];
    if (user.credit_balance < price) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ error: 'Kredit tidak cukup', required: price, balance: user.credit_balance });
    }

    // Spend from Mayar
    if (user.mayar_customer_id && price > 0) {
      const mayarRes = await Mayar.spendCredit(user.mayar_customer_id, price);
      if (!mayarRes.success && mayarRes.status !== 404) {
        console.error('Mayar Spend Failed:', mayarRes.data);
      }
    }

    await conn.execute('UPDATE users SET credit_balance = credit_balance - $1 WHERE id = $2', [price, req.user.id]);
    await conn.execute('INSERT INTO user_purchases (user_id, package_type, package_id) VALUES ($1, $2, $3)', [req.user.id, 'tryout', packageId]);
    
    // Add transaction history
    await conn.execute(
      'INSERT INTO payments (user_id, amount, credits_added, status, transaction_type, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 0, price, 'success', 'debit', `Pembelian Try Out (Paket ${pkg.package_number})`]
    );

    await conn.commit();
    res.json({ message: 'Paket berhasil dibeli', new_balance: user.credit_balance - price });
  } catch (err) {
    await conn.rollback();
    console.error('Purchase tryout error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// Start tryout
router.post('/start/:packageId', auth, async (req, res) => {
  try {
    const packageId = parseInt(req.params.packageId);

    const [purchase] = await db.execute(
      'SELECT id FROM user_purchases WHERE user_id = $1 AND package_type = $2 AND package_id = $3',
      [req.user.id, 'tryout', packageId]
    );
    if (purchase.length === 0) return res.status(403).json({ error: 'Paket belum dibeli' });

    const [existing] = await db.execute(
      'SELECT id FROM attempts WHERE user_id = $1 AND package_type = $2 AND package_id = $3 AND status = $4',
      [req.user.id, 'tryout', packageId, 'in_progress']
    );
    if (existing.length > 0) {
      const attemptId = existing[0].id;
      
      // Check if this attempt has questions
      const [qCount] = await db.execute('SELECT COUNT(*) as count FROM attempt_answers WHERE attempt_id = $1', [attemptId]);
      
      if (parseInt(qCount[0].count) > 0) {
        // Ensure subtest progress exists (for legacy attempts)
        const [progCheck] = await db.execute('SELECT id FROM tryout_subtest_progress WHERE attempt_id = $1', [attemptId]);
        if (progCheck.length === 0) {
          const [subs] = await db.execute('SELECT * FROM tryout_subtests WHERE tryout_package_id = $1 ORDER BY sort_order', [packageId]);
          for (const sub of subs) {
            await db.execute(
              'INSERT INTO tryout_subtest_progress (attempt_id, subtest_name, time_remaining_seconds) VALUES ($1, $2, $3)',
              [attemptId, sub.subtest, Math.round(parseFloat(sub.time_minutes) * 60)]
            );
          }
        }
        return res.json({ attempt_id: attemptId, resumed: true });
      }
      
      // If 0 questions, delete attempt to start a fresh one
      await db.execute('DELETE FROM attempts WHERE id = $1', [attemptId]);
    }

    const [subtests] = await db.execute(
      'SELECT * FROM tryout_subtests WHERE tryout_package_id = $1 ORDER BY sort_order', [packageId]
    );
    if (subtests.length === 0) return res.status(404).json({ error: 'Subtes tidak ditemukan' });

    const firstSubtest = subtests[0];

    const [result] = await db.execute(
      'INSERT INTO attempts (user_id, package_type, package_id, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.id, 'tryout', packageId, 'in_progress']
    );
    const attemptId = result[0].id;

    // Initialize subtest progress
    for (const sub of subtests) {
      await db.execute(
        'INSERT INTO tryout_subtest_progress (attempt_id, subtest_name, time_remaining_seconds) VALUES ($1, $2, $3)',
        [attemptId, sub.subtest, Math.round(parseFloat(sub.time_minutes) * 60)]
      );
    }

    const [pkg] = await db.execute('SELECT package_number FROM tryout_packages WHERE id = $1', [packageId]);
    const pkgNumber = pkg[0].package_number;

    for (const sub of subtests) {
      const [questions] = await db.execute(
        'SELECT id FROM questions WHERE subtest = $1 AND package_number = $2 AND question_type IN (\'tryout\', \'both\') ORDER BY RANDOM() LIMIT $3',
        [sub.subtest, pkgNumber, sub.total_questions]
      );
      for (const q of questions) {
        await db.execute(
          'INSERT INTO attempt_answers (attempt_id, question_id, subtest) VALUES ($1, $2, $3)',
          [attemptId, q.id, sub.subtest]
        );
      }
    }

    res.json({ attempt_id: attemptId, resumed: false });
  } catch (err) {
    console.error('Start tryout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get attempt data
router.get('/attempt/:attemptId', auth, async (req, res) => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    const [attempts] = await db.execute('SELECT * FROM attempts WHERE id = $1 AND user_id = $2', [attemptId, req.user.id]);
    if (attempts.length === 0) return res.status(404).json({ error: 'Attempt tidak ditemukan' });

    const [subtests] = await db.execute(
      'SELECT * FROM tryout_subtests WHERE tryout_package_id = $1 ORDER BY sort_order', [attempts[0].package_id]
    );

    let [progress] = await db.execute(
      'SELECT *, EXTRACT(EPOCH FROM (NOW() - started_at))::INT as elapsed FROM tryout_subtest_progress WHERE attempt_id = $1',
      [attemptId]
    );

    if (progress.length === 0 && attempts[0].status === 'in_progress') {
      // Lazy init if missing
      for (const sub of subtests) {
        await db.execute(
          'INSERT INTO tryout_subtest_progress (attempt_id, subtest_name, time_remaining_seconds) VALUES ($1, $2, $3)',
          [attemptId, sub.subtest, Math.round(parseFloat(sub.time_minutes) * 60)]
        );
      }
      const [newProg] = await db.execute(
        'SELECT *, EXTRACT(EPOCH FROM (NOW() - started_at))::INT as elapsed FROM tryout_subtest_progress WHERE attempt_id = $1',
        [attemptId]
      );
      progress = newProg;
    }

    // Filter questions by current subtest if needed, or return all
    // For the list page, we might just need the progress
    // Updated: ExamPage will request specific subtest via params if needed
    const currentSubName = req.query.subtest;
    let questionsResult = [];

    if (currentSubName) {
      const [answers] = await db.execute(
        `SELECT aa.id, aa.question_id, aa.user_answer, aa.subtest, q.question_text, q.option_a, q.option_b,
                q.option_c, q.option_d, q.option_e, q.category, q.difficulty, q.image_url
         FROM attempt_answers aa JOIN questions q ON q.id = aa.question_id
         WHERE aa.attempt_id = $1 AND aa.subtest = $2 ORDER BY aa.id`, [attemptId, currentSubName]
      );
      questionsResult = answers;
    }

    res.json({ attempt: attempts[0], subtests, progress, questions: questionsResult });
  } catch (err) {
    console.error('Get tryout attempt error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Save answer
router.post('/answer', auth, async (req, res) => {
  try {
    const { attempt_id, question_id, answer, subtest } = req.body;


    const [progress] = await db.execute(
      'SELECT *, EXTRACT(EPOCH FROM (NOW() - started_at))::INT as elapsed FROM tryout_subtest_progress WHERE attempt_id = $1 AND subtest_name = $2 AND status = $3',
      [attempt_id, subtest, 'in_progress']
    );
    if (progress.length === 0) return res.status(403).json({ error: 'Ujian tidak aktif atau sudah selesai' });

    const p = progress[0];
    const realTimeRemaining = p.time_remaining_seconds - p.elapsed;

    if (realTimeRemaining <= -5) { // 5-second grace period for latency
      return res.status(403).json({ error: 'Waktu subtes sudah habis', expired: true });
    }

    await db.execute(
      'UPDATE attempt_answers SET user_answer = $1 WHERE attempt_id = $2 AND question_id = $3',
      [answer, attempt_id, question_id]
    );

    res.json({ saved: true });
  } catch (err) {
    console.error('Save tryout answer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start subtest
router.post('/subtest/start', auth, async (req, res) => {
  try {
    const { attempt_id, subtest } = req.body;
    const [progress] = await db.execute(
      'SELECT subtest_name, status FROM tryout_subtest_progress WHERE attempt_id = $1',
      [attempt_id]
    );
    
    const activeSubtest = progress.find(p => p.status === 'in_progress');
    if (activeSubtest && activeSubtest.subtest_name !== subtest) {
      return res.status(400).json({ 
        error: `Anda masih memiliki subtes aktif: ${activeSubtest.subtest_name}. Selesaikan subtes tersebut terlebih dahulu.` 
      });
    }

    const currentSub = progress.find(p => p.subtest_name === subtest);
    if (!currentSub) return res.status(404).json({ error: 'Subtest tidak ditemukan' });
    if (currentSub.status === 'completed') return res.status(400).json({ error: 'Subtest sudah selesai' });

    await db.execute(
      "UPDATE tryout_subtest_progress SET status = 'in_progress', started_at = NOW() WHERE attempt_id = $1 AND subtest_name = $2",
      [attempt_id, subtest]
    );
    // Sync current_subtest in attempts
    await db.execute('UPDATE attempts SET current_subtest = $1 WHERE id = $2', [subtest, attempt_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit subtest
router.post('/subtest/submit', auth, async (req, res) => {
  try {
    const { attempt_id, subtest } = req.body;
    await db.execute(
      "UPDATE tryout_subtest_progress SET status = 'completed', started_at = NULL WHERE attempt_id = $1 AND subtest_name = $2",
      [attempt_id, subtest]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit tryout
router.post('/submit/:attemptId', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const attemptId = parseInt(req.params.attemptId);

    const [attempts] = await conn.execute(
      'SELECT * FROM attempts WHERE id = $1 AND user_id = $2 AND status = $3',
      [attemptId, req.user.id, 'in_progress']
    );
    if (attempts.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Attempt tidak ditemukan' }); }
    const attempt = attempts[0];

    const [answers] = await conn.execute(
      `SELECT aa.id, aa.question_id, aa.user_answer, aa.subtest, q.correct_answer
       FROM attempt_answers aa JOIN questions q ON q.id = aa.question_id
       WHERE aa.attempt_id = $1`, [attemptId]
    );

    let correct = 0, wrong = 0, unanswered = 0;
    const subtestResults = {};

    for (const a of answers) {
      if (!subtestResults[a.subtest]) subtestResults[a.subtest] = { subtest: a.subtest, correct: 0, total: 0 };
      subtestResults[a.subtest].total++;

      if (!a.user_answer) {
        unanswered++;
        await conn.execute('UPDATE attempt_answers SET is_correct = 0 WHERE id = $1', [a.id]);
      } else if (a.user_answer === a.correct_answer) {
        correct++;
        subtestResults[a.subtest].correct++;
        await conn.execute('UPDATE attempt_answers SET is_correct = 1 WHERE id = $1', [a.id]);
      } else {
        wrong++;
        await conn.execute('UPDATE attempt_answers SET is_correct = 0 WHERE id = $1', [a.id]);
      }
    }

    const score = calculateTryoutScore(Object.values(subtestResults));
    const totalTime = req.body.total_time || 0;

    await conn.execute(
      `UPDATE attempts SET status = 'completed', score = $1, correct_count = $2, wrong_count = $3,
       unanswered_count = $4, total_time_seconds = $5, completed_at = NOW() WHERE id = $6`,
      [score, correct, wrong, unanswered, totalTime, attemptId]
    );

    // Update leaderboard
    const [existingEntry] = await conn.execute(
      'SELECT id, score FROM leaderboard WHERE tryout_package_id = $1 AND user_id = $2',
      [attempt.package_id, req.user.id]
    );

    if (existingEntry.length === 0 || score > parseFloat(existingEntry[0].score)) {
      if (existingEntry.length > 0) {
        await conn.execute(
          'UPDATE leaderboard SET score = $1, total_time_seconds = $2, attempt_id = $3 WHERE id = $4',
          [score, totalTime, attemptId, existingEntry[0].id]
        );
      } else {
        await conn.execute(
          'INSERT INTO leaderboard (tryout_package_id, user_id, attempt_id, score, total_time_seconds) VALUES ($1, $2, $3, $4, $5)',
          [attempt.package_id, req.user.id, attemptId, score, totalTime]
        );
      }

      // Recalculate ranks
      const [ranking] = await conn.execute(
        'SELECT id FROM leaderboard WHERE tryout_package_id = $1 ORDER BY score DESC, total_time_seconds ASC',
        [attempt.package_id]
      );
      for (let i = 0; i < ranking.length; i++) {
        await conn.execute('UPDATE leaderboard SET rank_position = $1 WHERE id = $2', [i + 1, ranking[i].id]);
      }
    }

    await conn.commit();

    const subtestAnalysis = generateSubtestAnalysis(Object.values(subtestResults));

    res.json({
      score, correct, wrong, unanswered, total: answers.length,
      subtest_results: Object.values(subtestResults),
      analysis: subtestAnalysis
    });
  } catch (err) {
    await conn.rollback();
    console.error('Submit tryout error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// Get tryout results
router.get('/results/:attemptId', auth, async (req, res) => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    const [attempts] = await db.execute('SELECT * FROM attempts WHERE id = $1 AND user_id = $2', [attemptId, req.user.id]);
    if (attempts.length === 0) return res.status(404).json({ error: 'Attempt tidak ditemukan' });

    const [answerDetails] = await db.execute(
      `SELECT aa.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.option_e,
              q.correct_answer, q.category, q.difficulty, q.subtest, q.image_url
       FROM attempt_answers aa JOIN questions q ON q.id = aa.question_id WHERE aa.attempt_id = $1`, [attemptId]
    );

    const subtestStats = {};
    for (const a of answerDetails) {
      if (!subtestStats[a.subtest]) subtestStats[a.subtest] = { subtest: a.subtest, correct: 0, total: 0 };
      subtestStats[a.subtest].total++;
      if (a.is_correct) subtestStats[a.subtest].correct++;
    }

    const analysis = generateAnalysis(answerDetails,
      answerDetails.map(a => ({ id: a.question_id, category: a.category, subtest: a.subtest, difficulty: a.difficulty }))
    );
    const subtestAnalysis = generateSubtestAnalysis(Object.values(subtestStats));

    const [rank] = await db.execute(
      'SELECT rank_position FROM leaderboard WHERE tryout_package_id = $1 AND user_id = $2',
      [attempts[0].package_id, req.user.id]
    );

    res.json({
      attempt: attempts[0], answers: answerDetails,
      subtest_results: Object.values(subtestStats),
      analysis, subtestAnalysis,
      rank: rank[0]?.rank_position || null
    });
  } catch (err) {
    console.error('Results error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
