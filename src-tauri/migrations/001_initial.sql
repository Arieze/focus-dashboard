CREATE TABLE IF NOT EXISTS app_state (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 payload TEXT NOT NULL CHECK (json_valid(payload)),
 updated_at TEXT NOT NULL
);
-- A single validated aggregate makes linked tasks, recurrence and timer completion atomic.
CREATE TABLE IF NOT EXISTS sync_metadata (
 provider TEXT PRIMARY KEY,
 cursor TEXT,
 last_success TEXT
);
