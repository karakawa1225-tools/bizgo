-- Optional: the app runs this DDL on first authenticated API access.
-- You can still run manually if you prefer (e.g. turso db shell <name> < this file).
CREATE TABLE IF NOT EXISTS remote_expense_snapshot (
  slot TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
