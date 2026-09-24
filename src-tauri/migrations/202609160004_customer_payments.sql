CREATE TABLE customer_payments (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  amount_piasters INTEGER NOT NULL CHECK (amount_piasters > 0),
  method TEXT NOT NULL CHECK (method IN ('CASH', 'INSTAPAY', 'WALLET')),
  performed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX invoices_customer_idx ON invoices(customer_id, created_at);
CREATE INDEX customer_payments_customer_idx ON customer_payments(customer_id, created_at);
