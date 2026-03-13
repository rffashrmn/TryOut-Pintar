const router = require('express').Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Dashboard stats
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.execute('SELECT name, email, credit_balance FROM users WHERE id = $1', [userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });

    const [attemptStats] = await db.execute(
      `SELECT COUNT(*) as total_attempts,
              SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
              AVG(CASE WHEN status='completed' AND package_type='tryout' THEN score END) as avg_tryout_score
       FROM attempts WHERE user_id = $1`, [userId]
    );

    const [latestRank] = await db.execute(
      `SELECT l.score, l.rank_position, tp.package_number
       FROM leaderboard l JOIN tryout_packages tp ON tp.id = l.tryout_package_id
       WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT 1`, [userId]
    );

    const [perfData] = await db.execute(
      `SELECT aa.subtest, COUNT(*) as total, SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) as correct
       FROM attempt_answers aa JOIN attempts a ON a.id = aa.attempt_id
       WHERE a.user_id = $1 AND a.package_type = 'tryout' AND a.status = 'completed'
       GROUP BY aa.subtest`, [userId]
    );

    res.json({
      user: users[0],
      stats: {
        total_attempts: parseInt(attemptStats[0].total_attempts) || 0,
        completed: parseInt(attemptStats[0].completed) || 0,
        avg_tryout_score: Math.round(parseFloat(attemptStats[0].avg_tryout_score) || 0)
      },
      latest_rank: latestRank[0] || null,
      performance: perfData.map(p => ({
        subtest: p.subtest,
        accuracy: parseInt(p.total) > 0 ? Math.round((parseInt(p.correct) / parseInt(p.total)) * 100) : 0,
        correct: parseInt(p.correct),
        total: parseInt(p.total)
      }))
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// History
router.get('/history', auth, async (req, res) => {
  try {
    const [attempts] = await db.execute(
      `SELECT id, package_type, package_id, score, correct_count, wrong_count,
              unanswered_count, total_time_seconds, status, started_at, completed_at
       FROM attempts WHERE user_id = $1 ORDER BY started_at DESC LIMIT 50`, [req.user.id]
    );
    res.json({ attempts });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
