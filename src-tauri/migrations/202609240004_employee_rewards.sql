CREATE TABLE employee_rewards (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  amount_piasters INTEGER NOT NULL CHECK (amount_piasters > 0),
  reason TEXT NOT NULL,
  period_month TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX employee_rewards_month_idx ON employee_rewards(employee_id, period_month);
