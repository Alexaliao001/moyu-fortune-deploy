import { describe, expect, it } from "vitest";
import { launchLinks } from "./launch-links.mjs";

describe("launch links", () => {
  it("creates one attributable canonical link per launch channel", () => {
    const links = launchLinks("launch_test");
    expect(links.map(link => link.source)).toEqual([
      "jike",
      "xiaohongshu",
      "v2ex",
      "twitter_zh",
    ]);
    for (const link of links) {
      const url = new URL(link.url);
      expect(url.origin).toBe("https://chillworks.ai");
      expect(url.searchParams.get("ref")).toBe("card");
      expect(url.searchParams.get("utm_source")).toBe(link.source);
      expect(url.searchParams.get("utm_medium")).toBe("organic_social");
      expect(url.searchParams.get("utm_campaign")).toBe("launch_test");
    }
  });
});
