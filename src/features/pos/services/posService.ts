import { collection, query, getDocs, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { Product, Order, MenuItemSize } from '../models/pos';
import { INITIAL_MENU_ITEMS, getAllMenuItemSizes } from '../data/menuData';
import { visibleCustomerProducts, sizesForCustomerProduct, validateCustomerProduct } from './customerCatalogue';

class PosService {

  async getAllProducts(): Promise<Product[]> {
    // Firestore is the source of truth for the customer's menu, including
    // newly created products, edited prices and availability.
    if (db) {
      const snapshot = await getDocs(query(collection(db, 'pos_products')));
      return snapshot.docs.map(record => ({ ...record.data(), id: record.id } as Product));
    }
    throw new Error('Restaurant menu unavailable: database is not configured.');
  }

  async getProducts(): Promise<Product[]> {
    return visibleCustomerProducts(await this.getAllProducts());
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
    throw new Error('Restaurant menu sizes unavailable: database is not configured.');
  }

  async addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    if (!db || !auth.currentUser) throw new Error('Sign in to save a customer menu item.');
    validateCustomerProduct({ ...productData, id: 'new' });
    const id = doc(collection(db, 'pos_products')).id;
    const newProduct: Product = {
      ...productData,
      id,
      sizes: productData.sizes.map(size => ({ ...size, item_id: id }))
    };
    const batch = writeBatch(db);
    batch.set(doc(db, 'pos_products', id), newProduct);
    for (const size of newProduct.sizes) {
      const sizeId = id + '_' + size.size.toLowerCase();
      batch.set(doc(db, 'menu_item_sizes', sizeId), { ...size, id: sizeId });
    }
    await batch.commit();
    return newProduct;
  }

  async updateProduct(product: Product): Promise<void> {
    if (!db || !auth.currentUser) throw new Error('Sign in to edit menu items.');
    validateCustomerProduct(product);
    const batch = writeBatch(db);
    batch.set(doc(db, 'pos_products', product.id), product);
    for (const size of product.sizes) {
      const id = product.id + '_' + size.size.toLowerCase();
      batch.set(doc(db, 'menu_item_sizes', id), { ...size, id, item_id: product.id });
    }
    await batch.commit();
  }

  async setProductAvailability(productId: string, available: boolean): Promise<void> {
    if (!db || !auth.currentUser) throw new Error('Sign in to change menu availability.');
    if (!productId.trim()) throw new Error('Missing product ID.');
    await updateDoc(doc(db, 'pos_products', productId), { isAvailable: available });
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
