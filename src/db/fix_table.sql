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
