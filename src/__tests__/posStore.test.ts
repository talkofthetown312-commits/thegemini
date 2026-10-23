import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePosStore } from '../features/pos/store/posStore';
import { Product } from '../features/pos/models/pos';
import { posService } from '../features/pos/services/posService';
import { kdsService } from '../features/kds/services/kdsService';

describe('POS Store and Cart Management', () => {
  beforeEach(() => {
    usePosStore.setState({
      products: [],
      cart: [],
      loading: false,
      error: null,
      menuError: null,
      ordersError: null,
      lastCompletedOrder: null
    });
  });

  it('keeps menu access failures separate from an order-history failure', async () => {
    const menu = vi.spyOn(posService, 'getProducts').mockRejectedValue(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }));
    const orders = vi.spyOn(posService, 'getOrders').mockRejectedValue(new Error('Order history denied'));
    try {
      await Promise.all([usePosStore.getState().loadProducts(), usePosStore.getState().loadOrdersHistory()]);
      expect(usePosStore.getState().menuError).toContain('menu was denied');
      expect(usePosStore.getState().ordersError).toContain('Order history denied');
      orders.mockResolvedValue([]);
      await usePosStore.getState().loadOrdersHistory();
      expect(usePosStore.getState().ordersError).toBeNull();
      expect(usePosStore.getState().menuError).toContain('menu was denied');
    } finally { menu.mockRestore(); orders.mockRestore(); }
  });

  it('adds items to cart and updates quantities for existing items', () => {
    const product: Product = {
      id: 'prod_chilly_dry',
      name: 'Chicken Chilly Dry',
      price: 250,
      costPrice: 105,
      category: 'Specials',
      isAvailable: true,
      sizes: [
        { item_id: 'prod_chilly_dry', size: 'Standard', price: 250, active: true }
      ]
    };

    usePosStore.getState().addToCart(product, 1);
    expect(usePosStore.getState().cart).toHaveLength(1);
    expect(usePosStore.getState().cart[0].quantity).toBe(1);
    expect(usePosStore.getState().cart[0].name).toBe('Chicken Chilly Dry');
    expect(usePosStore.getState().cart[0].size).toBe('Standard');
    expect(usePosStore.getState().cart[0].price).toBe(250);

    // Add again
    usePosStore.getState().addToCart(product, 2);
    expect(usePosStore.getState().cart).toHaveLength(1);
    expect(usePosStore.getState().cart[0].quantity).toBe(3);
  });

  it('handles multi-size products (Small, Medium, Large) correctly with accurate pricing', () => {
    const chowmein: Product = {
      id: 'prod_chow_chicken',
      name: 'Chicken Chowmein',
      price: 45,
      category: 'Chowmein',
      isAvailable: true,
      sizes: [
        { item_id: 'prod_chow_chicken', size: 'Small', price: 45, active: true },
        { item_id: 'prod_chow_chicken', size: 'Medium', price: 70, active: true },
        { item_id: 'prod_chow_chicken', size: 'Large', price: 105, active: true }
      ]
    };

    // Add Small (₹45)
    usePosStore.getState().addToCart(chowmein, 'Small', undefined, 1);
    // Add Medium (₹70)
    usePosStore.getState().addToCart(chowmein, 'Medium', undefined, 2);
    // Add Large (₹105)
    usePosStore.getState().addToCart(chowmein, 'Large', undefined, 1);

    const cart = usePosStore.getState().cart;
    expect(cart).toHaveLength(3);

    const smallItem = cart.find(i => i.size === 'Small');
    const mediumItem = cart.find(i => i.size === 'Medium');
    const largeItem = cart.find(i => i.size === 'Large');

    expect(smallItem?.price).toBe(45);
    expect(smallItem?.quantity).toBe(1);

    expect(mediumItem?.price).toBe(70);
    expect(mediumItem?.quantity).toBe(2);

    expect(largeItem?.price).toBe(105);
    expect(largeItem?.quantity).toBe(1);
  });

  it('bills combo meals as a single line item at combo price', () => {
    const signatureCombo: Product = {
      id: 'prod_combo_signature',
      name: 'Signature Combo',
      price: 110,
      category: 'Combo Meals',
      isAvailable: true,
      isCombo: true,
      comboDescription: 'Medium Chowmein OR Fried Rice (Chicken) + Chilly Chicken Bites',
      sizes: [
        { item_id: 'prod_combo_signature', size: 'Standard', price: 110, active: true }
      ],
      comboComponents: [
        {
          itemId: 'choice_sig_base',
          name: 'Medium Chicken Chowmein or Fried Rice',
          quantity: 1,
          isChoice: true,
          options: [
            { itemId: 'prod_chow_chicken', name: 'Medium Chicken Chowmein', size: 'Medium' },
            { itemId: 'prod_fr_chicken', name: 'Medium Chicken Fried Rice', size: 'Medium' }
          ]
        },
        { itemId: 'prod_chilly_bites', name: 'Chilly Chicken Bites', size: 'Standard', quantity: 1 }
      ]
    };

    usePosStore.getState().addToCart(signatureCombo, 'Standard', 'Medium Chicken Chowmein', 1);

    const cart = usePosStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].name).toBe('Signature Combo');
    expect(cart[0].price).toBe(110);
    expect(cart[0].selectedOption).toBe('Medium Chicken Chowmein');
    expect(cart[0].isCombo).toBe(true);
    expect(cart[0].comboComponents).toHaveLength(2);
  });

  it('removes item from cart and clears cart', () => {
    const product1: Product = { 
      id: 'p1', 
      name: 'Item 1', 
      price: 100, 
      category: 'Food', 
      isAvailable: true,
      sizes: [{ item_id: 'p1', size: 'Standard', price: 100, active: true }]
    };
    const product2: Product = { 
      id: 'p2', 
      name: 'Item 2', 
      price: 200, 
      category: 'Food', 
      isAvailable: true,
      sizes: [{ item_id: 'p2', size: 'Standard', price: 200, active: true }]
    };

    usePosStore.getState().addToCart(product1, 1);
    usePosStore.getState().addToCart(product2, 1);
    expect(usePosStore.getState().cart).toHaveLength(2);

    const item1 = usePosStore.getState().cart[0];
    usePosStore.getState().removeFromCart(item1.cartItemId || item1.productId);
    expect(usePosStore.getState().cart).toHaveLength(1);
    expect(usePosStore.getState().cart[0].productId).toBe('p2');

    usePosStore.getState().clearCart();
    expect(usePosStore.getState().cart).toHaveLength(0);
  });

  it('applies discounts and handles complete checkout with payment methods', async () => {
    vi.spyOn(posService, 'createOrder').mockImplementation(async (data: any) => ({
      ...data,
      id: 'ord_test_123',
      orderNumber: 'ORD-99999',
      createdAt: new Date().toISOString()
    }));
    vi.spyOn(kdsService, 'createTicket').mockImplementation(async (data: any) => ({
      ...data,
      id: 't_test_123',
      createdAt: new Date().toISOString()
    }));

    const product: Product = {
      id: 'prod_fr_veg',
      name: 'Veg Fried Rice',
      price: 60,
      category: 'Fried Rice',
      isAvailable: true,
      sizes: [
        { item_id: 'prod_fr_veg', size: 'Large', price: 60, active: true }
      ]
    };

    usePosStore.getState().addToCart(product, 'Large', undefined, 2); // 2 * 60 = 120
    usePosStore.getState().setOrderType('DINE_IN');
    usePosStore.getState().setTableNumber('Table 4');
    usePosStore.getState().setCustomerName('Rahul Sharma');
    usePosStore.getState().setCustomerPhone('9876543210');

    // Apply 10% discount: 120 - 12 = 108
    usePosStore.getState().applyDiscount('PERCENTAGE', 10, '10% OFF');
    expect(usePosStore.getState().discount?.value).toBe(10);

    const order = await usePosStore.getState().completeCheckout({
      method: 'CASH',
      details: {
        method: 'CASH',
        cashTendered: 200,
        changeDue: 86.6 // 108 + 5% GST (5.40) = 113.40, 200 - 113.40 = 86.60
      }
    });

    expect(order.subtotal).toBe(120);
    expect(order.discountAmount).toBe(12);
    expect(order.tax).toBeCloseTo(5.4, 1);
    expect(order.total).toBeCloseTo(113.4, 1);
    expect(order.orderType).toBe('DINE_IN');
    expect(order.tableNumber).toBe('Table 4');
    expect(order.customerName).toBe('Rahul Sharma');
    expect(order.paymentMethod).toBe('CASH');
    expect(order.status).toBe('PAID');
    expect(usePosStore.getState().cart).toHaveLength(0);
  });

  it('supports parking an order and recalling it later', () => {
    const product: Product = {
      id: 'prod_pork_chow',
      name: 'Pork Chowmein',
      price: 90,
      category: 'Chowmein',
      isAvailable: true,
      sizes: [
        { item_id: 'prod_pork_chow', size: 'Medium', price: 90, active: true }
      ]
    };

    usePosStore.getState().addToCart(product, 'Medium', undefined, 1);
    usePosStore.getState().setTableNumber('Table 2');
    expect(usePosStore.getState().cart).toHaveLength(1);

    // Park current order
    usePosStore.getState().parkCurrentOrder('Table 2 - Waiting for friend');
    expect(usePosStore.getState().cart).toHaveLength(0);
    expect(usePosStore.getState().parkedOrders).toHaveLength(1);
    expect(usePosStore.getState().parkedOrders[0].label).toBe('Table 2 - Waiting for friend');

    // Recall order
    const parkedId = usePosStore.getState().parkedOrders[0].id;
    usePosStore.getState().recallParkedOrder(parkedId);
    expect(usePosStore.getState().cart).toHaveLength(1);
    expect(usePosStore.getState().cart[0].name).toBe('Pork Chowmein');
    expect(usePosStore.getState().tableNumber).toBe('Table 2');
    expect(usePosStore.getState().parkedOrders).toHaveLength(0);
  });
});
