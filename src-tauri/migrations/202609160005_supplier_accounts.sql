PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS supplier_transactions (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  employee_id INTEGER NOT NULL REFERENCES users(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('RECEIPT', 'PAYMENT')),
  goods_amount_piasters INTEGER NOT NULL DEFAULT 0 CHECK (goods_amount_piasters >= 0),
  paid_amount_piasters INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount_piasters >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CREDIT', 'CASH', 'INSTAPAY', 'WALLET')),
  previous_balance_piasters INTEGER NOT NULL CHECK (previous_balance_piasters >= 0),
  new_balance_piasters INTEGER NOT NULL CHECK (new_balance_piasters >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS supplier_trans_supplier_idx ON supplier_transactions(supplier_id, created_at);
