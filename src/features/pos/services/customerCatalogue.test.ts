import { describe, expect, it } from 'vitest';
import { sizesForCustomerProduct, visibleCustomerProducts, validateCustomerProduct } from './customerCatalogue';
import type { Product } from '../models/pos';
const product: Product = {
  id: 'customer_dish', name: 'Customer Dish', category: 'Mains', price: 100,
  isAvailable: true, active: true,
  sizes: [{ item_id: 'wrong', size: 'Standard', price: 100, active: true }]
};
describe('customer POS catalogue', () => {
  it('includes customer-created products, not only released demo IDs', () => {
    expect(visibleCustomerProducts([product])).toEqual([product]);
  });
  it('excludes inactive and unavailable products', () => {
    expect(visibleCustomerProducts([{ ...product, active: false }, { ...product, isAvailable: false }])).toEqual([]);
  });
  it('uses customer sizes and correct parent product ID', () => {
    expect(sizesForCustomerProduct(product)).toEqual([{ item_id: 'customer_dish', size: 'Standard', price: 100, active: true }]);
  });
  it('keeps empty customer menu empty', () => {
    expect(visibleCustomerProducts([])).toEqual([]);
  });
});

describe('customer menu input validation', () => {
  it('accepts a correctly priced menu item', () => {
    expect(() => validateCustomerProduct(product)).not.toThrow();
  });
  it('rejects invalid price, missing size and duplicate sizes', () => {
    expect(() => validateCustomerProduct({ ...product, price: -1 })).toThrow();
    expect(() => validateCustomerProduct({ ...product, sizes: [] })).toThrow();
    expect(() => validateCustomerProduct({ ...product, sizes: [product.sizes[0], product.sizes[0]] })).toThrow();
  });
});
