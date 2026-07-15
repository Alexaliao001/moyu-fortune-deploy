import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { analyticsEvents } from "../../drizzle/schema";
import { getDb } from "../db";
import { normalizeDeviceId } from "./deviceUser";

const ALLOWED_EVENTS = new Set([
  "draw",
  "share_click",
  "card_saved",
  "membership_view",
]);
const ALLOWED_PROP_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "ref",
  "channel",
  "source",
  "via",
  "level",
  "percent",
  "streak",
  "restored",
]);
const MAX_BATCH = 50;
const MAX_CLIENT_AGE_MS = 31 * 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function normalizeEventId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const eventId = value.trim();
  return /^[a-zA-Z0-9._:-]{8,128}$/.test(eventId) ? eventId : null;
}

export function fallbackAnalyticsEventId(input: {
  event: string;
  deviceId: string;
  t: unknown;
  props: Record<string, string | number | boolean> | null;
}): string {
  const sortedProps = input.props
    ? Object.fromEntries(
        Object.entries(input.props).sort(([left], [right]) =>
          left.localeCompare(right)
        )
      )
    : null;
  const digest = createHash("sha256")
    .update(
      JSON.stringify([input.deviceId, input.event, input.t ?? "", sortedProps])
    )
    .digest("hex");
  return `legacy-${digest}`;
}

function sanitizeProps(
  value: unknown
): Record<string, string | number | boolean> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!ALLOWED_PROP_KEYS.has(key)) continue;
    if (typeof raw === "string") {
      const text = raw.trim().slice(0, 80);
      if (text) result[key] = text;
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      result[key] = raw;
    } else if (typeof raw === "boolean") {
      result[key] = raw;
    }
  }
  return Object.keys(result).length ? result : null;
}

export function validatedClientTime(value: unknown, now = Date.now()): Date {
  const timestamp =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Date.parse(value)
        : Number.NaN;
  if (
    !Number.isFinite(timestamp) ||
    timestamp < now - MAX_CLIENT_AGE_MS ||
    timestamp > now + MAX_CLOCK_SKEW_MS
  ) {
    return new Date(now);
  }
  return new Date(timestamp);
}

/**
 * Startup safety for legacy deployments. The canonical definition and
 * migration live in drizzle/schema.ts and drizzle/postgres/.
 */
export async function ensureAnalyticsSchema(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGSERIAL PRIMARY KEY,
      event_id VARCHAR(128) NOT NULL,
      event VARCHAR(32) NOT NULL,
      device_id VARCHAR(128) NOT NULL,
      props JSONB,
      client_occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    ALTER TABLE analytics_events
    ADD COLUMN IF NOT EXISTS event_id VARCHAR(128)
  `);
  await db.execute(sql`
    UPDATE analytics_events
    SET event_id = 'legacy-' || id::text
    WHERE event_id IS NULL
  `);
  await db.execute(sql`
    ALTER TABLE analytics_events
    ALTER COLUMN event_id SET NOT NULL
  `);
  await db.execute(sql`
    ALTER TABLE analytics_events
    ADD COLUMN IF NOT EXISTS client_occurred_at TIMESTAMPTZ
  `);
  await db.execute(sql`
    UPDATE analytics_events
    SET client_occurred_at = created_at
    WHERE client_occurred_at IS NULL
  `);
  await db.execute(sql`
    ALTER TABLE analytics_events
    ALTER COLUMN client_occurred_at SET DEFAULT NOW()
  `);
  await db.execute(sql`
    ALTER TABLE analytics_events
    ALTER COLUMN client_occurred_at SET NOT NULL
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_event_id_uidx
    ON analytics_events (event_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS analytics_events_client_occurred_at_idx
    ON analytics_events (client_occurred_at)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS analytics_events_event_occurred_idx
    ON analytics_events (event, client_occurred_at)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS analytics_events_device_occurred_idx
    ON analytics_events (device_id, client_occurred_at)
  `);
}

/** Mount POST /api/events — first-party aggregate analytics (P0-6). */
export function registerAnalyticsApi(app: Express) {
  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ ok: false, error: "no_db" });

      const body = (req.body || {}) as { events?: unknown[] };
      const rawEvents = Array.isArray(body.events)
        ? body.events.slice(0, MAX_BATCH)
        : [];
      const values = rawEvents.flatMap(event => {
        if (!event || typeof event !== "object") return [];
        const item = event as Record<string, unknown>;
        const eventName = typeof item.event === "string" ? item.event : "";
        const deviceId = normalizeDeviceId(item.deviceId);
        if (!ALLOWED_EVENTS.has(eventName) || !deviceId) return [];
        const props = sanitizeProps(item.props);
        const eventId =
          normalizeEventId(item.eventId) ||
          fallbackAnalyticsEventId({
            event: eventName,
            deviceId,
            t: item.t,
            props,
          });
        return [
          {
            eventId,
            event: eventName,
            deviceId,
            props,
            clientOccurredAt: validatedClientTime(item.t),
          },
        ];
      });

      const inserted = values.length
        ? await db
            .insert(analyticsEvents)
            .values(values)
            .onConflictDoNothing({ target: analyticsEvents.eventId })
            .returning({ eventId: analyticsEvents.eventId })
        : [];
      return res.json({
        ok: true,
        accepted: inserted.length,
        duplicates: values.length - inserted.length,
      });
    } catch (error) {
      console.warn("[analytics]", error);
      return res.status(500).json({ ok: false });
    }
  });
}
