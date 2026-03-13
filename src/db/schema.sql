-- TryOut Pintar Database Schema (PostgreSQL)

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  credit_balance INT DEFAULT 0,
  mayar_customer_id VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  subtest VARCHAR(100) NOT NULL,
  package_number INT NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  option_e TEXT NOT NULL,
  correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D','E')),
  category VARCHAR(100) DEFAULT NULL,
  difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  question_type VARCHAR(10) DEFAULT 'both' CHECK (question_type IN ('quiz','tryout','both')),
  image_url TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subtest_pkg ON questions(subtest, package_number);
CREATE INDEX IF NOT EXISTS idx_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_difficulty ON questions(difficulty);

-- Quiz Packages
CREATE TABLE IF NOT EXISTS quiz_packages (
  id SERIAL PRIMARY KEY,
  subtest VARCHAR(100) NOT NULL,
  package_number INT NOT NULL,
  total_questions INT NOT NULL,
  time_minutes INT NOT NULL,
  price_credit INT NOT NULL DEFAULT 250,
  UNIQUE (subtest, package_number)
);

-- Tryout Packages
CREATE TABLE IF NOT EXISTS tryout_packages (
  id SERIAL PRIMARY KEY,
  package_number INT NOT NULL UNIQUE,
  price_credit INT NOT NULL DEFAULT 1000
);

-- Tryout Package Subtests
CREATE TABLE IF NOT EXISTS tryout_subtests (
  id SERIAL PRIMARY KEY,
  tryout_package_id INT NOT NULL REFERENCES tryout_packages(id) ON DELETE CASCADE,
  subtest VARCHAR(100) NOT NULL,
  total_questions INT NOT NULL,
  time_minutes DECIMAL(5,1) NOT NULL,
  sort_order INT NOT NULL
);

-- User Purchases
CREATE TABLE IF NOT EXISTS user_purchases (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_type VARCHAR(10) NOT NULL CHECK (package_type IN ('quiz','tryout')),
  package_id INT NOT NULL,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, package_type, package_id)
);

-- Attempts
CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_type VARCHAR(10) NOT NULL CHECK (package_type IN ('quiz','tryout')),
  package_id INT NOT NULL,
  current_subtest VARCHAR(100) DEFAULT NULL,
  score DECIMAL(7,2) DEFAULT NULL,
  correct_count INT DEFAULT 0,
  wrong_count INT DEFAULT 0,
  unanswered_count INT DEFAULT 0,
  total_time_seconds INT DEFAULT 0,
  time_remaining_seconds INT DEFAULT NULL,
  status VARCHAR(15) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  subtest_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_user_attempts ON attempts(user_id, package_type, status);

-- Attempt Answers
CREATE TABLE IF NOT EXISTS attempt_answers (
  id SERIAL PRIMARY KEY,
  attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  subtest VARCHAR(100) DEFAULT NULL,
  user_answer VARCHAR(1) DEFAULT NULL CHECK (user_answer IN ('A','B','C','D','E') OR user_answer IS NULL),
  is_correct SMALLINT DEFAULT NULL,
  UNIQUE (attempt_id, question_id)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id VARCHAR(255) NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  credits_added INT NOT NULL,
  status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  transaction_type VARCHAR(10) DEFAULT 'credit' CHECK (transaction_type IN ('credit','debit')),
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard
CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  tryout_package_id INT NOT NULL REFERENCES tryout_packages(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  score DECIMAL(7,2) NOT NULL,
  total_time_seconds INT NOT NULL,
  rank_position INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(tryout_package_id, score DESC, total_time_seconds ASC);

-- Tryout Subtest Progress (Flexible Order Performance)
CREATE TABLE IF NOT EXISTS tryout_subtest_progress (
  id SERIAL PRIMARY KEY,
  attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  subtest_name VARCHAR(100) NOT NULL,
  status VARCHAR(15) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMP NULL,
  time_remaining_seconds INT NOT NULL,
  UNIQUE(attempt_id, subtest_name)
);

