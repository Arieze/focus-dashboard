CREATE TABLE IF NOT EXISTS state_backups (
 day TEXT PRIMARY KEY,
 payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE TRIGGER IF NOT EXISTS daily_backup BEFORE UPDATE ON app_state
BEGIN
 INSERT OR IGNORE INTO state_backups(day,payload) VALUES(date('now'),OLD.payload);
 DELETE FROM state_backups WHERE day < date('now','-30 days');
END;
