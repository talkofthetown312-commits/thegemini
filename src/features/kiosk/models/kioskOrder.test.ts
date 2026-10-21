import { describe, expect, it } from 'vitest';
import { calculateKioskTotalMinor, canConfirmKioskPayment, type KioskOrder } from './kioskOrder';

describe('kiosk order contract', () => {
  it('calculates amounts in minor units without floating point currency rounding', () => {
    expect(calculateKioskTotalMinor([
      { productId: 'a', productName: 'Chowmein', size: 'Medium', quantity: 2, unitPriceMinor: 11000 },
      { productId: 'b', productName: 'Rice', size: 'Small', quantity: 1, unitPriceMinor: 7000 }
    ])).toBe(29000);
  });

  it('rejects invalid quantities and prices', () => {
    expect(() => calculateKioskTotalMinor([{ productId: 'a', productName: 'A', size: 'Small', quantity: 0, unitPriceMinor: 100 }])).toThrow();
    expect(() => calculateKioskTotalMinor([{ productId: 'a', productName: 'A', size: 'Small', quantity: 1, unitPriceMinor: -1 }])).toThrow();
  });

  it('allows payment confirmation only for pending orders', () => {
    const order: KioskOrder = { id: '1', token: 'K001', kioskId: 'kiosk-1', status: 'PENDING_PAYMENT', items: [], totalMinor: 0, createdAt: new Date(0).toISOString() };
    expect(canConfirmKioskPayment(order)).toBe(true);
    expect(canConfirmKioskPayment({ ...order, status: 'PAID' })).toBe(false);
    expect(canConfirmKioskPayment({ ...order, posOrderId: 'paid-order' })).toBe(false);
  });
});
