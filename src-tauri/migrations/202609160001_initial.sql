PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SELLER')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE warehouses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  barcode TEXT NOT NULL UNIQUE,
  buy_price_piasters INTEGER NOT NULL CHECK (buy_price_piasters >= 0),
  sell_price_piasters INTEGER NOT NULL CHECK (sell_price_piasters >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  barcode TEXT UNIQUE,
  UNIQUE (product_id, color, size),
  UNIQUE (id, product_id)
);

CREATE TABLE inventory_balances (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  FOREIGN KEY (variant_id, product_id) REFERENCES product_variants(id, product_id)
);
CREATE UNIQUE INDEX inventory_variant_balance_unique
  ON inventory_balances(product_id, variant_id, warehouse_id)
  WHERE variant_id IS NOT NULL;
CREATE UNIQUE INDEX inventory_plain_balance_unique
  ON inventory_balances(product_id, warehouse_id)
  WHERE variant_id IS NULL;

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  invoice_number INTEGER NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  subtotal_piasters INTEGER NOT NULL CHECK (subtotal_piasters >= 0),
  discount_piasters INTEGER NOT NULL CHECK (discount_piasters >= 0),
  total_piasters INTEGER NOT NULL CHECK (total_piasters >= 0),
  paid_cash_piasters INTEGER NOT NULL DEFAULT 0 CHECK (paid_cash_piasters >= 0),
  paid_instapay_piasters INTEGER NOT NULL DEFAULT 0 CHECK (paid_instapay_piasters >= 0),
  paid_wallet_piasters INTEGER NOT NULL DEFAULT 0 CHECK (paid_wallet_piasters >= 0),
  remaining_piasters INTEGER NOT NULL DEFAULT 0 CHECK (remaining_piasters >= 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_sequence (
  id INTEGER PRIMARY KEY AUTOINCREMENT
);

CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER REFERENCES product_variants(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  name_snapshot TEXT NOT NULL,
  buy_price_piasters INTEGER NOT NULL CHECK (buy_price_piasters >= 0),
  sell_price_piasters INTEGER NOT NULL CHECK (sell_price_piasters >= 0),
  discount_each_piasters INTEGER NOT NULL DEFAULT 0 CHECK (discount_each_piasters >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_piasters INTEGER NOT NULL CHECK (line_total_piasters >= 0)
);

CREATE TABLE inventory_movements (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER REFERENCES product_variants(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  change_quantity INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  reference_id INTEGER,
  performed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX invoice_created_at_idx ON invoices(created_at);
CREATE INDEX invoice_seller_idx ON invoices(seller_id);
CREATE INDEX movements_product_idx ON inventory_movements(product_id, created_at);
