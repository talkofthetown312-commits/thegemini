import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, ItemSize } from '../models/pos';
import { posService } from '../services/posService';

const sizes: ItemSize[] = ['Small', 'Medium', 'Large', 'Standard'];
const blank = (): Product => ({
  id: '', name: '', category: '', price: 0, isAvailable: true, active: true,
  sizes: [{ item_id: '', size: 'Standard', price: 0, active: true }]
});

export function MenuManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reload = async () => {
    const items = await posService.getAllProducts();
    setProducts(items);
  };
  useEffect(() => { reload().catch(e => setError(String(e))); }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = { ...editing, price: editing.sizes[0]?.price ?? editing.price };
      if (data.id) await posService.updateProduct(data);
      else await posService.addProduct((({ id, ...rest }) => rest)(data));
      setEditing(null);
      await reload();
      setNotice('Menu item saved.');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const availability = async (item: Product) => {
    setBusy(true); setError('');
    try {
      await posService.setProductAvailability(item.id, !item.isAvailable);
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const field = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white';
  return <div className="p-5 space-y-5 text-slate-900 dark:text-white">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div><h1 className="text-2xl font-bold">Menu Management</h1><p className="text-sm text-slate-500">Manage products, prices and availability for your POS.</p></div>
      <div className="flex gap-2"><Link to="/pos" className="rounded-lg border px-4 py-2">Back to POS</Link><button onClick={() => setEditing(blank())} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Add product</button></div>
    </div>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {notice && <p role="status" className="text-green-600">{notice}</p>}
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm"><thead className="bg-slate-100 dark:bg-slate-800"><tr><th className="p-3 text-left">Product</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Prices</th><th className="p-3 text-left">Availability</th><th className="p-3">Actions</th></tr></thead>
      <tbody>{products.map(p => <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700"><td className="p-3 font-medium">{p.name}</td><td className="p-3">{p.category}</td><td className="p-3">{(p.sizes || []).map(s => s.size + ': ₹' + s.price).join(', ')}</td><td className="p-3">{p.isAvailable ? 'Available' : 'Unavailable'}</td><td className="p-3 text-center"><button className="mr-3 text-indigo-600" onClick={() => setEditing({ ...p, sizes: p.sizes.map(s => ({...s})) })}>Edit</button><button disabled={busy} className="text-amber-700 disabled:opacity-50" onClick={() => availability(p)}>{p.isAvailable ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table>
      {products.length === 0 && <p className="p-5 text-slate-500">No products configured. Add your first menu item.</p>}
    </div>
    {editing && <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center"><form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
      <h2 className="text-xl font-bold">{editing.id ? 'Edit product' : 'New product'}</h2>
      <label className="block">Product name<input required className={field} value={editing.name} onChange={e => setEditing({...editing, name:e.target.value})}/></label>
      <label className="block">Category<input required className={field} value={editing.category} onChange={e => setEditing({...editing, category:e.target.value})}/></label>
      <fieldset className="space-y-3"><legend className="font-semibold">Sizes and prices</legend>
        {editing.sizes.map((size, index) => <div key={index} className="flex flex-wrap items-center gap-2">
          <select aria-label="Size" className={field + ' flex-1'} value={size.size} onChange={e => setEditing({...editing,sizes:editing.sizes.map((s,i)=>i===index?{...s,size:e.target.value as ItemSize}:s)})}>{sizes.map(s=><option key={s}>{s}</option>)}</select>
          <input aria-label="Price" type="number" min="0" step="0.01" required className={field + ' flex-1'} value={size.price} onChange={e=>setEditing({...editing,sizes:editing.sizes.map((s,i)=>i===index?{...s,price:Number(e.target.value)}:s)})}/>
          <button type="button" disabled={editing.sizes.length===1} onClick={()=>setEditing({...editing,sizes:editing.sizes.filter((_,i)=>i!==index)})}>Remove</button>
        </div>)}
        <button type="button" className="text-indigo-600" onClick={()=>{const next=sizes.find(s=>!editing.sizes.some(v=>v.size===s));if(next)setEditing({...editing,sizes:[...editing.sizes,{item_id:editing.id,size:next,price:0,active:true}]});}}>+ Add size</button>
      </fieldset>
      <div className="flex justify-end gap-3"><button type="button" className="px-4 py-2" onClick={()=>setEditing(null)}>Cancel</button><button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 disabled:opacity-50">{busy?'Saving...':'Save product'}</button></div>
    </form></div>}
  </div>;
}
