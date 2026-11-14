/**
 * TalkOS kiosk ordering contract — no Firestore or UI dependency.
 * Shared between future Android kiosk, local host and counter POS.
 * Kiosk submission is NOT a payment or kitchen dispatch.
 */
export type KioskOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED';

export interface KioskOrderLine {
  productId: string;
  productName: string;
  size: 'Small' | 'Medium' | 'Large' | 'Standard';
  quantity: number;
  unitPriceMinor: number;
  notes?: string;
}

export interface KioskOrder {
  id: string;
  token: string;
  kioskId: string;
  status: KioskOrderStatus;
  items: KioskOrderLine[];
  totalMinor: number;
  createdAt: string;
  paidAt?: string;
  posOrderId?: string;
}

/** Never trust client-provided totals or payment flags at the local host. */
export function calculateKioskTotalMinor(items: KioskOrderLine[]): number {
  return items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.unitPriceMinor) || item.unitPriceMinor < 0 ||
        !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Invalid kiosk line amount or quantity');
    }
    const lineTotal = item.unitPriceMinor * item.quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(sum + lineTotal)) {
      throw new Error('Kiosk order amount exceeds safe integer range');
    }
    return sum + lineTotal;
  }, 0);
}

export function canConfirmKioskPayment(order: KioskOrder): boolean {
  return order.status === 'PENDING_PAYMENT' && !order.paidAt && !order.posOrderId;
}

/**
 * Pure payment state transition. The eventual SQLite host must enforce this
 * condition atomically (compare-and-swap) in a database transaction, together
 * with its unique POS order mapping and stock movement/outbox records.
 */
export function markKioskOrderPaid(
  order: KioskOrder,
  posOrderId: string,
  paidAt: string
): KioskOrder {
  if (!canConfirmKioskPayment(order)) {
    throw new Error('Kiosk order is not awaiting payment');
  }
  if (!posOrderId.trim() || !Number.isFinite(Date.parse(paidAt))) {
    throw new Error('Payment confirmation requires a POS order ID and valid timestamp');
  }
  return { ...order, status: 'PAID', posOrderId, paidAt };
}
