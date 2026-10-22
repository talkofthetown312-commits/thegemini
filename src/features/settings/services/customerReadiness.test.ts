import { describe, expect, it } from 'vitest';
import { canStartSales, checkCustomerReadiness } from './customerReadiness';
const ready = { businessName: 'Example Restaurant', menuItemCount: 1, inventoryItemCount: 0, paymentMethods: ['CASH'], activeStaffCount: 1, kitchenEnabled: false };
describe('customer readiness', () => {
  it('does not require an inventory catalogue before selling', () => {
    expect(canStartSales(ready)).toBe(true);
    expect(checkCustomerReadiness(ready).find(c => c.area === 'inventory')?.requiredToSell).toBe(false);
  });
  it('requires configured business, menu, payment and staff', () => {
    expect(canStartSales({ ...ready, businessName: ' ' })).toBe(false);
    expect(canStartSales({ ...ready, menuItemCount: 0 })).toBe(false);
    expect(canStartSales({ ...ready, paymentMethods: [] })).toBe(false);
    expect(canStartSales({ ...ready, activeStaffCount: 0 })).toBe(false);
  });
});
