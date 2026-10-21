import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { Product, Order, MenuItemSize } from '../models/pos';
import { INITIAL_MENU_ITEMS, getAllMenuItemSizes } from '../data/menuData';
import { visibleCustomerProducts, sizesForCustomerProduct } from './customerCatalogue';

class PosService {

  async getProducts(): Promise<Product[]> {
    // Firestore is the source of truth for the customer's menu, including
    // newly created products, edited prices and availability.
    if (db) {
      const snapshot = await getDocs(query(collection(db, 'pos_products')));
      return visibleCustomerProducts(snapshot.docs.map(record =>
        ({ ...record.data(), id: record.id } as Product)
      ));
    }
    // Demo-only fallback when no customer database is configured.
    return visibleCustomerProducts(INITIAL_MENU_ITEMS);
  }

  async syncInitialMenu(isCollectionEmpty = false): Promise<void> {
    // Never attempt Firestore write if no db or if user is unauthenticated (prevents 403)
    if (!db || !auth.currentUser || !isCollectionEmpty) return;

    try {
      // Seed only a genuinely empty customer menu; never overwrite configured products.
      const existing = await getDocs(query(collection(db, 'pos_products')));
      if (!existing.empty) return;
      // Upsert products to pos_products
      for (const item of INITIAL_MENU_ITEMS) {
        await setDoc(doc(db, 'pos_products', item.id), item, { merge: true });
      }

      // Upsert sizes to menu_item_sizes table/collection
      const allSizes = getAllMenuItemSizes();
      for (const size of allSizes) {
        const sizeDocId = size.id || `${size.item_id}_${size.size.toLowerCase()}`;
        await setDoc(doc(db, 'menu_item_sizes', sizeDocId), size, { merge: true });
      }
    } catch (err) {
      console.warn("Could not sync menu items to Firestore:", err);
    }
  }

  async getMenuItemSizes(itemId?: string): Promise<MenuItemSize[]> {
    if (db) {
      const snapshot = await getDocs(query(collection(db, 'pos_products')));
      const products = snapshot.docs.map(record => ({ ...record.data(), id: record.id } as Product));
      const sizes = products.flatMap(sizesForCustomerProduct);
      return itemId ? sizes.filter(size => size.item_id === itemId) : sizes;
    }
    const demoSizes = getAllMenuItemSizes();
    return itemId ? demoSizes.filter(size => size.item_id === itemId) : demoSizes;
  }

  async addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    const newProduct: Product = {
      ...productData,
      id: db ? doc(collection(db, 'pos_products')).id : `prod_${crypto.randomUUID()}`
    };

    if (!db || !auth.currentUser) throw new Error('Sign in to save a customer menu item.');
    if (db) {
      await setDoc(doc(db, 'pos_products', newProduct.id), newProduct);
      if (newProduct.sizes) {
        for (const s of newProduct.sizes) {
          const sizeDocId = `${newProduct.id}_${s.size.toLowerCase()}`;
          await setDoc(doc(db, 'menu_item_sizes', sizeDocId), {
            ...s,
            id: sizeDocId,
            item_id: newProduct.id
          });
        }
      }
    }

    return newProduct;
  }

  async getOrders(): Promise<Order[]> {
    if (!db) throw new Error('Firestore is not configured. Order history is unavailable.');
    const snapshot = await getDocs(query(collection(db, 'pos_orders')));
    return snapshot.docs
      .map(record => ({ ...record.data(), id: record.id } as Order))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateOrderStatus(orderId: string, status: Order['status'], voidReason?: string): Promise<void> {
    if (!db) throw new Error('Firestore is not configured. Cannot update order status.');
    await updateDoc(doc(db, 'pos_orders', orderId), {
      status,
      ...(voidReason ? { voidReason } : {}),
      updatedAt: new Date().toISOString()
    });
  }

  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'orderNumber'>): Promise<Order> {
    if (!db) throw new Error('Firestore is not configured. Checkout is unavailable.');
    if (!auth.currentUser) throw new Error('Sign in before completing a sale.');

    // Allocate a stable ID before writing, so a retry can use the same identity.
    // Do not report payment/order completion unless Firestore acknowledges the write.
    const id = doc(collection(db, 'pos_orders')).id;
    const newOrder: Order = {
      ...orderData,
      id,
      orderNumber: `ORD-${id.slice(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };
    const cleanOrder = JSON.parse(JSON.stringify(newOrder));
    await setDoc(doc(db, 'pos_orders', id), cleanOrder);
    return newOrder;
  }
}

export const posService = new PosService();
