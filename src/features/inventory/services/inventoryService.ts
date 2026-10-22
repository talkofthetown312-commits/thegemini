import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../../core/firebase/firebaseConfig';
import { InventoryItem, Category, Warehouse, StockTransaction, ItemBatch, StorageLocation, CycleCount } from '../models/inventory';

class InventoryService {
  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'inventory_categories'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      const seedCategories = [
        { name: 'Raw Materials', isActive: true },
        { name: 'Finished Goods', isActive: true },
        { name: 'Packaging', isActive: true },
        { name: 'Consumables', isActive: true }
      ];
      const categories: Category[] = [];
      for (const cat of seedCategories) {
        categories.push(await this.addCategory(cat));
      }
      return categories;
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  }

  async addCategory(categoryData: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    if (!db) throw new Error("Firestore is not initialized");
    const newCategory: Category = {
      ...categoryData,
      id: `cat_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'inventory_categories', newCategory.id), newCategory);
    return newCategory;
  }

  // --- Warehouses ---
  async getWarehouses(): Promise<Warehouse[]> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'inventory_warehouses'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      const mainWarehouse = await this.addWarehouse({
        name: 'Main Store',
        type: 'MAIN_STORE',
        location: 'HQ',
        isActive: true
      });
      return [mainWarehouse];
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse));
  }

  async addWarehouse(warehouseData: Omit<Warehouse, 'id'>): Promise<Warehouse> {
    if (!db) throw new Error("Firestore is not initialized");
    const newWarehouse: Warehouse = {
      ...warehouseData,
      id: `wh_${Date.now()}`,
    };
    await setDoc(doc(db, 'inventory_warehouses', newWarehouse.id), newWarehouse);
    return newWarehouse;
  }

  // --- Storage Locations ---
  async getStorageLocations(): Promise<StorageLocation[]> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'inventory_storage_locations'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageLocation));
  }

  async addStorageLocation(locationData: Omit<StorageLocation, 'id'>): Promise<StorageLocation> {
    if (!db) throw new Error("Firestore is not initialized");
    const newLocation: StorageLocation = {
      ...locationData,
      id: `loc_${Date.now()}`,
    };
    await setDoc(doc(db, 'inventory_storage_locations', newLocation.id), newLocation);
    return newLocation;
  }

  // --- Items ---
  async getItems(): Promise<InventoryItem[]> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'inventory_items'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
  }

  async addItem(itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'createdAt' | 'currentStock'>): Promise<InventoryItem> {
    if (!db) throw new Error("Firestore is not initialized");
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv_${Date.now()}`,
      currentStock: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'inventory_items', newItem.id), newItem);
    return newItem;
  }

  async updateItem(id: string, data: Partial<InventoryItem>): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized");
    await updateDoc(doc(db, 'inventory_items', id), { ...data, lastUpdated: new Date().toISOString() });
  }

  async deleteItem(id: string): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized");
    await deleteDoc(doc(db, 'inventory_items', id));
  }

  // --- Batches ---
  async getBatches(): Promise<ItemBatch[]> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'inventory_batches'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemBatch));
  }

  async addBatch(batchData: Omit<ItemBatch, 'id'>): Promise<ItemBatch> {
    if (!db) throw new Error("Firestore is not initialized");
    const newBatch: ItemBatch = {
      ...batchData,
      id: `bat_${Date.now()}`
    };
    await setDoc(doc(db, 'inventory_batches', newBatch.id), newBatch);
    return newBatch;
  }

  async updateBatch(id: string, data: Partial<ItemBatch>): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized");
    await updateDoc(doc(db, 'inventory_batches', id), data);
  }

  // --- Cycle Counts ---
  async getCycleCounts(): Promise<CycleCount[]> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'inventory_cycle_counts'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CycleCount));
  }

  async addCycleCount(countData: Omit<CycleCount, 'id' | 'createdAt'>): Promise<CycleCount> {
    if (!db) throw new Error("Firestore is not initialized");
    const newCount: CycleCount = {
      ...countData,
      id: `cc_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'inventory_cycle_counts', newCount.id), newCount);
    return newCount;
  }

  async updateCycleCount(id: string, data: Partial<CycleCount>): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized");
    await updateDoc(doc(db, 'inventory_cycle_counts', id), data);
  }

  // --- Transactions ---
  async recordTransaction(transactionData: Omit<StockTransaction, 'id' | 'date'>): Promise<StockTransaction> {
    if (!db) throw new Error("Firestore is not initialized");
    const newTransaction: StockTransaction = {
      ...transactionData,
      id: doc(collection(db, 'inventory_transactions')).id,
      date: new Date().toISOString()
    };

    await runTransaction(db, async (transaction) => {
      if (!db) return;
      
      const itemRef = doc(db, 'inventory_items', newTransaction.itemId);
      const itemDoc = await transaction.get(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error("Item does not exist!");
      }

      const itemData = itemDoc.data() as InventoryItem;
      const currentStock = itemData.currentStock || 0;
      let stockChange = 0;

      switch (newTransaction.type) {
        case 'STOCK_IN':
        case 'RETURN':
        case 'OPENING':
          stockChange = newTransaction.quantity;
          break;
        case 'STOCK_OUT':
        case 'DAMAGE':
        case 'WASTAGE':
        case 'EXPIRY':
          stockChange = -newTransaction.quantity;
          break;
        case 'ADJUSTMENT':
        case 'PHYSICAL_VERIFICATION':
          stockChange = newTransaction.quantity;
          break;
        case 'TRANSFER':
          stockChange = 0; 
          break;
      }

      const newStock = currentStock + stockChange;
      
      let newCostPrice = itemData.costPrice;

      // Basic Weighted Average Cost Update on STOCK_IN
      if (newTransaction.type === 'STOCK_IN' && itemData.valuationMethod === 'WEIGHTED_AVERAGE') {
        const totalCurrentValue = currentStock * itemData.costPrice;
        const totalNewValue = newTransaction.quantity * newTransaction.unitCost;
        if (newStock > 0) {
           newCostPrice = (totalCurrentValue + totalNewValue) / newStock;
        }
      }

      transaction.update(itemRef, { 
        currentStock: newStock,
        costPrice: newCostPrice,
        lastUpdated: new Date().toISOString()
      });

      // Update batch if applicable
      if (newTransaction.batchId) {
        const batchRef = doc(db, 'inventory_batches', newTransaction.batchId);
        const batchDoc = await transaction.get(batchRef);
        if (batchDoc.exists()) {
           const batchData = batchDoc.data() as ItemBatch;
           const newBatchStock = batchData.currentQuantity + stockChange;
           transaction.update(batchRef, {
              currentQuantity: Math.max(0, newBatchStock),
              status: newBatchStock <= 0 ? 'DEPLETED' : batchData.status
           });
        }
      }

      const txnRef = doc(db, 'inventory_transactions', newTransaction.id);
      transaction.set(txnRef, newTransaction);
    });

    return newTransaction;
  }
}

export const inventoryService = new InventoryService();
