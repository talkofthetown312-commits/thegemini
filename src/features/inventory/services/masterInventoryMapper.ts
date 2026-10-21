/** Master inventory import adapter.
 * Preserve every master row, including inactive and fixed-asset records.
 * Import is explicit and never writes balances or deletes existing items.
 */
export interface MasterInventoryRow {
  serial: number;
  category: string;
  item: string;
  unit: string;
  deductionType: string;
  parStock: string;
  notes: string;
}
export interface InventoryCatalogRecord extends MasterInventoryRow {
  id: string;
  isActive: boolean;
  stockTracking: 'RECIPE' | 'RECURRING' | 'ASSET';
  recipeEnabled: boolean;
}
export function mapMasterInventory(rows: MasterInventoryRow[]): InventoryCatalogRecord[] {
  const seen = new Set<number>();
  return rows.map(row => {
    if (!Number.isInteger(row.serial) || row.serial < 1 || row.serial > 999999 || seen.has(row.serial)) {
      throw new Error('Duplicate or invalid inventory serial number: ' + row.serial);
    }
    if (!row.item.trim() || !row.unit.trim() || !row.category.trim()) {
      throw new Error('Inventory item, category and unit are required: ' + row.serial);
    }
    seen.add(row.serial);
    const type = row.deductionType.toLowerCase();
    const stockTracking = type.includes('recipe') ? 'RECIPE'
      : type.includes('asset') || type.includes('fixed') ? 'ASSET'
      : 'RECURRING';
    return {
      ...row,
      id: 'TOT-' + String(row.serial).padStart(3, '0'),
      isActive: false, // never activate unverified catalog records automatically
      stockTracking,
      recipeEnabled: stockTracking === 'RECIPE'
    };
  });
}
