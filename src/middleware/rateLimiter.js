const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // General usage for smooth SPA navigation
  message: { error: 'Terlalu banyak request. Coba lagi nanti.' },
  validate: { trustProxy: false }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Strict limit for login (anti-brute force)
  message: { error: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
  validate: { trustProxy: false }
});

module.exports = { generalLimiter, authLimiter };
