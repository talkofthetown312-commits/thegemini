import type { OrderItem, PaymentMethod, PaymentDetails } from '../models/pos';

/** Check data that must be true before a paid order is written. */
export function validateCheckout(items: OrderItem[], method: PaymentMethod, details: PaymentDetails, total: number): void {
  if (!items.length) throw new Error('Cannot checkout an empty cart.');
  if (!Number.isFinite(total) || total < 0) throw new Error('Invalid order total.');
  for (const item of items) {
    if (!item.productId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
      !Number.isFinite(item.price) || item.price < 0) {
      throw new Error('Invalid product, quantity or price in cart.');
    }
  }
  if (details.method !== method) throw new Error('Payment method mismatch.');
  if (method === 'CASH') {
    if (!Number.isFinite(details.cashTendered) || (details.cashTendered ?? 0) < total) {
      throw new Error('Cash received is less than the order total.');
    }
  } else if (method === 'UPI') {
    if (!details.upiReference?.trim()) throw new Error('UPI reference is required after verifying payment.');
  } else if (method === 'CARD') {
    if (!details.cardType?.trim()) throw new Error('Card terminal confirmation is required.');
  } else if (method === 'SPLIT') {
    const cash = details.splitBreakdown?.cash ?? NaN;
    const upi = details.splitBreakdown?.upi ?? 0;
    const card = details.splitBreakdown?.card ?? 0;
    if (![cash, upi, card].every(v => Number.isFinite(v) && v >= 0) ||
      Math.abs(cash + upi + card - total) > 0.01) {
      throw new Error('Split payments must add up to the bill total.');
    }
  } else {
    throw new Error('Unsupported payment method.');
  }
}
