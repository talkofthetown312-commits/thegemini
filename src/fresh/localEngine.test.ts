import { describe, expect, it } from 'vitest';
import { INITIAL_MENU_ITEMS } from '../features/pos/data/menuData';
import { MASTER_INVENTORY } from '../features/inventory/data/masterInventory';
import { priceDraft, type FreshLedger } from './localEngine';

function fixture(): FreshLedger {
  return {
    schema: 1, deviceId: 'test', initializedAt: '2026-10-23T00:00:00.000Z', nextOrder: 1,
    staff: [], menu: structuredClone(INITIAL_MENU_ITEMS),
    inventory: structuredClone(MASTER_INVENTORY), orders: [], stockCounts: []
  };
}

describe('fresh local TalkOS data integrity', () => {
  it('keeps exactly 144 unique master inventory IDs without fictional sales', () => {
    const state = fixture();
    expect(state.inventory).toHaveLength(144);
    expect(new Set(state.inventory.map(item => item.id)).size).toBe(144);
    expect(state.inventory[0].id).toBe('TOT-001');
    expect(state.inventory[state.inventory.length - 1].id).toBe('TOT-144');
    expect(state.orders).toHaveLength(0);
    expect(state.stockCounts).toHaveLength(0);
  });

  it('prices menu quantities from the preserved source catalogue, not the client', () => {
    const state = fixture();
    const product = state.menu.find(item => item.id === 'prod_chow_veg')!;
    const small = product.sizes.find(size => size.size === 'Small')!;
    const result = priceDraft(state, [{ productId: product.id, size: 'Small', quantity: 3 }]);
    expect(result.lines[0].price).toBe(small.price);
    expect(result.total).toBe(small.price * 3);
    expect(state.orders).toHaveLength(0);
  });

  it('rejects archived products and invalid quantities', () => {
    const state = fixture();
    const archived = state.menu.find(item => item.active === false)!;
    expect(() => priceDraft(state, [{ productId: archived.id, size: archived.sizes[0].size, quantity: 1 }]))
      .toThrow(/unavailable/);
    expect(() => priceDraft(state, [{ productId: 'prod_chow_veg', size: 'Small', quantity: 0 }]))
      .toThrow(/quantities/);
    expect(() => priceDraft(state, [{ productId: 'prod_chow_veg', size: 'Small', quantity: 101 }]))
      .toThrow(/quantities/);
  });

  it('prevents unsupported sizes, negative prices and unknown product IDs', () => {
    const state = fixture();
    expect(() => priceDraft(state, [{ productId: 'not-a-product', size: 'Large', quantity: 1 }]))
      .toThrow(/unavailable/);
    expect(() => priceDraft(state, [{ productId: 'prod_chow_veg', size: 'Standard', quantity: 1 }]))
      .toThrow(/size/);
    state.menu[0].sizes[0].price = -10;
    expect(() => priceDraft(state, [{ productId: state.menu[0].id, size: state.menu[0].sizes[0].size, quantity: 1 }]))
      .toThrow(/Invalid/);
  });
});
