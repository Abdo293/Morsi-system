CREATE TABLE IF NOT EXISTS backup_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    auto_backup_enabled INTEGER NOT NULL DEFAULT 1,
    auto_backup_time TEXT NOT NULL DEFAULT '23:30',
    auto_backup_retention INTEGER NOT NULL DEFAULT 30,
    last_auto_backup_date TEXT
);

INSERT OR IGNORE INTO backup_settings (id, auto_backup_enabled, auto_backup_time, auto_backup_retention)
VALUES (1, 1, '23:30', 30);
