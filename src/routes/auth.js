const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Diagnostic route
router.get('/health-check', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

// Register
router.post('/register', authLimiter, [
  body('name').trim().notEmpty().withMessage('Nama Lengkap wajib diisi'),
  body('email').isEmail().withMessage('Format email tidak valid, silakan periksa kembali'),
  body('password').isLength({ min: 6 }).withMessage('Password terlalu pendek, minimal gunakan 6 karakter')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;

    const [existing] = await db.execute('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, credit_balance) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashedPassword, 0]
    );

    const userId = result[0].id;
    const token = jwt.sign(
      { id: userId, email, name, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: userId, name, email, role: 'user', credit_balance: 0 } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Email tidak valid'),
  body('password').notEmpty().withMessage('Password wajib diisi')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    const [users] = await db.execute('SELECT * FROM users WHERE email = $1', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Email atau password salah' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Email atau password salah' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, credit_balance: user.credit_balance } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, name, email, role, credit_balance, created_at FROM users WHERE id = $1', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ user: users[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
