import type { Ticket, TicketItem, TicketItemStatus } from '../models/kds';

/**
 * Calculate an item transition from the latest persisted ticket snapshot.
 * Never use a UI snapshot to replace the full Firestore items array: two
 * kitchen devices may be marking different items ready simultaneously.
 */
export function transitionTicketItem(
  ticket: Pick<Ticket, 'items' | 'status'>,
  itemId: string,
  status: TicketItemStatus,
  now: string
): { items: TicketItem[]; allReady: boolean; reopened: boolean } {
  if (!ticket.items.some(item => item.id === itemId)) {
    throw new Error('Kitchen ticket item was not found. Refresh the ticket.');
  }

  const items = ticket.items.map(item => {
    if (item.id !== itemId) return item;
    if (status === 'READY') {
      return { ...item, status, completedAt: item.completedAt || now };
    }
    // Firestore rejects undefined values inside arrays. Remove the old
    // completion timestamp when an item is sent back for preparation.
    const { completedAt: _previousCompletion, ...withoutCompletion } = item;
    return { ...withoutCompletion, status };
  });
  const allReady = items.length > 0 && items.every(item => item.status === 'READY');
  return { items, allReady, reopened: ticket.status === 'READY' && !allReady };
}
