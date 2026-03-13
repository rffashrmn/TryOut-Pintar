const router = require('express').Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/admin');
const { body, validationResult } = require('express-validator');

router.use(auth, adminAuth);

// List questions with filtering
router.get('/questions', async (req, res) => {
  try {
    const { subtest, package_number, question_type, category, difficulty, page = 1, limit = 20 } = req.query;
    let query = 'SELECT * FROM questions WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (subtest) { query += ` AND subtest = $${paramIndex++}`; params.push(subtest); }
    if (package_number) { query += ` AND package_number = $${paramIndex++}`; params.push(package_number); }
    if (question_type) { query += ` AND question_type = $${paramIndex++}`; params.push(question_type); }
    if (category) { query += ` AND category = $${paramIndex++}`; params.push(category); }
    if (difficulty) { query += ` AND difficulty = $${paramIndex++}`; params.push(difficulty); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY subtest, package_number, id LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), offset);

    const [questions] = await db.execute(query, params);

    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM questions WHERE 1=1';
    const countParams = [];
    let ci = 1;
    if (subtest) { countQuery += ` AND subtest = $${ci++}`; countParams.push(subtest); }
    if (package_number) { countQuery += ` AND package_number = $${ci++}`; countParams.push(package_number); }
    if (question_type) { countQuery += ` AND question_type = $${ci++}`; countParams.push(question_type); }
    if (category) { countQuery += ` AND category = $${ci++}`; countParams.push(category); }
    if (difficulty) { countQuery += ` AND difficulty = $${ci++}`; countParams.push(difficulty); }

    const [countResult] = await db.execute(countQuery, countParams);

    res.json({ questions, total: parseInt(countResult[0].total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Admin questions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create question
router.post('/questions', [
  body('subtest').notEmpty(),
  body('package_number').isInt(),
  body('question_text').notEmpty(),
  body('option_a').notEmpty(),
  body('option_b').notEmpty(),
  body('option_c').notEmpty(),
  body('option_d').notEmpty(),
  body('option_e').notEmpty(),
  body('correct_answer').isIn(['A','B','C','D','E'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e,
            correct_answer, category, difficulty, question_type, image_url } = req.body;

    const [result] = await db.execute(
      `INSERT INTO questions (subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e,
       correct_answer, category, difficulty, question_type, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e,
       correct_answer, category || null, difficulty || 'medium', question_type || 'both', image_url || null]
    );

    res.status(201).json({ id: result[0].id, message: 'Soal berhasil ditambahkan' });
  } catch (err) {
    console.error('Create question error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update question
router.put('/questions/:id', async (req, res) => {
  try {
    const { subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e,
            correct_answer, category, difficulty, question_type, image_url } = req.body;

    await db.execute(
      `UPDATE questions SET subtest=$1, package_number=$2, question_text=$3, option_a=$4, option_b=$5, option_c=$6,
       option_d=$7, option_e=$8, correct_answer=$9, category=$10, difficulty=$11, question_type=$12, image_url=$13 WHERE id=$14`,
      [subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e,
       correct_answer, category, difficulty, question_type, image_url, req.params.id]
    );

    res.json({ message: 'Soal berhasil diupdate' });
  } catch (err) {
    console.error('Update question error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete question
router.delete('/questions/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM questions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Soal berhasil dihapus' });
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Platform stats
router.get('/stats', async (req, res) => {
  try {
    const [userCount] = await db.execute("SELECT COUNT(*) as total FROM users WHERE role = 'user'");
    const [questionCount] = await db.execute('SELECT COUNT(*) as total FROM questions');
    const [attemptCount] = await db.execute("SELECT COUNT(*) as total FROM attempts WHERE status = 'completed'");
    const [paymentStats] = await db.execute("SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as revenue FROM payments WHERE status = 'success'");
    const [recentUsers] = await db.execute('SELECT id, name, email, credit_balance, created_at FROM users ORDER BY created_at DESC LIMIT 10');

    res.json({
      total_users: parseInt(userCount[0].total),
      total_questions: parseInt(questionCount[0].total),
      total_attempts: parseInt(attemptCount[0].total),
      total_payments: parseInt(paymentStats[0].total),
      total_revenue: parseFloat(paymentStats[0].revenue),
      recent_users: recentUsers
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// All payments
router.get('/payments', async (req, res) => {
  try {
    const [payments] = await db.execute(
      'SELECT p.*, u.name, u.email FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 100'
    );
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// All users
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT u.id, u.name, u.email, u.role, u.credit_balance, u.created_at,
              COUNT(DISTINCT a.id) as total_attempts
       FROM users u LEFT JOIN attempts a ON a.user_id = u.id
       GROUP BY u.id, u.name, u.email, u.role, u.credit_balance, u.created_at
       ORDER BY u.created_at DESC`
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
