import { describe, expect, it } from 'vitest';
import { validateCheckout } from './checkoutValidation';
import type { OrderItem } from '../models/pos';
const items: OrderItem[] = [{ productId: 'p1', name: 'Dish', price: 100, quantity: 1 }];
describe('checkout validation', () => {
  it('accepts verified cash and UPI details', () => {
    expect(() => validateCheckout(items, 'CASH', { method: 'CASH', cashTendered: 105 }, 105)).not.toThrow();
    expect(() => validateCheckout(items, 'UPI', { method: 'UPI', upiReference: 'UTR123' }, 105)).not.toThrow();
  });
  it('rejects missing UPI reference and insufficient cash', () => {
    expect(() => validateCheckout(items, 'UPI', { method: 'UPI' }, 105)).toThrow();
    expect(() => validateCheckout(items, 'CASH', { method: 'CASH', cashTendered: 100 }, 105)).toThrow();
  });
  it('rejects invalid cart items', () => {
    expect(() => validateCheckout([{ ...items[0], quantity: -1 }], 'CASH', { method: 'CASH', cashTendered: 105 }, 105)).toThrow();
    expect(() => validateCheckout([], 'CASH', { method: 'CASH', cashTendered: 105 }, 105)).toThrow();
  });
  it('requires split amounts to match the bill', () => {
    expect(() => validateCheckout(items, 'SPLIT', { method: 'SPLIT', splitBreakdown: { cash: 50, upi: 55 } }, 105)).not.toThrow();
    expect(() => validateCheckout(items, 'SPLIT', { method: 'SPLIT', splitBreakdown: { cash: 50, upi: 50 } }, 105)).toThrow();
  });
});
