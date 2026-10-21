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
