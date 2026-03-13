const router = require('express').Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Global leaderboard
router.get('/global', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT l.*, u.name, tp.package_number
       FROM public.leaderboard l
       JOIN public.users u ON u.id = l.user_id
       JOIN public.tryout_packages tp ON tp.id = l.tryout_package_id
       ORDER BY l.score DESC, l.total_time_seconds ASC
       LIMIT 100`
    );
    const [userRanks] = await db.execute(
      `SELECT l.*, tp.package_number FROM public.leaderboard l
       JOIN public.tryout_packages tp ON tp.id = l.tryout_package_id
       WHERE l.user_id = $1 ORDER BY l.score DESC`, [req.user.id]
    );
    res.json({ leaderboard: rows, user_ranks: userRanks });
  } catch (err) {
    console.error('Global leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Per-tryout leaderboard
router.get('/tryout/:packageId', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT l.*, u.name
       FROM public.leaderboard l JOIN public.users u ON u.id = l.user_id
       WHERE l.tryout_package_id = $1
       ORDER BY l.score DESC, l.total_time_seconds ASC
       LIMIT 100`, [req.params.packageId]
    );
    const [userRank] = await db.execute(
      'SELECT * FROM public.leaderboard WHERE tryout_package_id = $1 AND user_id = $2',
      [req.params.packageId, req.user.id]
    );
    res.json({ leaderboard: rows, user_rank: userRank[0] || null });
  } catch (err) {
    console.error('Tryout leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
