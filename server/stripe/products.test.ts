import { describe, it, expect } from 'vitest';
import { PRODUCTS } from './products';

describe('Stripe Products Configuration', () => {
  it('exposes only the one-time lifetime SKU', () => {
    expect(Object.keys(PRODUCTS)).toEqual(['LIFETIME_MEMBERSHIP']);
  });

  it('uses one-time CNY payment below the Alipay limit', () => {
    const product = PRODUCTS.LIFETIME_MEMBERSHIP;
    expect(product.mode).toBe('payment');
    expect(product.currency).toBe('cny');
    expect(product.priceInCents).toBe(4990);
    expect(product.priceInCents).toBeLessThan(50_000);
  });

  it('does not claim AI or recurring membership benefits', () => {
    const product = PRODUCTS.LIFETIME_MEMBERSHIP;
    expect(product.durationDays).toBe(-1);
    expect(product.description).not.toMatch(/AI|无限抽|月卡|季卡/);
    expect(product.description).toContain("不含订阅");
    expect(product.name).toBeTruthy();
  });
});
