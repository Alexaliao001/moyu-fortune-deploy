/**
 * First-party aggregate analytics (AGENTS.md P0-6).
 * Only event names, deviceId and a small attribution allowlist are persisted.
 */
import { getUserId } from "./localStorage";

export type AnalyticsEvent =
  | "draw"
  | "share_click"
  | "card_saved"
  | "membership_view";

export type AnalyticsProps = Record<string, string | number | boolean>;

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  ref?: "card";
}

export interface QueuedEvent {
  eventId?: string;
  event: AnalyticsEvent;
  props?: AnalyticsProps;
  t: number;
  deviceId: string;
}
type QueuedEventWithId = QueuedEvent & { eventId: string };

const QUEUE_KEY = "moyu_analytics_queue";
const ATTRIBUTION_KEY = "moyu_attribution";
const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
] as const;
let fallbackEventCounter = 0;

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function legacyEventId(event: QueuedEvent): string {
  return `legacy-${hashText(
    JSON.stringify([
      event.deviceId,
      event.event,
      event.t,
      event.props || {},
    ])
  )}`;
}

function createEventId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  if (typeof cryptoApi?.getRandomValues === "function") {
    const words = cryptoApi.getRandomValues(new Uint32Array(4));
    return Array.from(words, word => word.toString(36)).join("-");
  }
  fallbackEventCounter += 1;
  return `fallback-${Date.now().toString(36)}-${fallbackEventCounter.toString(36)}`;
}

export function ensureAnalyticsEventIds(
  events: QueuedEvent[]
): QueuedEventWithId[] {
  return events.map(event => ({
    ...event,
    eventId: event.eventId || legacyEventId(event),
  }));
}

function apiBase(): string {
  const base = (import.meta.env.VITE_MOYU_API_BASE as string | undefined)?.trim();
  if (base && base !== "undefined") return base.replace(/\/$/, "");
  return "";
}

function plausibleDomain(): string | undefined {
  const d = (import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined)?.trim();
  return d && d !== "undefined" ? d : undefined;
}

function safeAttributionValue(value: string | null): string | undefined {
  const normalized = value?.trim().slice(0, 80);
  if (
    !normalized ||
    !/^[a-zA-Z0-9._~\-\u3400-\u9fff]+$/.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

/** Parse only the channel fields needed for aggregate attribution reports. */
export function parseAttribution(href: string, referrer = ""): Attribution {
  const result: Attribution = {};
  try {
    const url = new URL(href);
    for (const key of ATTRIBUTION_PARAMS) {
      const value = safeAttributionValue(url.searchParams.get(key));
      if (value) result[key] = value;
    }
    if (url.searchParams.get("ref") === "card") result.ref = "card";

    if (!result.utm_source && referrer) {
      const referringUrl = new URL(referrer);
      if (referringUrl.hostname && referringUrl.hostname !== url.hostname) {
        result.utm_source = referringUrl.hostname.slice(0, 80);
        result.utm_medium = "referral";
      }
    }
  } catch {
    // Malformed navigation data is ignored; no full URL is stored.
  }
  return result;
}

function readAttribution(): Attribution {
  try {
    return JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || "{}") as Attribution;
  } catch {
    return {};
  }
}

export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const current = parseAttribution(window.location.href, document.referrer);
  const next = { ...readAttribution(), ...current };
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    // Private browsing can disable storage; attribution remains best-effort.
  }
  return next;
}

export function buildShareUrl(
  channel: string,
  origin = "https://chillworks.ai"
): string {
  const url = new URL("/", origin);
  url.searchParams.set("ref", "card");
  url.searchParams.set("utm_source", safeAttributionValue(channel) || "card");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "organic_card");
  return url.toString();
}

function enqueue(event: AnalyticsEvent, props?: AnalyticsProps) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const q: QueuedEvent[] = raw ? JSON.parse(raw) : [];
    q.push({
      eventId: createEventId(),
      event,
      props,
      t: Date.now(),
      deviceId: getUserId(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
  } catch {
    /* ignore */
  }
}

export async function flushAnalyticsQueue() {
  const base = apiBase();
  if (!base || typeof navigator === "undefined" || !navigator.onLine) return;
  let q: QueuedEvent[] = [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    q = raw ? JSON.parse(raw) : [];
  } catch {
    return;
  }
  if (!q.length) return;
  const prepared = ensureAnalyticsEventIds(q);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(prepared));
  } catch {
    /* deterministic legacy IDs still make this retry-safe */
  }
  try {
    const res = await fetch(`${base}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: prepared }),
      mode: "cors",
      keepalive: true,
    });
    if (res.ok) localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* keep queue */
  }
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  const mergedProps =
    typeof window === "undefined"
      ? props
      : { ...captureAttribution(), ...(props || {}) };
  enqueue(event, mergedProps);

  const domain = plausibleDomain();
  if (domain && typeof window !== "undefined") {
    try {
      const w = window as unknown as {
        plausible?: (n: string, o?: { props?: Record<string, unknown> }) => void;
      };
      w.plausible?.(event, mergedProps ? { props: mergedProps } : undefined);
    } catch {
      /* ignore */
    }
  }

  void flushAnalyticsQueue();
}

/** Restore attribution/queue and inject Plausible only when configured. */
export function initAnalytics(): void {
  if (typeof document === "undefined") return;
  captureAttribution();
  void flushAnalyticsQueue();
  window.addEventListener("online", () => void flushAnalyticsQueue());

  const domain = plausibleDomain();
  if (!domain || document.getElementById("plausible-script")) return;
  const script = document.createElement("script");
  script.id = "plausible-script";
  script.defer = true;
  script.dataset.domain = domain;
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
}
