import type { Product } from '../models/pos';

/** Restored Talk of the Town menu artwork, extracted from the original menu poster.
 * Images are packaged inside the Android APK and never fetched from an unrelated stock-photo provider.
 */
export function photoForProduct(product: Product): string | null {
  if (product.imageUrl?.trim()) return product.imageUrl;
  const name = product.name.toLowerCase();
  if (name.includes('chowmein') || name.includes('noodle')) return '/food/chowmein.jpg';
  if (name.includes('fried rice') || name.includes('rice')) return '/food/fried-rice.jpg';
  if (name.includes('pork') && (name.includes('chilly') || name.includes('chilli'))) return '/food/pork-chilly.jpg';
  if (name.includes('chicken') && (name.includes('chilly') || name.includes('chilli'))) return '/food/chicken-chilly.jpg';
  if (name.includes('lassi')) return '/food/lassi.jpg';
  if (name.includes('momo')) return '/food/momo.jpg';
  if (name.includes('juice') || name.includes('tea') || name.includes('coffee') || name.includes('shake')) return '/food/beverages.jpg';
  return null;
}
