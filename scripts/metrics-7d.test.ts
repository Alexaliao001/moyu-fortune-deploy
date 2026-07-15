import { describe, expect, it } from "vitest";
import {
  addDays,
  computeD7,
  computeMetrics,
  isExcludedDevice,
} from "./metrics-7d-lib.mjs";

describe("7-day validation metrics", () => {
  it("uses exact calendar D7, not D6 or D8", () => {
    const rows = [
      { deviceId: "device-0001", day: "2026-07-15" },
      { deviceId: "device-0001", day: "2026-07-22" },
      { deviceId: "device-0002", day: "2026-07-15" },
      { deviceId: "device-0002", day: "2026-07-21" },
      { deviceId: "device-0002", day: "2026-07-23" },
    ];
    expect(computeD7(rows, "2026-07-15", "2026-07-23")).toMatchObject({
      firstDrawDevices: 2,
      returnedD7: 1,
      d7Rate: 0.5,
    });
  });

  it("excludes smoke and test devices from every business metric", () => {
    expect(isExcludedDevice("smoke-iphone")).toBe(true);
    expect(isExcludedDevice("guest_test-channel")).toBe(true);

    const events = [
      {
        event: "draw",
        deviceId: "real-device-1",
        day: "2026-07-15",
        occurredAt: "2026-07-15T01:00:00Z",
        props: {},
      },
      {
        event: "draw",
        deviceId: "smoke-iphone",
        day: "2026-07-15",
        occurredAt: "2026-07-15T01:00:01Z",
        props: { ref: "card", utm_source: "fake" },
      },
      {
        event: "share_click",
        deviceId: "smoke-iphone",
        day: "2026-07-15",
        occurredAt: "2026-07-15T01:00:02Z",
        props: {},
      },
    ];
    const metrics = computeMetrics(
      events,
      [],
      "2026-07-15",
      "2026-07-15"
    );
    expect(metrics.daily.uniqueDrawDevices).toBe(1);
    expect(metrics.daily.sharingDevices).toBe(0);
    expect(metrics.attribution.cardReferredFirstDrawDevices).toBe(0);
  });

  it("treats Shanghai product days as calendar days", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("attributes each device to its first draw channel only", () => {
    const events = [
      {
        event: "draw",
        deviceId: "device-jike",
        day: "2026-07-15",
        occurredAt: "2026-07-15T01:00:00Z",
        props: { ref: "card", utm_source: "jike" },
      },
      {
        event: "draw",
        deviceId: "device-v2ex",
        day: "2026-07-15",
        occurredAt: "2026-07-15T01:01:00Z",
        props: { ref: "card", utm_source: "v2ex" },
      },
      {
        event: "draw",
        deviceId: "device-jike",
        day: "2026-07-15",
        occurredAt: "2026-07-15T01:02:00Z",
        props: { ref: "card", utm_source: "v2ex" },
      },
    ];

    const metrics = computeMetrics(
      events,
      [],
      "2026-07-15",
      "2026-07-15"
    );
    expect(metrics.attribution).toEqual({
      cardReferredFirstDrawDevices: 2,
      channelFirstDrawDevices: { jike: 1, v2ex: 1 },
    });
  });
});
