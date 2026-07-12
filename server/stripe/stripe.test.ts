import { describe, it, expect, vi, beforeEach } from "vitest";
import { PRODUCTS } from "./products";

describe("Stripe Products Configuration", () => {
  it("should have all required product fields", () => {
    Object.entries(PRODUCTS).forEach(([key, product]) => {
      expect(product.name).toBeDefined();
      expect(product.description).toBeDefined();
      expect(product.priceInCents).toBeGreaterThan(0);
      expect(product.currency).toBe("cny");
      expect(product.mode).toBe("payment"); // All products now use payment mode for Alipay/WeChat support
    });
  });

  it("should have correct pricing for detailed report", () => {
    expect(PRODUCTS.DETAILED_REPORT.priceInCents).toBe(990); // ¥9.9
    expect(PRODUCTS.DETAILED_REPORT.mode).toBe("payment");
  });

  it("should have correct pricing for monthly membership", () => {
    expect(PRODUCTS.MONTHLY_MEMBERSHIP.priceInCents).toBe(1990); // ¥19.9
    expect(PRODUCTS.MONTHLY_MEMBERSHIP.mode).toBe("payment");
    expect((PRODUCTS.MONTHLY_MEMBERSHIP as any).durationDays).toBe(30);
  });

  it("should have correct pricing for quarterly membership", () => {
    expect(PRODUCTS.QUARTERLY_MEMBERSHIP.priceInCents).toBe(4990); // ¥49.9
    expect(PRODUCTS.QUARTERLY_MEMBERSHIP.mode).toBe("payment");
    expect((PRODUCTS.QUARTERLY_MEMBERSHIP as any).durationDays).toBe(90);
  });

  it("should have correct pricing for lifetime membership", () => {
    expect(PRODUCTS.LIFETIME_MEMBERSHIP.priceInCents).toBe(4990); // ¥49.9
    expect(PRODUCTS.LIFETIME_MEMBERSHIP.mode).toBe("payment");
    expect((PRODUCTS.LIFETIME_MEMBERSHIP as any).durationDays).toBe(-1); // -1 means forever
  });

  it("should NOT have annual membership (removed due to poor value)", () => {
    expect((PRODUCTS as any).ANNUAL_MEMBERSHIP).toBeUndefined();
  });

  it("should have all membership products with durationDays defined", () => {
    const membershipProducts = [
      'MONTHLY_MEMBERSHIP',
      'QUARTERLY_MEMBERSHIP', 
      'LIFETIME_MEMBERSHIP'
    ] as const;
    
    membershipProducts.forEach((key) => {
      const product = PRODUCTS[key] as any;
      expect(product.durationDays).toBeDefined();
      expect(typeof product.durationDays).toBe('number');
    });
  });
});

describe("Stripe Environment Variables", () => {
  it("should have stripe secret key in env config", async () => {
    const { ENV } = await import("../_core/env");
    expect(ENV).toHaveProperty("stripeSecretKey");
    expect(ENV).toHaveProperty("stripeWebhookSecret");
  });
});
