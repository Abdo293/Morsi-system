CREATE TABLE IF NOT EXISTS online_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number INTEGER NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  shipping_fee_piasters INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee_piasters >= 0),
  subtotal_piasters INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_piasters >= 0),
  discount_piasters INTEGER NOT NULL DEFAULT 0 CHECK (discount_piasters >= 0),
  total_piasters INTEGER NOT NULL DEFAULT 0 CHECK (total_piasters >= 0),
  payment_method TEXT NOT NULL DEFAULT 'CASH_ON_DELIVERY',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
  invoice_id INTEGER REFERENCES invoices(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  employee_id INTEGER REFERENCES employees(id),
  confirmed_by INTEGER REFERENCES users(id),
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS online_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER REFERENCES product_variants(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  name_snapshot TEXT NOT NULL,
  buy_price_piasters INTEGER NOT NULL DEFAULT 0 CHECK (buy_price_piasters >= 0),
  sell_price_piasters INTEGER NOT NULL DEFAULT 0 CHECK (sell_price_piasters >= 0),
  discount_each_piasters INTEGER NOT NULL DEFAULT 0 CHECK (discount_each_piasters >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_piasters INTEGER NOT NULL DEFAULT 0 CHECK (line_total_piasters >= 0)
);

CREATE TABLE IF NOT EXISTS online_order_sequence (
  id INTEGER PRIMARY KEY AUTOINCREMENT
);

CREATE INDEX IF NOT EXISTS idx_online_orders_status ON online_orders(status);
CREATE INDEX IF NOT EXISTS idx_online_orders_created_at ON online_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_online_order_items_order_id ON online_order_items(order_id);
