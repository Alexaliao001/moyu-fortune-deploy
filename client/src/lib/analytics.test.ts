import { describe, expect, it } from "vitest";
import {
  buildShareUrl,
  ensureAnalyticsEventIds,
  parseAttribution,
} from "./analytics";

describe("analytics attribution", () => {
  it("keeps only whitelisted campaign fields", () => {
    expect(
      parseAttribution(
        "https://chillworks.ai/?utm_source=jike&utm_medium=social&utm_campaign=launch&ref=card&birthday=1990-01-01"
      )
    ).toEqual({
      utm_source: "jike",
      utm_medium: "social",
      utm_campaign: "launch",
      ref: "card",
    });
  });

  it("rejects arbitrary ref values and unsafe attribution payloads", () => {
    expect(
      parseAttribution(
        "https://chillworks.ai/?ref=invite&utm_source=%3Cscript%3E&utm_campaign=launch%20day"
      )
    ).toEqual({});
  });

  it("uses an external hostname as a referral source", () => {
    expect(
      parseAttribution(
        "https://chillworks.ai/",
        "https://www.v2ex.com/t/123"
      )
    ).toEqual({
      utm_source: "www.v2ex.com",
      utm_medium: "referral",
    });
  });

  it("builds a canonical, attributable card link", () => {
    const url = new URL(buildShareUrl("xiaohongshu"));
    expect(url.origin).toBe("https://chillworks.ai");
    expect(url.searchParams.get("ref")).toBe("card");
    expect(url.searchParams.get("utm_source")).toBe("xiaohongshu");
    expect(url.searchParams.get("utm_medium")).toBe("share");
    expect(url.searchParams.get("utm_campaign")).toBe("organic_card");
  });

  it("keeps one stable id when a queued event is retried", () => {
    const queued = {
      event: "share_click" as const,
      deviceId: "device-1",
      t: 1784110000000,
      props: { channel: "wechat" },
    };
    const first = ensureAnalyticsEventIds([queued]);
    const retry = ensureAnalyticsEventIds(first);

    expect(first[0]?.eventId).toMatch(/^legacy-/);
    expect(retry[0]?.eventId).toBe(first[0]?.eventId);
  });
});
