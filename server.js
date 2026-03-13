require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Trust proxy for rate limiting behind ngrok/proxies
app.set('trust proxy', 1);

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

// Body parsing
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/quiz', require('./src/routes/quiz'));
app.use('/api/tryout', require('./src/routes/tryout'));
app.use('/api/leaderboard', require('./src/routes/leaderboard'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/admin', require('./src/routes/admin'));

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const db = require('./src/config/database');

async function startServer() {
  try {
    // Basic database health/schema check
    console.log('Checking database schema...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS public.tryout_subtest_progress (
        id SERIAL PRIMARY KEY,
        attempt_id INT NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
        subtest_name VARCHAR(100) NOT NULL,
        status VARCHAR(15) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        started_at TIMESTAMP NULL,
        time_remaining_seconds INT NOT NULL,
        UNIQUE(attempt_id, subtest_name)
      );
    `);
    console.log('Database schema verified.');

    app.listen(PORT, () => {
      console.log(`TryOut Pintar server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server due to database issue:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
