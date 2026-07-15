BEGIN;

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event VARCHAR(32) NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  props JSONB,
  client_occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS client_occurred_at TIMESTAMPTZ;

UPDATE analytics_events
SET client_occurred_at = created_at
WHERE client_occurred_at IS NULL;

ALTER TABLE analytics_events
  ALTER COLUMN client_occurred_at SET DEFAULT NOW(),
  ALTER COLUMN client_occurred_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_events_client_occurred_at_idx
  ON analytics_events (client_occurred_at);

CREATE INDEX IF NOT EXISTS analytics_events_event_occurred_idx
  ON analytics_events (event, client_occurred_at);

CREATE INDEX IF NOT EXISTS analytics_events_device_occurred_idx
  ON analytics_events (device_id, client_occurred_at);

COMMIT;
