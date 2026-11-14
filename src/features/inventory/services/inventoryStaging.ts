/** Safe, side-effect-free validation of the Talk of the Town inventory staging export.
 * This module deliberately does not write to Firestore or change stock balances.
 */
export interface StagedInventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  deductionType: string;
  suggestedParStock?: string;
  notes?: string;
  active: boolean;
  currentStock: number;
  stockVerified: boolean;
  activationReviewRequired: boolean;
}
export interface StagedIngredient {
  ingredient: string;
  inventoryId: string;
  quantity: number;
  unit: string;
  verified: boolean;
  stockDeductionReady: boolean;
}
export interface StagedRecipe {
  menuItem: string;
  ingredients: StagedIngredient[];
  stockDeductionReady: boolean;
  status: string;
}
export interface StagingReport {
  items: number;
  recipes: number;
  issues: string[];
  canActivateDeductions: boolean;
}
const approvedDish = /^(veg|egg|chicken|pork|mixed) (chowmein|fried rice)$|^(chicken|pork) chilly \((dry|dried|gravy)\)$/i;
export function validateInventoryStaging(items: StagedInventoryItem[], recipes: StagedRecipe[]): StagingReport {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const item of items) {
    if (!/^TOT-\d{3}$/.test(item.id) || ids.has(item.id)) issues.push(`Invalid or duplicate inventory code: ${item.id}`);
    ids.add(item.id);
    if (!item.name?.trim() || !item.category?.trim() || !item.unit?.trim()) issues.push(`Incomplete inventory item: ${item.id}`);
    if (!Number.isFinite(item.currentStock) || item.currentStock < 0) issues.push(`Invalid stock: ${item.id}`);
    if (item.active && (!item.stockVerified || item.activationReviewRequired)) issues.push(`Unverified active inventory: ${item.id}`);
  }
  const names = new Set<string>();
  for (const recipe of recipes) {
    const name = recipe.menuItem?.trim() || '';
    if (!approvedDish.test(name)) issues.push(`Recipe outside approved menu: ${name}`);
    if (names.has(name.toLowerCase())) issues.push(`Duplicate recipe: ${name}`);
    names.add(name.toLowerCase());
    if (!recipe.ingredients?.length) issues.push(`Recipe without ingredients: ${name}`);
    if (recipe.stockDeductionReady) issues.push(`Recipe must undergo quantity/portion verification: ${name}`);
    for (const ing of recipe.ingredients || []) {
      if (!ids.has(ing.inventoryId)) issues.push(`Unknown ingredient inventory ID: ${name} / ${ing.inventoryId}`);
      if (!Number.isFinite(ing.quantity) || ing.quantity <= 0) issues.push(`Invalid ingredient quantity: ${name} / ${ing.ingredient}`);
      if (!ing.unit?.trim()) issues.push(`Missing ingredient unit: ${name} / ${ing.ingredient}`);
      if (ing.stockDeductionReady && !ing.verified) issues.push(`Unverified ingredient enabled: ${name} / ${ing.ingredient}`);
    }
  }
  if (items.length !== 144) issues.push(`Expected 144 inventory items, got ${items.length}`);
  if (recipes.length !== 14) issues.push(`Expected 14 approved recipes, got ${recipes.length}`);
  return { items: items.length, recipes: recipes.length, issues, canActivateDeductions: false };
}
