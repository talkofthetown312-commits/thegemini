import { create } from 'zustand';
import { InventoryItem, Category, Warehouse, StockTransaction, ItemBatch, CycleCount, StorageLocation } from '../models/inventory';
import { inventoryService } from '../services/inventoryService';

interface InventoryState {
  items: InventoryItem[];
  categories: Category[];
  warehouses: Warehouse[];
  batches: ItemBatch[];
  cycleCounts: CycleCount[];
  storageLocations: StorageLocation[];
  loading: boolean;
  error: string | null;
  itemsLoaded: boolean;
  loadInitialData: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
  addWarehouse: (warehouse: Omit<Warehouse, 'id'>) => Promise<void>;
  addStorageLocation: (location: Omit<StorageLocation, 'id'>) => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'createdAt' | 'currentStock'>) => Promise<void>;
  updateItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  recordTransaction: (txn: Omit<StockTransaction, 'id' | 'date'>) => Promise<void>;
  addBatch: (batch: Omit<ItemBatch, 'id'>) => Promise<void>;
  updateBatch: (id: string, data: Partial<ItemBatch>) => Promise<void>;
  addCycleCount: (count: Omit<CycleCount, 'id' | 'createdAt'>) => Promise<void>;
  updateCycleCount: (id: string, data: Partial<CycleCount>) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  categories: [],
  warehouses: [],
  batches: [],
  cycleCounts: [],
  storageLocations: [],
  loading: false,
  error: null,
  itemsLoaded: false,
  
  loadInitialData: async () => {
    set({ loading: true, error: null, itemsLoaded: false });
    // Load each collection independently: a missing warehouse, category or
    // manager-only resource must not hide inventory items that were retrieved.
    const sources = [
      inventoryService.getItems(),
      inventoryService.getCategories(),
      inventoryService.getWarehouses(),
      inventoryService.getBatches(),
      inventoryService.getCycleCounts(),
      inventoryService.getStorageLocations()
    ] as const;
    const results = await Promise.allSettled(sources);
    const failedNames = ['inventory items', 'categories', 'warehouses', 'batches', 'cycle counts', 'storage locations'];
    const errors = results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [failedNames[index] + ': ' + (result.reason instanceof Error ? result.reason.message : String(result.reason))]
        : []
    );
    const valueOrEmpty = <T,>(index: number): T[] => {
      const result = results[index];
      return result.status === 'fulfilled' ? result.value as T[] : [];
    };
    set({
      items: valueOrEmpty<InventoryItem>(0),
      categories: valueOrEmpty<Category>(1),
      warehouses: valueOrEmpty<Warehouse>(2),
      batches: valueOrEmpty<ItemBatch>(3),
      cycleCounts: valueOrEmpty<CycleCount>(4),
      storageLocations: valueOrEmpty<StorageLocation>(5),
      itemsLoaded: results[0].status === 'fulfilled',
      error: errors.length ? 'Could not load ' + errors.join('; ') : null,
      loading: false
    });
  },

  addCategory: async (category) => {
    try {
      const newCategory = await inventoryService.addCategory(category);
      set((state) => ({ categories: [...state.categories, newCategory] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  addWarehouse: async (warehouse) => {
    try {
      const newWarehouse = await inventoryService.addWarehouse(warehouse);
      set((state) => ({ warehouses: [...state.warehouses, newWarehouse] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  addStorageLocation: async (location) => {
    try {
      const newLocation = await inventoryService.addStorageLocation(location);
      set((state) => ({ storageLocations: [...state.storageLocations, newLocation] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  addItem: async (item) => {
    try {
      const newItem = await inventoryService.addItem(item);
      set((state) => ({ items: [...state.items, newItem] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateItem: async (id, data) => {
    try {
      await inventoryService.updateItem(id, data);
      set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, ...data, lastUpdated: new Date().toISOString() } : i)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteItem: async (id) => {
    try {
      await inventoryService.deleteItem(id);
      set((state) => ({
        items: state.items.filter(i => i.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  addBatch: async (batch) => {
    try {
      const newBatch = await inventoryService.addBatch(batch);
      set((state) => ({ batches: [...state.batches, newBatch] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateBatch: async (id, data) => {
    try {
      await inventoryService.updateBatch(id, data);
      set((state) => ({
        batches: state.batches.map(b => b.id === id ? { ...b, ...data } : b)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  addCycleCount: async (count) => {
    try {
      const newCount = await inventoryService.addCycleCount(count);
      set((state) => ({ cycleCounts: [...state.cycleCounts, newCount] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateCycleCount: async (id, data) => {
    try {
      await inventoryService.updateCycleCount(id, data);
      set((state) => ({
        cycleCounts: state.cycleCounts.map(c => c.id === id ? { ...c, ...data } : c)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  recordTransaction: async (txn) => {
    try {
      await inventoryService.recordTransaction(txn);
      // Refresh items and batches to get updated stock and valuations
      const [items, batches] = await Promise.all([
        inventoryService.getItems(),
        inventoryService.getBatches()
      ]);
      set({ items, batches });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  }
}));
