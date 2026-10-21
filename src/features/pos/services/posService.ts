import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { Product, Order, MenuItemSize } from '../models/pos';
import { INITIAL_MENU_ITEMS, getAllMenuItemSizes } from '../data/menuData';

class PosService {
  private hasInitializedMenu = false;

  async getProducts(): Promise<Product[]> {
    // The approved code menu is the current POS release catalog. Keep availability
    // flags from Firestore, but do not silently overwrite prices on every page load.
    // A separate controlled migration must persist approved prices/recipes to Firestore.
    const released = INITIAL_MENU_ITEMS.filter(p =>
      p.active !== false && p.isAvailable !== false && !p.isSubItem
    );
    const releasedIds = new Set(released.map(p => p.id));
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

  private localOrders: Order[] = [];

  async getOrders(): Promise<Order[]> {
    if (!db) return this.localOrders;
    try {
      const q = query(collection(db, 'pos_orders'));
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      // Sort newest first
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (orders.length > 0) {
        this.localOrders = orders;
        return orders;
      }
      return this.localOrders;
    } catch (err) {
      console.warn("Falling back to local orders due to error:", err);
      return this.localOrders;
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status'], voidReason?: string): Promise<void> {
    const orderIndex = this.localOrders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      this.localOrders[orderIndex] = {
        ...this.localOrders[orderIndex],
        status,
        ...(voidReason ? { voidReason } : {})
      };
    }

    if (db) {
      try {
        await Promise.race([
          updateDoc(doc(db, 'pos_orders', orderId), {
            status,
            ...(voidReason ? { voidReason } : {}),
            updatedAt: new Date().toISOString()
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout writing to Firestore')), 1500))
        ]);
      } catch (err) {
        console.warn("Could not update order status in Firestore:", err);
      }
    }
  }

  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'orderNumber'>): Promise<Order> {
    const newOrder: Order = {
      ...orderData,
      id: `ord_${Date.now()}`,
      orderNumber: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString()
    };

    this.localOrders.unshift(newOrder);

    if (db) {
      try {
        // Strip undefined values for Firestore serialization and apply timeout protection
        const cleanOrder = JSON.parse(JSON.stringify(newOrder));
        await Promise.race([
          setDoc(doc(db, 'pos_orders', newOrder.id), cleanOrder),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout writing to Firestore')), 1500))
        ]);
      } catch (err) {
        console.warn("Could not save order to Firestore (continuing with local order):", err);
      }
    }

    return newOrder;
  }
}

export const posService = new PosService();
