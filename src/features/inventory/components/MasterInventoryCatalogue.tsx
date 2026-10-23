import React, { useMemo, useState } from 'react';
import { MASTER_INVENTORY } from '../data/masterInventory';
import { Search } from 'lucide-react';

/**
 * Always-visible, read-only copy of the approved 144 master catalogue records.
 * This is NOT a live stock ledger and it never writes to the database.
 */
export function MasterInventoryCatalogue({ savedIds, itemsLoaded }: {
  savedIds: Set<string>;
  itemsLoaded: boolean;
}) {
  const [term, setTerm] = useState('');
  const filtered = useMemo(() => MASTER_INVENTORY.filter(item =>
    [item.id, item.name, item.category, item.unit].some(value =>
      value.toLowerCase().includes(term.trim().toLowerCase())
    )
  ), [term]);
  const countInDatabase = MASTER_INVENTORY.filter(item => savedIds.has(item.id)).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#ebd5da] bg-white p-4">
        <h2 className="font-bold text-[#800000]">Talk of the Town master inventory · 144 items</h2>
        <p className="mt-1 text-sm text-slate-600">
          The original approved catalogue is preserved in this app. It is read-only;
          the zero balances in its source file are placeholders, not verified live stock.
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          {itemsLoaded
            ? `${countInDatabase} of 144 master IDs found in the connected inventory_items collection.`
            : 'Database import status cannot be verified because inventory_items could not be read.'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Use “Item Master” for saved database items and recorded stock balances.
          Missing records must be checked before any import; existing records will not be overwritten.
        </p>
      </div>
      <label className="relative block max-w-md">
        <span className="sr-only">Search master inventory</span>
        <Search className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
        <input
          type="search" value={term} onChange={event => setTerm(event.target.value)}
          placeholder="Search by TOT code, item or category"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm"
        />
      </label>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Master ID</th>
              <th className="px-4 py-3">Item name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Database status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-[#800000]">{item.id}</td>
                <td className="px-4 py-3 text-slate-900">{item.name}</td>
                <td className="px-4 py-3 text-slate-600">{item.category}</td>
                <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {!itemsLoaded ? 'Not verified' : savedIds.has(item.id) ? 'Saved in database' : 'Not found in connected database'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">No matching master items.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
