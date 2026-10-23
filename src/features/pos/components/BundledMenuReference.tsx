import React, { useMemo, useState } from 'react';
import { INITIAL_MENU_ITEMS } from '../data/menuData';

/**
 * Read-only source-controlled restaurant menu reference.
 *
 * Never treat this fallback as successfully loaded Firestore data: it must not
 * enter the POS cart, change availability, create orders, or overwrite records.
 */
export function BundledMenuReference() {
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const products = useMemo(() => INITIAL_MENU_ITEMS.filter(item => {
    if (!showInactive && (item.active === false || item.isSubItem)) return false;
    const term = search.trim().toLowerCase();
    return !term || [item.id, item.name, item.category].some(v => v.toLowerCase().includes(term));
  }), [search, showInactive]);

  return (
    <section aria-label="Bundled menu reference" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div>
        <h2 className="text-lg font-bold text-[#800000]">Saved TalkOS menu reference</h2>
        <p className="text-sm text-amber-950">
          These are the restaurant products and size prices bundled with the APK,
          not a live read of your Firestore menu. Any edits made in the database
          after this APK was built may be different. Viewing is safe; checkout
          and menu changes require restored database access.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          type="search" aria-label="Search menu reference" placeholder="Search your saved menu"
          value={search} onChange={event => setSearch(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-amber-950">
          <input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />
          Show archived items
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
        <table className="w-full min-w-[390px] text-left text-sm">
          <thead className="bg-amber-100 text-amber-950">
            <tr><th className="p-3">Product</th><th className="p-3">Sizes / prices</th><th className="p-3">In APK</th></tr>
          </thead>
          <tbody>
            {products.map(item => (
              <tr key={item.id} className="border-t border-amber-100">
                <td className="p-3">
                  <span className="font-semibold text-slate-900">{item.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.category}</span>
                </td>
                <td className="p-3 text-slate-800">
                  {(item.sizes || []).map(size => `${size.size}: ₹${size.price}`).join(' · ')}
                </td>
                <td className="p-3 text-xs text-slate-500">
                  {item.active === false ? 'Archived' : 'Listed'}
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={3} className="p-4 text-center">No items match that search.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
