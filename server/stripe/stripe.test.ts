import { describe, it, expect } from "vitest";
import { PRODUCTS } from "./products";

describe("Stripe Products Configuration", () => {
  it("has exactly one lifetime payment product", () => {
    expect(Object.keys(PRODUCTS)).toEqual(["LIFETIME_MEMBERSHIP"]);
    expect(PRODUCTS.LIFETIME_MEMBERSHIP).toMatchObject({
      priceInCents: 4990,
      currency: "cny",
      mode: "payment",
      durationDays: -1,
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
