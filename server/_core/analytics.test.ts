import { describe, expect, it } from "vitest";
import { fallbackAnalyticsEventId, validatedClientTime } from "./analytics";

describe("validatedClientTime", () => {
  const now = Date.UTC(2026, 6, 15, 9, 0, 0);

  it("keeps a plausible client timestamp", () => {
    const client = now - 60_000;
    expect(validatedClientTime(client, now).getTime()).toBe(client);
  });

  it("replaces stale or future timestamps with server time", () => {
    expect(
      validatedClientTime(now - 32 * 24 * 60 * 60 * 1000, now).getTime()
    ).toBe(now);
    expect(validatedClientTime(now + 6 * 60 * 1000, now).getTime()).toBe(now);
  });
});

describe("analytics event idempotency", () => {
  it("derives the same fallback id for a retried legacy event", () => {
    const input = {
      event: "share_click",
      deviceId: "device-1",
      t: 1784110000000,
      props: { channel: "wechat", source: "result" },
    };

    expect(fallbackAnalyticsEventId(input)).toBe(
      fallbackAnalyticsEventId({
        ...input,
        props: { source: "result", channel: "wechat" },
      })
    );
    expect(fallbackAnalyticsEventId(input)).not.toBe(
      fallbackAnalyticsEventId({ ...input, t: input.t + 1 })
    );
  });
});
