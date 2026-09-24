CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT,
  job_title TEXT NOT NULL,
  address TEXT,
  work_hours INTEGER NOT NULL CHECK (work_hours > 0),
  hire_date TEXT NOT NULL,
  base_salary_piasters INTEGER NOT NULL CHECK (base_salary_piasters >= 0),
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE attendance (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  shift_date TEXT NOT NULL,
  checked_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_out_at TEXT,
  late_minutes INTEGER NOT NULL DEFAULT 0,
  telegram_status TEXT NOT NULL DEFAULT 'PENDING',
  UNIQUE(employee_id, shift_date)
);

CREATE TABLE employee_loans (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  amount_piasters INTEGER NOT NULL CHECK (amount_piasters > 0),
  reason TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_loan_repayments (
  id INTEGER PRIMARY KEY,
  loan_id INTEGER NOT NULL REFERENCES employee_loans(id),
  amount_piasters INTEGER NOT NULL CHECK (amount_piasters > 0),
  payroll_id INTEGER,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_deductions (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  amount_piasters INTEGER NOT NULL CHECK (amount_piasters > 0),
  reason TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payrolls (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  base_salary_piasters INTEGER NOT NULL,
  deductions_piasters INTEGER NOT NULL DEFAULT 0,
  loan_repayments_piasters INTEGER NOT NULL DEFAULT 0,
  net_salary_piasters INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PAID')),
  paid_at TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(employee_id, period_start, period_end)
);
