ALTER TABLE telegram_settings ADD COLUMN auto_report_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE telegram_settings ADD COLUMN auto_report_time TEXT NOT NULL DEFAULT '23:00';
ALTER TABLE telegram_settings ADD COLUMN auto_report_last_sent_date TEXT;
