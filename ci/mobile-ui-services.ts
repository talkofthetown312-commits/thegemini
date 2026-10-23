// Isolated UI fixtures, resolved ONLY by test-mobile-ui.mjs. No account is
// authenticated and no business records are fabricated or written by this test.
export function useAuth() {
  return { user: null, profile: { displayName: 'UI test', roles: ['OWNER'] },
    hasRole: () => true, hasPermission: () => true, logout: async () => {} };
}
const empty = async () => [];
export const inventoryService = {
  getItems: empty, getCategories: empty, getWarehouses: empty,
  getBatches: empty, getCycleCounts: empty, getStorageLocations: empty,
};
export const posService = {
  getProducts: async () => { throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); },
  getOrders: empty,
  getAllProducts: async () => { throw new Error('Menu read unavailable (test)'); },
};
