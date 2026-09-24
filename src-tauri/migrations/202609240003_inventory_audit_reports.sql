CREATE TABLE IF NOT EXISTS inventory_audit_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    month_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    warehouse_name TEXT NOT NULL,
    category_name TEXT NOT NULL,
    total_products_count INTEGER NOT NULL,
    matched_products_count INTEGER NOT NULL,
    diff_products_count INTEGER NOT NULL,
    total_shortage_units INTEGER NOT NULL,
    total_shortage_cost_piasters INTEGER NOT NULL,
    total_shortage_sell_piasters INTEGER NOT NULL,
    total_surplus_units INTEGER NOT NULL,
    total_surplus_cost_piasters INTEGER NOT NULL,
    total_surplus_sell_piasters INTEGER NOT NULL,
    balances_adjusted INTEGER NOT NULL DEFAULT 0,
    report_data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_audit_settings (
    id INTEGER PRIMARY KEY,
    show_system_qty_during_audit INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO inventory_audit_settings (id, show_system_qty_during_audit) VALUES (1, 0);
