import { describe, expect, it } from 'vitest';
import type { TicketItem } from '../models/kds';
import { transitionTicketItem } from './ticketTransitions';

const items: TicketItem[] = [
  { id: 'a', productId: 'p1', productName: 'Chowmein', quantity: 1, modifiers: [], stationId: 'st_1', status: 'PENDING' },
  { id: 'b', productId: 'p2', productName: 'Fried Rice', quantity: 1, modifiers: [], stationId: 'st_1', status: 'PENDING' }
];
const now = '2026-10-22T00:00:00.000Z';

describe('atomic kitchen item transitions', () => {
  it('marks only the requested item and does not complete the ticket prematurely', () => {
    const result = transitionTicketItem({ items, status: 'PREPARING' }, 'a', 'READY', now);
    expect(result.items[0]).toMatchObject({ status: 'READY', completedAt: now });
    expect(result.items[1].status).toBe('PENDING');
    expect(result.allReady).toBe(false);
    expect(items[0].status).toBe('PENDING');
  });

  it('recognizes the final ready item from the latest snapshot', () => {
    const previous = transitionTicketItem({ items, status: 'PREPARING' }, 'a', 'READY', now);
    const result = transitionTicketItem({ items: previous.items, status: 'PREPARING' }, 'b', 'READY', now);
    expect(result.allReady).toBe(true);
    expect(result.items.every(item => item.status === 'READY')).toBe(true);
  });

  it('reopens a completed ticket and removes stale item completion time', () => {
    const ready = items.map(item => ({ ...item, status: 'READY' as const, completedAt: now }));
    const result = transitionTicketItem({ items: ready, status: 'READY' }, 'a', 'PENDING', now);
    expect(result.reopened).toBe(true);
    expect(result.allReady).toBe(false);
    expect(result.items[0]).not.toHaveProperty('completedAt');
    expect(result.items[1].completedAt).toBe(now);
  });

  it('rejects stale item identifiers instead of silently succeeding', () => {
    expect(() => transitionTicketItem({ items, status: 'NEW' }, 'missing', 'READY', now)).toThrow(/not found/);
  });
});
