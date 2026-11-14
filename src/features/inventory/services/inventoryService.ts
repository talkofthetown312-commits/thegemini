import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../../core/firebase/firebaseConfig';
import { InventoryItem, Category, Warehouse, StockTransaction, ItemBatch, StorageLocation, CycleCount } from '../models/inventory';

class InventoryService {
  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'inventory_categories'));
    const snapshot = await getDocs(q);
    
    // Empty inventory setup is a valid state; never write demo categories.
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
    
    // Do not invent a default warehouse when none has been configured.
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
  async recordTransaction(transactionData: Omit<StockTransaction, 'id' | 'date'> & { idempotencyKey?: string }): Promise<StockTransaction> {
    if (!db) throw new Error("Firestore is not initialized");
    const { idempotencyKey, ...stockData } = transactionData;
    if (idempotencyKey && !/^[A-Za-z0-9_-]{1,180}$/.test(idempotencyKey)) throw new Error('Invalid stock transaction idempotency key');
    if (!Number.isFinite(stockData.quantity) || stockData.quantity <= 0) throw new Error('Stock quantity must be positive');
    const newTransaction: StockTransaction = {
      ...stockData,
      id: idempotencyKey ? `txn_${idempotencyKey}` : `txn_${crypto.randomUUID()}`,
      date: new Date().toISOString()
    };

    await runTransaction(db, async (transaction) => {
      const txnRef = doc(db, 'inventory_transactions', newTransaction.id);
      const existingTxn = await transaction.get(txnRef);
      if (existingTxn.exists()) {
        const previous = existingTxn.data() as StockTransaction;
        if (previous.itemId !== newTransaction.itemId ||
            previous.type !== newTransaction.type ||
            previous.quantity !== newTransaction.quantity ||
            previous.referenceId !== newTransaction.referenceId) {
          throw new Error('Stock idempotency key reused with different transaction data');
        }
        return;
      }

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

      // Read all documents before performing any writes (Firestore requirement).
      let batchRef;
      let batchDoc;
      // Update batch if applicable
      if (newTransaction.batchId) {
        batchRef = doc(db, 'inventory_batches', newTransaction.batchId);
        batchDoc = await transaction.get(batchRef);
      }

      transaction.update(itemRef, {
        currentStock: newStock,
        costPrice: newCostPrice,
        lastUpdated: new Date().toISOString()
      });
      if (batchRef && batchDoc?.exists()) {
        const batchData = batchDoc.data() as ItemBatch;
        const newBatchStock = batchData.currentQuantity + stockChange;
        transaction.update(batchRef, {
          currentQuantity: Math.max(0, newBatchStock),
          status: newBatchStock <= 0 ? 'DEPLETED' : batchData.status
        });
      }

      transaction.set(txnRef, newTransaction);
    });

    return newTransaction;
  }
}

export const inventoryService = new InventoryService();
