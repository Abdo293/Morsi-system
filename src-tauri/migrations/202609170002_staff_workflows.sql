CREATE TABLE telegram_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  bot_token TEXT NOT NULL DEFAULT '',
  chat_id TEXT NOT NULL DEFAULT '',
  grace_minutes INTEGER NOT NULL DEFAULT 0 CHECK (grace_minutes >= 0)
);

INSERT INTO telegram_settings(id) VALUES (1);

ALTER TABLE employee_deductions ADD COLUMN period_month TEXT;
ALTER TABLE employee_loan_repayments ADD COLUMN period_month TEXT;

CREATE INDEX attendance_employee_date_idx ON attendance(employee_id, shift_date);
CREATE INDEX employee_deductions_month_idx ON employee_deductions(employee_id, period_month);
