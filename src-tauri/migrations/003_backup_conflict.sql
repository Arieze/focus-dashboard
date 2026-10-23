DROP TRIGGER IF EXISTS daily_backup;
CREATE TRIGGER daily_backup BEFORE UPDATE ON app_state
BEGIN
 INSERT INTO state_backups(day,payload)
 SELECT date('now'), OLD.payload
 WHERE NOT EXISTS (SELECT 1 FROM state_backups WHERE day=date('now'));
 DELETE FROM state_backups WHERE day < date('now','-30 days');
END;
