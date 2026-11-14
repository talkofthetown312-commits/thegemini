import { create } from 'zustand';
import { 
  Product, 
  OrderItem, 
  Order, 
  ItemSize, 
  OrderType, 
  PaymentMethod, 
  PaymentDetails, 
  DiscountType, 
  ParkedOrder 
} from '../models/pos';
import { posService } from '../services/posService';
import { validateCheckout } from '../services/checkoutValidation';
import { inventoryService } from '../../inventory/services/inventoryService';
import { manufacturingService } from '../../manufacturing/services/manufacturingService';
import { kdsService } from '../../kds/services/kdsService';

interface PosState {
  products: Product[];
  cart: OrderItem[];
  loading: boolean;
  error: string | null;
  menuError: string | null;
  ordersError: string | null;
  lastCompletedOrder: Order | null;
  
  // Active Order Context
  orderType: OrderType;
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  orderNotes: string;
  discount: { type: DiscountType; value: number; reason?: string } | null;

  // Parked Orders
  parkedOrders: ParkedOrder[];

  // Order History
  ordersHistory: Order[];
  ordersLoading: boolean;

  // Actions
  loadProducts: () => Promise<void>;
  setOrderType: (orderType: OrderType) => void;
  setTableNumber: (tableNumber: string) => void;
  setCustomerName: (customerName: string) => void;
  setCustomerPhone: (customerPhone: string) => void;
  setOrderNotes: (notes: string) => void;
  applyDiscount: (type: DiscountType, value: number, reason?: string) => void;
  removeDiscount: () => void;

  addToCart: (
    product: Product, 
    sizeOrQuantity?: ItemSize | number, 
    selectedOption?: string, 
    quantity?: number,
    notes?: string
  ) => void;
  updateQuantity: (cartItemIdOrProductId: string, quantity: number) => void;
  updateItemNotes: (cartItemIdOrProductId: string, notes: string) => void;
  removeFromCart: (cartItemIdOrProductId: string) => void;
  clearCart: () => void;

  // Park & Recall
  parkCurrentOrder: (customLabel?: string) => void;
  recallParkedOrder: (parkedOrderId: string) => void;
  deleteParkedOrder: (parkedOrderId: string) => void;

  // Order Settlement
  completeCheckout: (payment: { method: PaymentMethod; details: PaymentDetails }) => Promise<Order>;
  checkout: () => Promise<Order | void>;
  clearCompletedOrder: () => void;

  // Order History & Cancellation
  loadOrdersHistory: () => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
}

