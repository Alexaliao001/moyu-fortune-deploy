import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

// Mock the notification
vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { feedbackRouter } from "./feedback";

describe("feedback router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submit", () => {
    it("should submit feedback successfully for anonymous user", async () => {
      const caller = feedbackRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.submit({
        type: "suggestion",
        content: "This is a test feedback",
        contact: "test@example.com",
        userAgent: "Mozilla/5.0",
      });

      expect(result).toEqual({ success: true });
    });

    it("should submit feedback successfully for logged-in user", async () => {
      const caller = feedbackRouter.createCaller({
        user: { id: 1, openId: "test-user", name: "Test User" } as any,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.submit({
        type: "bug",
        content: "Found a bug in the app",
      });

      expect(result).toEqual({ success: true });
    });

    it("should accept different feedback types", async () => {
      const types = ["bug", "feature", "suggestion", "other"] as const;

      for (const type of types) {
        const caller = feedbackRouter.createCaller({
          user: null,
          req: {} as any,
          res: {} as any,
        });

        const result = await caller.submit({
          type,
          content: `Test feedback for ${type}`,
        });
        expect(result).toEqual({ success: true });
      }
    });

    it("should reject empty content", async () => {
      const caller = feedbackRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.submit({
          type: "suggestion",
          content: "",
        })
      ).rejects.toThrow();
    });

    it("should reject content exceeding max length", async () => {
      const caller = feedbackRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const longContent = "a".repeat(1001);

      await expect(
        caller.submit({
          type: "suggestion",
          content: longContent,
        })
      ).rejects.toThrow();
    });
  });
});
