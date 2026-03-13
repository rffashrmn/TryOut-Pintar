const router = require('express').Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const { calculateSubtestScore } = require('../utils/scoring');
const { generateAnalysis } = require('../utils/analysis');

// List quiz packages grouped by subtest
router.get('/packages', auth, async (req, res) => {
  try {
    const [packages] = await db.execute('SELECT * FROM public.quiz_packages ORDER BY subtest, package_number');
    const [purchases] = await db.execute(
      'SELECT package_id FROM public.user_purchases WHERE user_id = $1 AND package_type = $2', [req.user.id, 'quiz']
    );
    const [inProgress] = await db.execute(
      'SELECT package_id FROM public.attempts WHERE user_id = $1 AND package_type = $2 AND status = $3', [req.user.id, 'quiz', 'in_progress']
    );
    const [completed] = await db.execute(
      'SELECT package_id, id as attempt_id FROM public.attempts WHERE user_id = $1 AND package_type = $2 AND status = $3', [req.user.id, 'quiz', 'completed']
    );
    const purchasedIds = new Set(purchases.map(p => p.package_id));
    const inProgressIds = new Set(inProgress.map(a => a.package_id));
    const completedMap = Object.fromEntries(completed.map(c => [c.package_id, c.attempt_id]));

    const grouped = {};
    for (const pkg of packages) {
      if (!grouped[pkg.subtest]) grouped[pkg.subtest] = [];
      grouped[pkg.subtest].push({ 
        ...pkg, 
        purchased: purchasedIds.has(pkg.id), 
        in_progress: inProgressIds.has(pkg.id),
        completed_attempt_id: completedMap[pkg.id] || null
      });
    }
    res.json({ packages: grouped });
  } catch (err) {
    console.error('Quiz packages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const Mayar = require('../utils/mayar');

// Purchase quiz package
router.post('/purchase/:id', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const packageId = parseInt(req.params.id);

    const [existing] = await conn.execute(
      'SELECT id FROM public.user_purchases WHERE user_id = $1 AND package_type = $2 AND package_id = $3',
      [req.user.id, 'quiz', packageId]
    );
    if (existing.length > 0) { await conn.rollback(); conn.release(); return res.json({ message: 'Paket sudah dibeli', already_purchased: true }); }

    const [pkgs] = await conn.execute('SELECT * FROM public.quiz_packages WHERE id = $1', [packageId]);
    if (pkgs.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Paket tidak ditemukan' }); }
    const pkg = pkgs[0];
    const price = pkg.price_credit;

    const [users] = await conn.execute('SELECT credit_balance, mayar_customer_id FROM public.users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const user = users[0];
    if (user.credit_balance < price) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ error: 'Kredit tidak cukup', required: price, balance: user.credit_balance });
    }

    // Spend from Mayar if customerId exists
    if (user.mayar_customer_id && price > 0) {
      const mayarRes = await Mayar.spendCredit(user.mayar_customer_id, price);
      if (!mayarRes.success && mayarRes.status !== 404) {
        // If Mayar fails (and it's not just a missing customer record), we should prevent local purchase
        // but for now we might want to allow it if the user has local balance, 
        // OR we enforce sync. Let's log it for now but proceed locally for better UX if local balance is enough.
        console.error('Mayar Spend Failed:', mayarRes.data);
      }
    }

    await conn.execute('UPDATE public.users SET credit_balance = credit_balance - $1 WHERE id = $2', [price, req.user.id]);
    await conn.execute('INSERT INTO public.user_purchases (user_id, package_type, package_id) VALUES ($1, $2, $3)', [req.user.id, 'quiz', packageId]);
    
    // Add transaction history
    await conn.execute(
      'INSERT INTO public.payments (user_id, amount, credits_added, status, transaction_type, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 0, price, 'success', 'debit', `Pembelian Quiz: ${pkg.subtest} (Paket ${pkg.package_number})`]
    );

    await conn.commit();
    res.json({ message: 'Paket berhasil dibeli', new_balance: user.credit_balance - price });
  } catch (err) {
    await conn.rollback();
    console.error('Purchase error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// Start quiz
router.post('/start/:packageId', auth, async (req, res) => {
  try {
    const packageId = parseInt(req.params.packageId);

    const [purchase] = await db.execute(
      'SELECT id FROM user_purchases WHERE user_id = $1 AND package_type = $2 AND package_id = $3',
      [req.user.id, 'quiz', packageId]
    );
    if (purchase.length === 0) return res.status(403).json({ error: 'Paket belum dibeli' });

    const [existing] = await db.execute(
      'SELECT id, status FROM public.attempts WHERE user_id = $1 AND package_type = $2 AND package_id = $3',
      [req.user.id, 'quiz', packageId]
    );

    if (existing.length > 0) {
      const completedAttempt = existing.find(a => a.status === 'completed');
      if (completedAttempt) return res.status(403).json({ error: 'Quiz ini sudah selesai dikerjakan dan tidak dapat diulang.' });

      const inProgressAttempt = existing.find(a => a.status === 'in_progress');
      if (inProgressAttempt) {
        // Check if this attempt has questions
        const [qCount] = await db.execute('SELECT COUNT(*) as count FROM public.attempt_answers WHERE attempt_id = $1', [inProgressAttempt.id]);
        if (parseInt(qCount[0].count) > 0) {
          return res.json({ attempt_id: inProgressAttempt.id, resumed: true });
        }
        // If 0 questions, we'll delete it and start over below
        await db.execute('DELETE FROM public.attempts WHERE id = $1', [inProgressAttempt.id]);
      }
    }

    const [pkgs] = await db.execute('SELECT * FROM public.quiz_packages WHERE id = $1', [packageId]);
    if (pkgs.length === 0) return res.status(404).json({ error: 'Paket tidak ditemukan' });
    const pkg = pkgs[0];

    const timeSeconds = pkg.time_minutes * 60;
    const [result] = await db.execute(
      'INSERT INTO public.attempts (user_id, package_type, package_id, current_subtest, time_remaining_seconds) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.user.id, 'quiz', packageId, pkg.subtest, timeSeconds]
    );
    const attemptId = result[0].id;

    const [questions] = await db.execute(
      'SELECT id FROM public.questions WHERE subtest = $1 AND package_number = $2 AND question_type IN (\'quiz\', \'both\') ORDER BY RANDOM() LIMIT $3',
      [pkg.subtest, pkg.package_number, pkg.total_questions]
    );

    for (const q of questions) {
      await db.execute(
        'INSERT INTO public.attempt_answers (attempt_id, question_id, subtest) VALUES ($1, $2, $3)',
        [attemptId, q.id, pkg.subtest]
      );
    }

    res.json({ attempt_id: attemptId, resumed: false });
  } catch (err) {
    console.error('Start quiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get attempt data
router.get('/attempt/:attemptId', auth, async (req, res) => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    const [attempts] = await db.execute('SELECT * FROM public.attempts WHERE id = $1 AND user_id = $2', [attemptId, req.user.id]);
    if (attempts.length === 0) return res.status(404).json({ error: 'Attempt tidak ditemukan' });

    const attempt = attempts[0];
    if (attempt.package_type === 'quiz' && attempt.status === 'in_progress') {
      const [completed] = await db.execute(
        'SELECT id FROM public.attempts WHERE user_id = $1 AND package_type = $2 AND package_id = $3 AND status = $4',
        [req.user.id, 'quiz', attempt.package_id, 'completed']
      );
      if (completed.length > 0) {
        return res.status(403).json({ error: 'Quiz ini sudah selesai dikerjakan dan tidak dapat diakses kembali.' });
      }
    }

    const [answers] = await db.execute(
      `SELECT aa.id, aa.question_id, aa.user_answer, q.question_text, q.option_a, q.option_b,
              q.option_c, q.option_d, q.option_e, q.category, q.difficulty, q.image_url
       FROM public.attempt_answers aa JOIN public.questions q ON q.id = aa.question_id
       WHERE aa.attempt_id = $1`, [attemptId]
    );

    res.json({ attempt, questions: answers });
  } catch (err) {
    console.error('Get attempt error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save answer
router.post('/answer', auth, async (req, res) => {
  try {
    const { attempt_id, question_id, answer, time_remaining } = req.body;

    const [attempts] = await db.execute(
      'SELECT id FROM public.attempts WHERE id = $1 AND user_id = $2 AND status = $3',
      [attempt_id, req.user.id, 'in_progress']
    );
    if (attempts.length === 0) return res.status(403).json({ error: 'Attempt tidak valid' });

    await db.execute(
      'UPDATE public.attempt_answers SET user_answer = $1 WHERE attempt_id = $2 AND question_id = $3',
      [answer, attempt_id, question_id]
    );

    if (time_remaining !== undefined) {
      await db.execute('UPDATE public.attempts SET time_remaining_seconds = $1 WHERE id = $2', [time_remaining, attempt_id]);
    }

    res.json({ saved: true });
  } catch (err) {
    console.error('Save answer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit quiz
router.post('/submit/:attemptId', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const attemptId = parseInt(req.params.attemptId);

    const [attempts] = await conn.execute(
      'SELECT * FROM public.attempts WHERE id = $1 AND user_id = $2 AND status = $3',
      [attemptId, req.user.id, 'in_progress']
    );
    if (attempts.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Attempt tidak ditemukan' }); }

    const [answers] = await conn.execute(
      `SELECT aa.id, aa.question_id, aa.user_answer, q.correct_answer
       FROM public.attempt_answers aa JOIN public.questions q ON q.id = aa.question_id
       WHERE aa.attempt_id = $1`, [attemptId]
    );

    let correct = 0, wrong = 0, unanswered = 0;
    for (const a of answers) {
      if (!a.user_answer) {
        unanswered++;
        await conn.execute('UPDATE public.attempt_answers SET is_correct = 0 WHERE id = $1', [a.id]);
      } else if (a.user_answer === a.correct_answer) {
        correct++;
        await conn.execute('UPDATE public.attempt_answers SET is_correct = 1 WHERE id = $1', [a.id]);
      } else {
        wrong++;
        await conn.execute('UPDATE public.attempt_answers SET is_correct = 0 WHERE id = $1', [a.id]);
      }
    }

    const score = calculateSubtestScore(correct, answers.length);
    const totalTime = req.body.total_time || 0;

    await conn.execute(
      `UPDATE public.attempts SET status = 'completed', score = $1, correct_count = $2, wrong_count = $3,
       unanswered_count = $4, total_time_seconds = $5, completed_at = NOW() WHERE id = $6`,
      [score, correct, wrong, unanswered, totalTime, attemptId]
    );

    await conn.commit();

    const [answerDetails] = await db.execute(
      `SELECT aa.*, q.category, q.difficulty, q.subtest, q.correct_answer
       FROM public.attempt_answers aa JOIN public.questions q ON q.id = aa.question_id WHERE aa.attempt_id = $1`, [attemptId]
    );
    const analysis = generateAnalysis(answerDetails, answerDetails.map(a => ({ id: a.question_id, category: a.category, subtest: a.subtest, difficulty: a.difficulty })));

    res.json({ score, correct, wrong, unanswered, total: answers.length, analysis });
  } catch (err) {
    await conn.rollback();
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// Get results
router.get('/results/:attemptId', auth, async (req, res) => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    const [attempts] = await db.execute('SELECT * FROM attempts WHERE id = $1 AND user_id = $2', [attemptId, req.user.id]);
    if (attempts.length === 0) return res.status(404).json({ error: 'Attempt tidak ditemukan' });

    const [answerDetails] = await db.execute(
      `SELECT aa.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.option_e,
              q.correct_answer, q.category, q.difficulty, q.subtest, q.image_url
       FROM public.attempt_answers aa JOIN public.questions q ON q.id = aa.question_id WHERE aa.attempt_id = $1`, [attemptId]
    );

    const analysis = generateAnalysis(answerDetails,
      answerDetails.map(a => ({ id: a.question_id, category: a.category, subtest: a.subtest, difficulty: a.difficulty }))
    );

    res.json({ attempt: attempts[0], answers: answerDetails, analysis });
  } catch (err) {
    console.error('Results error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