export const usePosStore = create<PosState>((set, get) => ({
  products: [],
  cart: [],
  loading: false,
  error: null,
  menuError: null,
  ordersError: null,
  lastCompletedOrder: null,

  orderType: 'DINE_IN',
  tableNumber: 'Table 1',
  customerName: '',
  customerPhone: '',
  orderNotes: '',
  discount: null,

  parkedOrders: [],
  ordersHistory: [],
  ordersLoading: false,

  setOrderType: (orderType) => set({ orderType }),
  setTableNumber: (tableNumber) => set({ tableNumber }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setOrderNotes: (orderNotes) => set({ orderNotes }),
  applyDiscount: (type, value, reason) => set({ discount: { type, value, reason } }),
  removeDiscount: () => set({ discount: null }),

  loadProducts: async () => {
    set({ loading: true, menuError: null });
    try {
      const products = await posService.getProducts();
      set({ products, loading: false });
    } catch (err: any) {
      set({ menuError: err.code === 'permission-denied'
        ? 'Your account is signed in, but access to the restaurant menu was denied. Saved menu items could not be checked.'
        : 'Could not load the saved menu: ' + err.message, loading: false });
    }
  },

  addToCart: (product, sizeOrQuantity, selectedOption, quantityParam, notesParam) => {
    const { cart } = get();

    let chosenSize: ItemSize = 'Standard';
    let qty = 1;

    // Handle overloaded parameter: addToCart(product, 2) vs addToCart(product, 'Medium', undefined, 1)
    if (typeof sizeOrQuantity === 'number') {
      qty = sizeOrQuantity;
      if (product.sizes && product.sizes.length > 0) {
        chosenSize = product.sizes[0].size;
      }
    } else if (typeof sizeOrQuantity === 'string') {
      chosenSize = sizeOrQuantity as ItemSize;
      qty = quantityParam !== undefined ? quantityParam : 1;
    } else {
      qty = quantityParam !== undefined ? quantityParam : 1;
      if (product.sizes && product.sizes.length === 1) {
        chosenSize = product.sizes[0].size;
      } else if (product.sizes && product.sizes.length > 1) {
        chosenSize = 'Small';
      }
    }

    // Determine price based on chosen size
    let itemPrice = product.price;
    let itemCost = product.unitCost || product.costPrice || 0;

    if (product.sizes && product.sizes.length > 0) {
      const matchedSize = product.sizes.find(s => s.size === chosenSize);
      if (matchedSize) {
        itemPrice = matchedSize.price;
        if (matchedSize.cost_price) {
          itemCost = matchedSize.cost_price;
        }
      }
    }

    // Unique cart item identifier including size and any combo choice
    const cartItemId = `${product.id}_${chosenSize}_${selectedOption || 'default'}`;

    const existingIndex = cart.findIndex(
      item => (item.cartItemId === cartItemId) || (!item.cartItemId && item.productId === product.id && item.size === chosenSize)
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: updatedCart[existingIndex].quantity + qty,
        notes: notesParam || updatedCart[existingIndex].notes
      };
      set({ cart: updatedCart });
    } else {
      const newItem: OrderItem = {
        id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        cartItemId,
        productId: product.id,
        name: product.name,
        size: chosenSize,
        selectedOption,
        price: itemPrice,
        quantity: qty,
        notes: notesParam,
        unitCost: itemCost,
        recipeId: product.recipeId,
        isCombo: product.isCombo,
        comboComponents: product.comboComponents
      };
      set({ cart: [...cart, newItem] });
    }
  },

  updateQuantity: (cartItemIdOrProductId, newQuantity) => {
    const { cart } = get();
    if (newQuantity <= 0) {
      get().removeFromCart(cartItemIdOrProductId);
      return;
    }

    set({
      cart: cart.map(item => 
        (item.cartItemId === cartItemIdOrProductId || item.id === cartItemIdOrProductId || item.productId === cartItemIdOrProductId)
          ? { ...item, quantity: newQuantity }
          : item
      )
    });
  },

  updateItemNotes: (cartItemIdOrProductId, notes) => {
    const { cart } = get();
    set({
      cart: cart.map(item =>
        (item.cartItemId === cartItemIdOrProductId || item.id === cartItemIdOrProductId || item.productId === cartItemIdOrProductId)
          ? { ...item, notes }
          : item
      )
    });
  },

  removeFromCart: (cartItemIdOrProductId) => {
    set({
      cart: get().cart.filter(item => 
        item.cartItemId !== cartItemIdOrProductId && 
        item.id !== cartItemIdOrProductId && 
        item.productId !== cartItemIdOrProductId
      )
    });
  },

  clearCart: () => {
    set({ 
      cart: [],
      discount: null,
      orderNotes: '',
      customerName: '',
      customerPhone: ''
    });
  },

  clearCompletedOrder: () => {
    set({ lastCompletedOrder: null });
  },

  parkCurrentOrder: (customLabel) => {
    const { cart, orderType, tableNumber, customerName, customerPhone, orderNotes, parkedOrders } = get();
    if (cart.length === 0) return;

    const label = customLabel || (orderType === 'DINE_IN' ? tableNumber : (customerName ? `${customerName} (${orderType})` : `Order #${parkedOrders.length + 1}`));
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const newParked: ParkedOrder = {
      id: `park_${Date.now()}`,
      label,
      orderType,
      tableNumber,
      customerName,
      customerPhone,
      items: [...cart],
      subtotal,
      orderNotes,
      parkedAt: new Date().toISOString()
    };

    set({
      parkedOrders: [newParked, ...parkedOrders],
      cart: [],
      orderNotes: '',
      customerName: '',
      customerPhone: '',
      discount: null
    });
  },

  recallParkedOrder: (parkedOrderId) => {
    const { parkedOrders } = get();
    const orderToResume = parkedOrders.find(p => p.id === parkedOrderId);
    if (!orderToResume) return;

    set({
      cart: orderToResume.items,
      orderType: orderToResume.orderType,
      tableNumber: orderToResume.tableNumber || 'Table 1',
      customerName: orderToResume.customerName || '',
      customerPhone: orderToResume.customerPhone || '',
      orderNotes: orderToResume.orderNotes || '',
      parkedOrders: parkedOrders.filter(p => p.id !== parkedOrderId)
    });
  },

  deleteParkedOrder: (parkedOrderId) => {
    set({
      parkedOrders: get().parkedOrders.filter(p => p.id !== parkedOrderId)
    });
  },

  completeCheckout: async ({ method, details }) => {
    // Lock synchronously before any await. Rapid taps or keyboard shortcuts must
    // not create multiple paid orders from the same cart.
    if (get().loading) throw new Error('Checkout is already processing. Please wait.');
    const { cart, orderType, tableNumber, customerName, customerPhone, orderNotes, discount } = get();
    if (cart.length === 0) throw new Error("Cannot checkout empty cart");

    set({ loading: true, error: null });
    try {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalCost = cart.reduce((sum, item) => sum + ((item.unitCost || 0) * item.quantity), 0);

      // Compute Discount
      let discountAmount = 0;
      if (discount) {
        if (discount.type === 'PERCENTAGE') {
          discountAmount = (subtotal * discount.value) / 100;
        } else {
          discountAmount = Math.min(subtotal, discount.value);
        }
      }

      const discountedSubtotal = Math.max(0, subtotal - discountAmount);
      
      // Standard GST: 5% total (2.5% CGST + 2.5% SGST)
      const cgst = discountedSubtotal * 0.025;
      const sgst = discountedSubtotal * 0.025;
      const tax = cgst + sgst;
      const total = Math.round((discountedSubtotal + tax) * 100) / 100;

      validateCheckout(cart, method, details, total);

      const order = await posService.createOrder({
        items: cart,
        orderType,
        tableNumber: orderType === 'DINE_IN' ? tableNumber : undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        orderNotes: orderNotes.trim() || undefined,
        subtotal,
        discountAmount,
        discountType: discount?.type,
        discountValue: discount?.value,
        discountReason: discount?.reason,
        tax,
        cgst,
        sgst,
        total,
        totalCost,
        paymentMethod: method,
        paymentDetails: details,
        cashierName: 'Talk of the Town Counter',
        status: 'PAID'
      });

      // 1. Inventory Deduction. Paid sale remains recorded even if stock fails.
      const stockWarnings: string[] = [];
      for (const [cartIndex, item] of cart.entries()) {
        if (item.recipeId) {
          try {
            const recipes = await manufacturingService.getRecipes();
            const recipe = recipes.find(r => r.id === item.recipeId);
            if (!recipe) stockWarnings.push(`${item.name}: recipe missing`);
            if (recipe) {
              const baseYield = recipe.yieldQuantity || 1;
              const ratio = item.quantity / baseYield;
              
              for (const [ingredientIndex, ing] of recipe.ingredients.entries()) {
                if (ing.inventoryItemId) {
                  const qtyToDeduct = ing.quantity * ratio;
                  await inventoryService.recordTransaction({
                    idempotencyKey: `sale_${order.id}_${cartIndex}_${ingredientIndex}`,
                    itemId: ing.inventoryItemId,
                    type: 'STOCK_OUT',
                    quantity: qtyToDeduct,
                    referenceId: order.id,
                    notes: `POS Sale (${order.orderNumber}): ${item.name}${item.size && item.size !== 'Standard' ? ` — ${item.size}` : ''}`,
                    unitCost: ing.costPerUnit || 0,
                    totalCost: (ing.costPerUnit || 0) * qtyToDeduct,
                    performedBy: 'System'
                  }).catch(e => { console.error('Error recording POS inventory deduction', e); stockWarnings.push(`${item.name}: ${ing.itemName || ing.inventoryItemId}`); });
                }
              }
            }
          } catch (recipeError) {
             stockWarnings.push(`${item.name}: recipe lookup failed`);
             console.error('Error fetching recipe for POS deduction', recipeError);
          }
        }

        // Combo stock must be deducted from ingredient BOMs, not product IDs.
        // If a recipe is missing, flag it for setup rather than writing invalid
        // inventory transactions against the POS product collection.
        if (item.isCombo && item.comboComponents) {
          const recipes = await manufacturingService.getRecipes().catch(() => { stockWarnings.push(`${item.name}: combo recipes unavailable`); return []; });
          const menuProducts = get().products;
          for (const [componentIndex, comp] of item.comboComponents.entries()) {
            const selected = comp.isChoice && item.selectedOption
              ? comp.options?.find(o => o.name === item.selectedOption)
              : undefined;
            const productId = selected?.itemId || comp.itemId;
            const componentSize = selected?.size || comp.size || 'Standard';
            const product = menuProducts.find(p => p.id === productId);
            const recipe = recipes.find(r => r.id === product?.recipeId);
            if (!recipe) {
              stockWarnings.push(`${item.name}: combo component recipe missing (${productId})`);
              console.warn('Combo component recipe missing; inventory not deducted:', productId);
              continue;
            }
            const portionScale = componentSize === 'Small' ? 0.35 :
              componentSize === 'Medium' ? 0.60 : 1;
            const units = (comp.quantity || 1) * item.quantity;
            const yieldQty = recipe.yieldQuantity || 1;
            for (const [ingredientIndex, ingredient] of recipe.ingredients.entries()) {
              if (!ingredient.inventoryItemId) continue;
              const qty = ingredient.quantity * units * portionScale / yieldQty;
              await inventoryService.recordTransaction({
                idempotencyKey: `combo_${order.id}_${cartIndex}_${componentIndex}_${ingredientIndex}`,
                itemId: ingredient.inventoryItemId,
                type: 'STOCK_OUT',
                quantity: qty,
                referenceId: order.id,
                notes: `POS Combo (${order.orderNumber}): ${product?.name || productId} ${componentSize}`,
                unitCost: ingredient.costPerUnit || 0,
                totalCost: (ingredient.costPerUnit || 0) * qty,
                performedBy: 'System'
              }).catch(e => { console.error('Combo ingredient deduction failed:', e); stockWarnings.push(`${item.name}: ${ingredient.itemName || ingredient.inventoryItemId}`); });
            }
          }
        }
      }

      // 2. Push to KDS Ticket
      let kitchenWarning: string | null = null;
      try {
        await kdsService.createTicket({
          orderId: order.id,
          orderNumber: order.orderNumber,
          type: orderType,
          tableNumber: orderType === 'DINE_IN' ? tableNumber : undefined,
          customerName: customerName.trim() || undefined,
          status: 'NEW',
          priority: 'NORMAL',
          targetTime: new Date(Date.now() + 20 * 60000).toISOString(),
          items: cart.map((item, idx) => ({
            id: `ti_${order.id}_${idx}`,
            productId: item.productId,
            productName: item.selectedOption 
              ? `${item.name} (${item.selectedOption})`
              : (item.size && item.size !== 'Standard' ? `${item.name} — ${item.size}` : item.name),
            size: item.size,
            quantity: item.quantity,
            modifiers: [
              ...(item.selectedOption ? [item.selectedOption] : []),
              ...(item.notes ? [`Note: ${item.notes}`] : [])
            ],
            notes: item.notes || orderNotes || undefined,
            stationId: 'st_1',
            status: 'PENDING'
          }))
        });
      } catch (kdsErr) {
        console.error('Paid order needs manual kitchen attention:', order.orderNumber, kdsErr);
        kitchenWarning = `Order ${order.orderNumber} was saved and paid, but its kitchen ticket was NOT confirmed. Notify the kitchen manually and retry ticket dispatch before preparing another bill.`;
      }

      // Update order history
      const updatedHistory = [order, ...get().ordersHistory];

      set({ 
        cart: [], 
        orderNotes: '',
        customerName: '',
        customerPhone: '',
        discount: null,
        loading: false, 
        lastCompletedOrder: order,
        error: [kitchenWarning, stockWarnings.length ? `Paid order ${order.orderNumber}: ${stockWarnings.length} inventory issue(s). Review stock movements before closing. ${stockWarnings.join('; ')}` : null].filter(Boolean).join(' | ') || null,
        ordersHistory: updatedHistory
      });

      return order;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  checkout: async () => {
    const { cart } = get();
    if (cart.length === 0) return;
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    return get().completeCheckout({
      method: 'CASH',
      details: {
        method: 'CASH',
        cashTendered: total,
        changeDue: 0
      }
    });
  },

  loadOrdersHistory: async () => {
    set({ ordersLoading: true, ordersError: null });
    try {
      const orders = await posService.getOrders();
      set({ ordersHistory: orders, ordersLoading: false });
    } catch (err: any) {
      set({ ordersLoading: false, ordersError: 'Could not load order history: ' + err.message });
    }
  },

  cancelOrder: async (orderId: string, reason: string) => {
    try {
      await posService.updateOrderStatus(orderId, 'CANCELLED', reason);
      const updated = get().ordersHistory.map(o => 
        o.id === orderId ? { ...o, status: 'CANCELLED' as const, voidReason: reason } : o
      );
      set({ ordersHistory: updated });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  }
}));
