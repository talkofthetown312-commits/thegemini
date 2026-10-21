import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../core/firebase/firebaseConfig';
import { MASTER_INVENTORY } from '../data/masterInventory';
import { validateInventoryStaging, type StagedInventoryItem, type StagedRecipe } from './inventoryStaging';

/**
 * Owner-reviewed staging import. Never changes live stock, existing inventory
 * records or production recipes. Firestore authentication/rules still apply.
 */
export async function importInventoryStaging(
  catalogue: StagedInventoryItem[],
  recipes: StagedRecipe[] = [],
  confirmed: boolean
): Promise<{ imported: number; skipped: number; recipesStaged: number }> {
  if (!confirmed) throw new Error('Explicit owner confirmation is required');
  if (catalogue.length !== 144 || (recipes.length !== 0 && recipes.length !== 14)) {
    throw new Error('Expected complete 144-item catalogue and either zero or 14 approved recipe drafts');
  }
  const report = validateInventoryStaging(catalogue, recipes);
  if (recipes.length === 0) report.issues = report.issues.filter(issue => !issue.startsWith('Expected 14 approved recipes'));
  if (new Set(catalogue.map(item => item.id)).size !== 144) throw new Error('Duplicate catalogue identifiers');
  if (report.issues.length) throw new Error(report.issues.slice(0, 10).join('; '));
  if (!db) throw new Error('Firestore is not initialized');

  const existing = await getDocs(collection(db, 'inventory_items'));
  const existingIds = new Set(existing.docs.map(d => d.id));
  const pending = catalogue.filter(item => !existingIds.has(item.id));
  // All writes are a single atomic batch. Existing records are never overwritten.
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  for (const item of pending) {
    batch.set(doc(db, 'inventory_items', item.id), {
      id: item.id,
      sku: item.id,
      name: item.name,
      categoryId: item.category,
      unit: item.unit,
      costPrice: 0,
      sellingPrice: 0,
      reorderLevel: 0,
      minimumStock: 0,
      currentStock: 0,
      valuationMethod: 'WEIGHTED_AVERAGE',
      status: 'INACTIVE',
      lastUpdated: now,
      createdAt: now,
      source: 'Talk of the Town Master Inventory',
      deductionType: item.deductionType,
      suggestedParStock: item.suggestedParStock || '',
      notes: item.notes || '',
      stockVerified: false,
      activationReviewRequired: true
    });
  }
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    batch.set(doc(db, 'inventory_recipe_staging', `approved_${String(i + 1).padStart(2, '0')}`), {
      ...recipe,
      stockDeductionReady: false,
      importedAt: now,
      source: 'Talk of the Town Cost Calculator (approved menu only)'
    });
  }
  await batch.commit();
  return { imported: pending.length, skipped: catalogue.length - pending.length, recipesStaged: recipes.length };
}

/** Explicit catalogue-only import, with no draft recipes or live stock changes. */
export function importMasterInventory(confirmed: boolean) {
  return importInventoryStaging(MASTER_INVENTORY, [], confirmed);
}
