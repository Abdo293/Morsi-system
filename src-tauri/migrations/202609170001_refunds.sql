PRAGMA foreign_keys = ON;

CREATE TABLE refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  refund_number INTEGER NOT NULL UNIQUE,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  invoice_number INTEGER NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  performed_by INTEGER NOT NULL REFERENCES users(id),
  total_refund_piasters INTEGER NOT NULL CHECK (total_refund_piasters >= 0),
  refund_method TEXT NOT NULL CHECK (refund_method IN ('CASH', 'INSTAPAY', 'WALLET', 'DEBT_DEDUCTION')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refund_sequence (
  id INTEGER PRIMARY KEY AUTOINCREMENT
);

CREATE TABLE refund_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  refund_id INTEGER NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  invoice_item_id INTEGER NOT NULL REFERENCES invoice_items(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER REFERENCES product_variants(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  name_snapshot TEXT NOT NULL,
  unit_price_piasters INTEGER NOT NULL CHECK (unit_price_piasters >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_piasters INTEGER NOT NULL CHECK (line_total_piasters >= 0)
);

CREATE INDEX refunds_created_at_idx ON refunds(created_at);
CREATE INDEX refunds_invoice_idx ON refunds(invoice_id);
CREATE INDEX refunds_seller_idx ON refunds(seller_id);
