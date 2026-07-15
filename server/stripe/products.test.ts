import { describe, it, expect } from 'vitest';
import { PRODUCTS, ProductKey } from './products';

describe('Stripe Products Configuration', () => {
  it('should have all required products defined', () => {
    const requiredProducts: ProductKey[] = [
      'DETAILED_REPORT',
      'MONTHLY_MEMBERSHIP',
      'QUARTERLY_MEMBERSHIP',
      'LIFETIME_MEMBERSHIP',
    ];

    requiredProducts.forEach(key => {
      expect(PRODUCTS[key]).toBeDefined();
    });
  });

  it('should NOT have annual membership (removed due to poor value vs lifetime)', () => {
    expect((PRODUCTS as any).ANNUAL_MEMBERSHIP).toBeUndefined();
  });

  it('should have all products use payment mode for Alipay/WeChat support', () => {
    // All products should use "payment" mode to support Alipay/WeChat
    Object.entries(PRODUCTS).forEach(([key, product]) => {
      expect(product.mode).toBe('payment');
    });
  });

  it('should have valid price configuration for all products', () => {
    Object.entries(PRODUCTS).forEach(([key, product]) => {
      expect(product.priceInCents).toBeGreaterThan(0);
      expect(product.currency).toBe('cny');
      expect(product.name).toBeTruthy();
      expect(product.description).toBeTruthy();
    });
  });

  it('should have correct duration for membership products', () => {
    // Monthly: 30 days
    expect((PRODUCTS.MONTHLY_MEMBERSHIP as any).durationDays).toBe(30);
    
    // Quarterly: 90 days
    expect((PRODUCTS.QUARTERLY_MEMBERSHIP as any).durationDays).toBe(90);
    
    // Lifetime: -1 (forever)
    expect((PRODUCTS.LIFETIME_MEMBERSHIP as any).durationDays).toBe(-1);
  });

  it('should have reasonable pricing', () => {
    // Monthly should be cheapest per month
    expect(PRODUCTS.MONTHLY_MEMBERSHIP.priceInCents).toBe(1990); // ¥19.9
    
    // Quarterly should offer some discount
    expect(PRODUCTS.QUARTERLY_MEMBERSHIP.priceInCents).toBe(4990); // ¥49.9
    
    // Lifetime should be best value (same price as quarterly but forever)
    expect(PRODUCTS.LIFETIME_MEMBERSHIP.priceInCents).toBe(4990); // ¥49.9
  });
});
