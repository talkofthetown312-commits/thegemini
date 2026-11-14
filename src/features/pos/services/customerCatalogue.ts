import type { Product, MenuItemSize } from '../models/pos';

/** Customer records are authoritative; built-in menu is only an offline demo fallback. */
export function visibleCustomerProducts(products: Product[]): Product[] {
  return products.filter(product => product.active !== false && product.isAvailable !== false && !product.isSubItem);
}
export function sizesForCustomerProduct(product: Product): MenuItemSize[] {
  return (product.sizes || []).filter(size => size.active !== false).map(size => ({
    ...size, item_id: product.id
  }));
}

/** Validate customer-entered prices before persisting or offering for sale. */
export function validateCustomerProduct(product: Product): void {
  if (!product.id?.trim() || !product.name?.trim() || !product.category?.trim()) {
    throw new Error('Product ID, name and category are required.');
  }
  if (!Number.isFinite(product.price) || product.price < 0) {
    throw new Error('Product price must be a nonnegative number.');
  }
  if (!Array.isArray(product.sizes) || product.sizes.length === 0) {
    throw new Error('At least one size is required.');
  }
  const sizes = new Set<string>();
  for (const size of product.sizes) {
    if (sizes.has(size.size)) throw new Error('Duplicate product size: ' + size.size);
    sizes.add(size.size);
    if (!Number.isFinite(size.price) || size.price < 0) {
      throw new Error('Invalid price for size ' + size.size);
    }
  }
}
