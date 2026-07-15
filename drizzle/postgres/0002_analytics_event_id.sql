BEGIN;

ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS event_id VARCHAR(128);

UPDATE analytics_events
SET event_id = 'legacy-' || id::text
WHERE event_id IS NULL;

ALTER TABLE analytics_events
  ALTER COLUMN event_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_event_id_uidx
  ON analytics_events (event_id);

COMMIT;
