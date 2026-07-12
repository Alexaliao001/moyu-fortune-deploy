import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                userId: 1,
                type: "feedback_reply",
                title: "您的反馈已收到回复",
                content: "感谢您的反馈！",
                relatedId: 1,
                isRead: false,
                createdAt: new Date(),
              },
            ]),
          }),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

import { notificationRouter } from "./notification";

describe("notification router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return notifications for logged-in user", async () => {
      const caller = notificationRouter.createCaller({
        user: { id: 1, openId: "test-user", name: "Test User", role: "user" } as any,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.list({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter unread notifications when requested", async () => {
      const caller = notificationRouter.createCaller({
        user: { id: 1, openId: "test-user", name: "Test User", role: "user" } as any,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.list({ limit: 10, unreadOnly: true });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("unreadCount", () => {
    it("should return unread count for logged-in user", async () => {
      // Override mock for this specific test
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        }),
      };
      vi.mocked(await import("../db")).getDb.mockResolvedValueOnce(mockDb as any);

      const caller = notificationRouter.createCaller({
        user: { id: 1, openId: "test-user", name: "Test User", role: "user" } as any,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.unreadCount();
      expect(result).toHaveProperty("count");
      expect(typeof result.count).toBe("number");
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read", async () => {
      const caller = notificationRouter.createCaller({
        user: { id: 1, openId: "test-user", name: "Test User", role: "user" } as any,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.markAsRead({ id: 1 });
      expect(result).toEqual({ success: true });
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all notifications as read", async () => {
      const caller = notificationRouter.createCaller({
        user: { id: 1, openId: "test-user", name: "Test User", role: "user" } as any,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.markAllAsRead();
      expect(result).toEqual({ success: true });
    });
  });
});
