import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("Leaderboard Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export leaderboardRouter", async () => {
    const { leaderboardRouter } = await import("./leaderboard");
    expect(leaderboardRouter).toBeDefined();
  });

  it("should have streakRanking procedure", async () => {
    const { leaderboardRouter } = await import("./leaderboard");
    expect(leaderboardRouter._def.procedures).toHaveProperty("streakRanking");
  });

  it("should have weeklyBestRanking procedure", async () => {
    const { leaderboardRouter } = await import("./leaderboard");
    expect(leaderboardRouter._def.procedures).toHaveProperty("weeklyBestRanking");
  });

  it("should have myRanking procedure", async () => {
    const { leaderboardRouter } = await import("./leaderboard");
    expect(leaderboardRouter._def.procedures).toHaveProperty("myRanking");
  });
});

describe("Daily Notification Cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export sendDailyNotifications function", async () => {
    const { sendDailyNotifications } = await import("../cron/dailyNotification");
    expect(sendDailyNotifications).toBeDefined();
    expect(typeof sendDailyNotifications).toBe("function");
  });

  it("should export startDailyNotificationCron function", async () => {
    const { startDailyNotificationCron } = await import("../cron/dailyNotification");
    expect(startDailyNotificationCron).toBeDefined();
    expect(typeof startDailyNotificationCron).toBe("function");
  });

  it("should handle database unavailability gracefully", async () => {
    const { getDb } = await import("../db");
    vi.mocked(getDb).mockResolvedValueOnce(null);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { sendDailyNotifications } = await import("../cron/dailyNotification");
    // Should not throw (error is caught internally), but should log error
    await sendDailyNotifications();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DailyNotification]'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
