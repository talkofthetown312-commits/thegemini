import { describe, expect, it } from 'vitest';
import { validateInventoryStaging, type StagedInventoryItem, type StagedRecipe } from './inventoryStaging';

const item: StagedInventoryItem = {
  id: 'TOT-001', name: 'Chicken', category: 'Raw materials', unit: 'kg',
  deductionType: 'Recipe-Linked', active: false, currentStock: 0,
  stockVerified: false, activationReviewRequired: true
};
const recipe: StagedRecipe = {
  menuItem: 'Chicken Chowmein', status: 'DRAFT',
  stockDeductionReady: false,
  ingredients: [{ ingredient: 'Chicken', inventoryId: 'TOT-001', quantity: 180, unit: 'g', verified: false, stockDeductionReady: false }]
};
describe('inventory staging validation', () => {
  it('keeps a valid draft non-live', () => {
    const report = validateInventoryStaging([item], [recipe]);
    expect(report.issues.filter(x => !x.startsWith('Expected '))).toEqual([]);
    expect(report.canActivateDeductions).toBe(false);
  });
  it('detects duplicate IDs and missing ingredient mappings', () => {
    const report = validateInventoryStaging([item, item], [{ ...recipe, ingredients: [{ ...recipe.ingredients[0], inventoryId: 'TOT-999' }] }]);
    expect(report.issues.some(x => x.includes('duplicate'))).toBe(true);
    expect(report.issues.some(x => x.includes('Unknown ingredient'))).toBe(true);
  });
  it('rejects unapproved dishes and unverified activation', () => {
    const report = validateInventoryStaging([{ ...item, active: true }], [{ ...recipe, menuItem: 'Macaroni', stockDeductionReady: true }]);
    expect(report.issues.some(x => x.includes('outside approved menu'))).toBe(true);
    expect(report.issues.some(x => x.includes('Unverified active'))).toBe(true);
  });
});
