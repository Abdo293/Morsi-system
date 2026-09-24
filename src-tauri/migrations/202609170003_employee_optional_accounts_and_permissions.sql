-- Add permissions to users
ALTER TABLE users ADD COLUMN permissions TEXT;

-- Make user_id nullable in employees table
DROP TABLE IF EXISTS employees_dg_tmp;

CREATE TABLE employees_dg_tmp (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
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

INSERT INTO employees_dg_tmp(id, user_id, name, phone, job_title, address, work_hours, hire_date, base_salary_piasters, shift_start, shift_end, is_active)
  SELECT id, user_id, name, phone, job_title, address, work_hours, hire_date, base_salary_piasters, shift_start, shift_end, is_active FROM employees;

DROP TABLE employees;

ALTER TABLE employees_dg_tmp RENAME TO employees;

-- Add employee_id to invoices and refunds so any employee can be assigned as the salesperson
ALTER TABLE invoices ADD COLUMN employee_id INTEGER REFERENCES employees(id);
ALTER TABLE refunds ADD COLUMN employee_id INTEGER REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS invoices_employee_idx ON invoices(employee_id);
CREATE INDEX IF NOT EXISTS refunds_employee_idx ON refunds(employee_id);
