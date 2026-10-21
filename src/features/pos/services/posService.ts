import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { Product, Order, MenuItemSize } from '../models/pos';
import { INITIAL_MENU_ITEMS, getAllMenuItemSizes } from '../data/menuData';

class PosService {

  async getProducts(): Promise<Product[]> {
    // The approved code menu is the current POS release catalog. Keep availability
    // flags from Firestore, but do not silently overwrite prices on every page load.
    // A separate controlled migration must persist approved prices/recipes to Firestore.
    const released = INITIAL_MENU_ITEMS.filter(p =>
      p.active !== false && p.isAvailable !== false && !p.isSubItem
    );
    let remote: Product[] = [];
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.products)) remote = data.products;
      }
    } catch {
      // Static Firebase Hosting has no Express API.
    }
    if (remote.length === 0 && db) {
      try {
        const snapshot = await getDocs(query(collection(db, 'pos_products')));
        remote = snapshot.docs.map(record => ({ ...record.data(), id: record.id } as Product));
      } catch (error) {
        console.warn('Firestore menu unavailable; using released menu:', error);
      }
    }
    const byId = new Map(remote.map(p => [p.id, p]));
    return released.filter(p => {
      const saved = byId.get(p.id);
      return saved?.isAvailable !== false;
    }).map(p => ({
      ...p,
      // Preserve a Firestore-linked recipe where one exists; do not invent links.
      recipeId: byId.get(p.id)?.recipeId || p.recipeId
    }));
  }

  async syncInitialMenu(isCollectionEmpty = false): Promise<void> {
    // Never attempt Firestore write if no db or if user is unauthenticated (prevents 403)
    if (!db || !auth.currentUser) return;

    try {
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
    // 1. Check API endpoint
    try {
      const res = await fetch('/api/products/sizes');
      if (res.ok) {
        const data = await res.json();
        if (data && data.sizes && Array.isArray(data.sizes)) {
          return itemId ? data.sizes.filter((s: MenuItemSize) => s.item_id === itemId) : data.sizes;
        }
      }
    } catch {}

    // 2. Query Firestore if available
    if (db) {
      try {
        const q = query(collection(db, 'menu_item_sizes'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const sizes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItemSize));
          return itemId ? sizes.filter(s => s.item_id === itemId) : sizes;
        }
      } catch {}
    }

    // 3. Fallback
    const sizes = getAllMenuItemSizes();
    return itemId ? sizes.filter(s => s.item_id === itemId) : sizes;
  }

  async addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}`
    };

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
