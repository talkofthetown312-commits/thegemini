/** Customer-owned setup fields. Empty configuration is expected before first launch. */
export type SetupArea = 'business' | 'menu' | 'inventory' | 'payments' | 'staff' | 'kitchen';
export interface CustomerSetup {
  businessName?: string;
  menuItemCount: number;
  inventoryItemCount: number;
  paymentMethods: string[];
  activeStaffCount: number;
  kitchenEnabled: boolean;
}
export interface SetupCheck {
  area: SetupArea;
  label: string;
  ready: boolean;
  requiredToSell: boolean;
}
export function checkCustomerReadiness(config: CustomerSetup): SetupCheck[] {
  return [
    { area: 'business', label: 'Enter business name', ready: Boolean(config.businessName?.trim()), requiredToSell: true },
    { area: 'menu', label: 'Add at least one sellable menu item', ready: config.menuItemCount > 0, requiredToSell: true },
    { area: 'inventory', label: 'Set up inventory and opening stock (optional until stock tracking starts)', ready: config.inventoryItemCount > 0, requiredToSell: false },
    { area: 'payments', label: 'Configure an accepted payment method', ready: config.paymentMethods.length > 0, requiredToSell: true },
    { area: 'staff', label: 'Assign at least one active staff account', ready: config.activeStaffCount > 0, requiredToSell: true },
    { area: 'kitchen', label: 'Enable kitchen display when required', ready: config.kitchenEnabled, requiredToSell: false }
  ];
}
export function canStartSales(config: CustomerSetup): boolean {
  return checkCustomerReadiness(config).filter(check => check.requiredToSell).every(check => check.ready);
}
