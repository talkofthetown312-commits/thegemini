import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { MASTER_INVENTORY } from '../data/masterInventory';

/**
 * Android-only read-only inventory snapshot. This route never reads or writes
 * Firestore, and it does not grant authentication or staff permissions.
 * Actual stock, costs, edits and imports remain protected behind staff login.
 */
export function OfflineInventoryPage() {
  const [filter, setFilter] = useState('');
  const list = useMemo(() => MASTER_INVENTORY.filter(item =>
    [item.id, item.name, item.category, item.unit].some(value =>
      value.toLowerCase().includes(filter.trim().toLowerCase())
    )
  ), [filter]);

  return (
    <div className="min-h-screen bg-[#fdf5f6] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-[#ebd5da] bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link to="/auth" aria-label="Return to sign in"
            className="rounded-lg border border-[#ebd5da] p-2 text-[#800000]"><ArrowLeft className="h-5 w-5" /></Link>
          <BookOpen className="h-6 w-6 text-[#800000]" />
          <div>
            <h1 className="text-lg font-black text-[#800000]">Talk of the Town Inventory</h1>
            <p className="text-xs text-slate-600">144-item master · saved inside this Android APK</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="rounded-xl border border-[#ebd5da] bg-white p-4">
          <p className="text-sm font-semibold text-[#800000]">Offline catalogue — read-only</p>
          <p className="mt-1 text-sm text-slate-600">
            This is the original TOT-001 through TOT-144 list. It is available without
            signing in or connecting to the internet. It is not a live stock report:
            quantities, purchases, selling prices and adjustments require staff login.
          </p>
        </div>
        <label className="relative block">
          <span className="sr-only">Search inventory</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input type="search" value={filter} onChange={event => setFilter(event.target.value)}
            placeholder="Search TOT-001, Chicken, category…"
            className="w-full rounded-lg border border-[#ebd5da] bg-white py-2 pl-10 pr-3 text-sm" />
        </label>
        <p aria-live="polite" className="text-xs font-medium text-slate-500">
          Showing {list.length} of {MASTER_INVENTORY.length} saved items
        </p>
        <ul className="space-y-2">
          {list.map(item => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1 font-semibold">{item.name}</span>
                <span className="shrink-0 rounded-md bg-[#fdf5f6] px-2 py-1 font-mono text-xs font-bold text-[#800000]">{item.id}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.category} · {item.unit}</p>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No matching items.</p>}
      </main>
    </div>
  );
}
