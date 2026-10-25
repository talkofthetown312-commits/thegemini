import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChefHat, ClipboardList, CreditCard, Download, Lock, LogOut, Package, Plus, RefreshCw, ShieldCheck, ShoppingCart, UserPlus } from 'lucide-react';
import { INITIAL_MENU_ITEMS } from '../features/pos/data/menuData';
import {
  enrollOwner, exportFreshBackup, getLocalSession, loadFreshLedger, lockLocalSession,
  placeLocalOrder, priceDraft, recordCashReceived, recordStockCount,
  registerLocalStaff, unlockLocal, updateKitchen,
  type ActiveStaff, type DraftLine, type FreshLedger, type KitchenState
} from './localEngine';
import type { OrderType } from '../features/pos/models/pos';

type Page = 'OVERVIEW' | 'POS' | 'KITCHEN' | 'INVENTORY' | 'STAFF';
const money = (n: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
}).format(n);
const panel = 'rounded-2xl border border-[#ecd8dc] bg-white p-4 shadow-sm';
const field = 'w-full rounded-xl border border-[#dac4c8] bg-white px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800000]';
const button = 'rounded-xl bg-[#800000] px-4 py-3 font-semibold text-white disabled:opacity-40';
const quietButton = 'rounded-xl border border-[#800000] px-4 py-3 font-semibold text-[#800000]';
const errorText = (err: unknown) => err instanceof Error ? err.message : String(err);
const isOwner = (staff: ActiveStaff) => staff.role === 'OWNER';

function InitialAccess({ onSetup, onUnlock, configured, busy, error }: {
  configured: boolean; busy: boolean; error: string;
  onSetup: (name: string, pin: string) => Promise<void>;
  onUnlock: (pin: string) => Promise<void>;
}) {
  const [name, setName] = useState('Owner');
  const [pin, setPin] = useState('');
  const [verify, setVerify] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured && pin !== verify) return;
    if (configured) await onUnlock(pin);
    else await onSetup(name, pin);
    setPin('');
    setVerify('');
  };
  return <div className="flex min-h-screen items-center justify-center bg-[#fbf6f7] p-5">
    <div className={panel + ' w-full max-w-md space-y-5'}>
      <div className="flex items-center gap-3 text-[#800000]">
        <ShieldCheck className="h-9 w-9" />
        <div><h1 className="text-2xl font-black">TalkOS · Fresh</h1>
          <p className="text-sm text-slate-600">Offline restaurant system · This device</p></div>
      </div>
      <div className="rounded-xl bg-[#fdf0f2] p-3 text-sm text-[#800000]">
        {configured
          ? 'Enter your locally enrolled staff PIN. Firebase and Google are not required.'
          : 'First launch: enroll a new owner PIN. No default PINs or demo accounts are installed.'}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form className="space-y-4" onSubmit={submit}>
        {!configured && <label className="block space-y-1 text-sm font-medium">Owner name
          <input className={field} value={name} onChange={e => setName(e.target.value)} required maxLength={80} />
        </label>}
        <label className="block space-y-1 text-sm font-medium">{configured ? 'Staff PIN' : 'Choose private owner PIN (6–10 digits)'}
          <input className={field + ' text-center text-2xl tracking-widest'}
            type="password" inputMode="numeric" autoComplete="off" minLength={6} maxLength={10}
            pattern="[0-9]{6,10}" value={pin} required
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
        </label>
        {!configured && <label className="block space-y-1 text-sm font-medium">Confirm owner PIN
          <input className={field} type="password" inputMode="numeric" autoComplete="off"
            pattern="[0-9]{6,10}" minLength={6} maxLength={10} required value={verify}
            onChange={e => setVerify(e.target.value.replace(/\D/g, ''))} />
          {verify && verify !== pin && <p className="text-xs text-red-700">PIN entries do not match.</p>}
        </label>}
        <button type="submit" disabled={busy || (!configured && pin !== verify)} className={button + ' w-full'}>
          {busy ? 'Saving securely…' : configured ? 'Unlock TalkOS' : 'Enrol owner and start'}
        </button>
      </form>
      <p className="text-xs text-slate-500">
        PINs are salted and hashed on this device. There is no online account-recovery service.
        Keep a private backup after setup. Uninstalling can erase unsynced local records.
      </p>
    </div>
  </div>;
}

export function FreshTalkOS() {
  const [ledger, setLedger] = useState<FreshLedger | null>(null);
  const [staff, setStaff] = useState<ActiveStaff | null>(getLocalSession());
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState<Page>('OVERVIEW');
  const [cart, setCart] = useState<DraftLine[]>([]);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('TAKEAWAY');
  const [table, setTable] = useState('');
  const [cashAmounts, setCashAmounts] = useState<Record<string, string>>({});
  const [stockAmounts, setStockAmounts] = useState<Record<string, string>>({});
  const [staffName, setStaffName] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffRole, setStaffRole] = useState<'CASHIER' | 'KITCHEN'>('CASHIER');

  useEffect(() => {
    let mounted = true;
    loadFreshLedger().then(data => { if (mounted) setLedger(data); })
      .catch(err => { if (mounted) setError(errorText(err)); })
      .finally(() => { if (mounted) setBooting(false); });
    return () => { mounted = false; };
  }, []);

  const transact = useCallback(async <T,>(action: () => Promise<T>, done?: (result: T) => void) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await action();
      if (done) done(result);
      return result;
    } catch (err) { setError(errorText(err)); return undefined; }
    finally { setBusy(false); }
  }, []);

  const refresh = () => transact(loadFreshLedger, setLedger);
  const setup = async (name: string, pin: string) => {
    await transact(() => enrollOwner(pin, name), async person => {
      setStaff(person); setLedger(await loadFreshLedger()); setPage('OVERVIEW');
    });
  };
  const unlock = async (pin: string) => {
    await transact(() => unlockLocal(pin), async person => {
      setStaff(person); setLedger(await loadFreshLedger()); setPage('OVERVIEW');
    });
  };

  const products = useMemo(() => ledger ? ledger.menu.filter(item =>
    item.active !== false && item.isAvailable && !item.isSubItem
  ) : [], [ledger]);
  const categories = useMemo(() => ['All', ...new Set(products.map(item => item.category))], [products]);
  const filtered = products.filter(item => (category === 'All' || item.category === category) &&
    [item.name, item.category].some(v => v.toLowerCase().includes(query.toLowerCase().trim())));
  let total = 0;
  try { if (ledger && cart.length) total = priceDraft(ledger, cart).total; }
  catch { total = 0; }
  const allOrders = ledger?.orders || [];
  const paidOrders = allOrders.filter(order => order.payment === 'CASH_RECEIVED');
  const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const activeTickets = allOrders.filter(order => order.kitchen !== 'SERVED').length;
  const verifiedStock = ledger?.inventory.filter(item => item.stockVerified).length || 0;

  const addCart = (productId: string, size: DraftLine['size']) => {
    setCart(previous => {
      const existing = previous.findIndex(item => item.productId === productId && item.size === size);
      if (existing < 0) return [...previous, { productId, size, quantity: 1 }];
      return previous.map((item, i) => i === existing
        ? { ...item, quantity: Math.min(100, item.quantity + 1) } : item);
    });
  };
  const changeQuantity = (index: number, diff: number) => {
    setCart(previous => previous.map((item, i) =>
      i === index ? { ...item, quantity: item.quantity + diff } : item
    ).filter(item => item.quantity > 0 && item.quantity <= 100));
  };
  const order = async () => {
    await transact(() => placeLocalOrder(cart, orderType, table), result => {
      setLedger(result); setCart([]); setTable('');
      setNotice('Order ' + result.orders[result.orders.length - 1].number + ' saved locally and sent to this device’s kitchen list.');
      setPage('KITCHEN');
    });
  };
  const cash = async (id: string, due: number) => {
    const tendered = Number(cashAmounts[id] || String(due));
    await transact(() => recordCashReceived(id, tendered), result => {
      setLedger(result); setNotice('Cash receipt recorded in local ledger.');
      setCashAmounts(prev => ({ ...prev, [id]: '' }));
    });
  };
  const status = async (id: string, next: KitchenState) => {
    await transact(() => updateKitchen(id, next), result => {
      setLedger(result); setNotice('Kitchen status saved locally.');
    });
  };
  const count = async (id: string) => {
    const raw = stockAmounts[id];
    if (raw === undefined || raw.trim() === '') { setError('Enter a physical count first.'); return; }
    await transact(() => recordStockCount(id, Number(raw)), result => {
      setLedger(result); setNotice('Physical count recorded. Recipe deductions remain disabled.');
      setStockAmounts(prev => ({ ...prev, [id]: '' }));
    });
  };
  const enrollStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await transact(() => registerLocalStaff(staffName, staffRole, staffPin), result => {
      setLedger(result); setStaffName(''); setStaffPin('');
      setNotice(staffRole + ' PIN enrolled on this device.');
    });
  };
  const downloadBackup = async () => {
    await transact(exportFreshBackup, text => {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'TalkOS-local-private-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice('Private backup saved. Keep this file secure: it includes PIN verifiers and transaction data.');
    });
  };
  const lock = () => { lockLocalSession(); setStaff(null); setCart([]); setError(''); setNotice(''); };
  if (booting) return <div className="flex min-h-screen items-center justify-center bg-[#fdf6f7] text-[#800000]">Opening local TalkOS database…</div>;
  if (!ledger) return <div className="mx-auto max-w-xl space-y-4 p-6">
    <h1 className="text-xl font-bold text-[#800000]">Local storage unavailable</h1>
    <p role="alert" className="text-red-700">{error}</p>
    <p>No fake in-memory orders will be created. This device must support durable IndexedDB storage before using the POS.</p>
    <button className={quietButton} onClick={() => void refresh()}>Try again</button>
  </div>;
  if (!staff) return <InitialAccess configured={ledger.staff.length > 0} busy={busy}
    error={error} onSetup={setup} onUnlock={unlock} />;

  const pages: { id: Page; label: string; icon: React.ElementType; allowed: boolean }[] = [
    { id: 'OVERVIEW', label: 'Overview', icon: BookOpen, allowed: true },
    { id: 'POS', label: 'POS', icon: ShoppingCart, allowed: staff.role !== 'KITCHEN' },
    { id: 'KITCHEN', label: 'Kitchen', icon: ChefHat, allowed: staff.role !== 'CASHIER' },
    { id: 'INVENTORY', label: 'Stock', icon: Package, allowed: true },
    { id: 'STAFF', label: 'Staff', icon: UserPlus, allowed: isOwner(staff) }
  ];
  const canTakeOrder = staff.role === 'OWNER' || staff.role === 'CASHIER';
  const canKitchen = staff.role === 'OWNER' || staff.role === 'KITCHEN';

  return <div className="min-h-screen bg-[#fbf7f8] pb-24 text-slate-900">
    <header className="sticky top-0 z-20 border-b border-[#edd8dc] bg-white p-3 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-black text-[#800000]">Talk of the Town · TalkOS</h1>
          <p className="text-xs text-slate-600">Fresh · OFFLINE · {staff.role} ({staff.name})</p></div>
        <div className="flex items-center gap-2">
          <button className={quietButton + ' flex items-center gap-1 px-3 py-2 text-xs'}
            disabled={busy} onClick={() => void refresh()}><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button className={quietButton + ' flex items-center gap-1 px-3 py-2 text-xs'}
            onClick={lock}><Lock className="h-4 w-4" /> Lock</button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        Single-device local ledger. No Firebase login, remote synchronization, QR payment confirmation,
        or automatic ingredient deduction. Data is stored on this device and may be lost if the app is uninstalled.
      </div>
      {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {page === 'OVERVIEW' && <div className="space-y-4">
        <h2 className="text-2xl font-bold text-[#800000]">Recorded operations</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Paid cash revenue', money(revenue)], ['Recorded orders', String(allOrders.length)],
            ['Kitchen open', String(activeTickets)], ['Verified stock', String(verifiedStock) + ' / 144']
          ].map(([label, value]) =>
            <div className={panel} key={label}><p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-black text-[#800000]">{value}</p></div>)}
        </div>
        <div className={panel}>
          <h3 className="mb-2 font-bold">Pre-opening readiness</h3>
          <p className="text-sm text-slate-600">
            {ledger.menu.filter(item => item.active !== false && !item.isSubItem).length} active source-menu items,
            {' '}{ledger.inventory.length} inventory master IDs and {ledger.stockCounts.length} physical count records
            are saved locally. Order and payment totals come from real entries made on this device only.
          </p>
        </div>
        {isOwner(staff) && <div className={panel + ' space-y-2'}>
          <h3 className="font-bold">Protect your data</h3>
          <p className="text-xs text-slate-600">
            Export a private backup regularly. This contains local orders, menu, inventory and salted PIN verifiers.
          </p>
          <button className={quietButton + ' flex items-center gap-2'} onClick={() => void downloadBackup()}>
            <Download className="h-4 w-4" /> Export private JSON backup
          </button>
        </div>}
      </div>}
      {page === 'POS' && canTakeOrder && <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-[#800000]">New order</h2>
          <input className={field} type="search" aria-label="Search menu" placeholder="Find chowmein, fried rice, chilli…"
            value={query} onChange={e => setQuery(e.target.value)} />
          <div className="flex flex-wrap gap-2">{categories.map(cat =>
            <button key={cat} type="button" onClick={() => setCategory(cat)}
              className={(category === cat ? button : quietButton) + ' px-3 py-2 text-xs'}>{cat}</button>)}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map(product => <div className={panel + ' space-y-2'} key={product.id}>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-xs text-slate-500">{product.category}</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.filter(size => size.active).map(size =>
                  <button key={size.size} type="button" className={quietButton + ' px-3 py-2 text-xs'}
                    onClick={() => addCart(product.id, size.size)}>
                    <Plus className="mr-1 inline h-3 w-3" /> {size.size}: {money(size.price)}
                  </button>)}
              </div>
            </div>)}
          </div>
          {!filtered.length && <p>No matching menu items in the saved source catalogue.</p>}
        </section>
        <section className={panel + ' h-fit space-y-3 lg:sticky lg:top-24'}>
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#800000]"><ShoppingCart className="h-5 w-5" /> Cart</h3>
          {!cart.length && <p className="text-sm text-slate-500">Your cart is empty. No mock orders are loaded.</p>}
          {cart.map((line, index) => {
            const product = ledger.menu.find(item => item.id === line.productId);
            const unit = product?.sizes.find(s => s.size === line.size)?.price || 0;
            return <div key={line.productId + line.size} className="flex items-center justify-between gap-2 border-b py-2 text-sm">
              <div><p className="font-semibold">{product?.name}</p><p className="text-xs text-slate-500">{line.size} · {money(unit)}</p></div>
              <div className="flex items-center gap-2">
                <button className={quietButton + ' px-2 py-1'} aria-label="Remove one" onClick={() => changeQuantity(index, -1)}>−</button>
                <span>{line.quantity}</span>
                <button className={quietButton + ' px-2 py-1'} aria-label="Add one" onClick={() => changeQuantity(index, 1)}>+</button>
              </div>
            </div>;
          })}
          <label className="block text-sm font-medium">Order type
            <select className={field} value={orderType} onChange={e => setOrderType(e.target.value as OrderType)}>
              <option value="TAKEAWAY">Takeaway</option><option value="DINE_IN">Dine-in</option><option value="DELIVERY">Delivery</option>
            </select>
          </label>
          {orderType === 'DINE_IN' && <label className="block text-sm font-medium">Table / pickup identifier
            <input className={field} value={table} maxLength={30} onChange={e => setTable(e.target.value)} required />
          </label>}
          <div className="flex items-center justify-between text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
          <p className="text-xs text-slate-500">
            Placing an order records it locally as UNPAID and creates a kitchen ticket.
            No digital payment or unverified stock deduction is assumed.
          </p>
          <button disabled={!cart.length || busy} className={button + ' w-full'}
            onClick={() => void order()}><ClipboardList className="mr-2 inline h-4 w-4" /> Save order & kitchen ticket</button>
          {cart.length > 0 && <button className={quietButton + ' w-full'}
            onClick={() => setCart([])}>Clear cart</button>}
        </section>
        <section className={panel + ' lg:col-span-2'}>
          <h3 className="mb-3 flex items-center gap-2 font-bold"><CreditCard className="h-5 w-5" /> Unpaid orders</h3>
          {!allOrders.some(order => order.payment === 'UNPAID') && <p className="text-sm text-slate-500">No unpaid orders.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {[...allOrders].reverse().filter(order => order.payment === 'UNPAID').map(item =>
              <div className="rounded-xl border border-[#edd8dc] p-3" key={item.id}>
                <p className="font-semibold">{item.number} · {money(item.total)}</p>
                <p className="text-xs text-slate-500">{item.type} · {item.createdAt}</p>
                <label className="mt-2 block text-xs">Cash received (₹)
                  <input type="number" min={item.total} step="0.01" className={field}
                    placeholder={String(item.total)}
                    value={cashAmounts[item.id] ?? ''}
                    onChange={e => setCashAmounts(prev => ({ ...prev, [item.id]: e.target.value }))} />
                </label>
                <button disabled={busy} className={button + ' mt-2 w-full text-sm'}
                  onClick={() => void cash(item.id, item.total)}>Confirm physical cash received</button>
              </div>)}
          </div>
        </section>
      </div>}
      {page === 'KITCHEN' && canKitchen && <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[#800000]">Kitchen order tickets</h2>
        {!allOrders.length && <div className={panel + ' text-sm text-slate-500'}>No orders have been placed on this device.</div>}
        <div className="grid gap-3 md:grid-cols-2">
          {[...allOrders].reverse().map(order => {
            const next: Record<KitchenState, KitchenState | null> = {
              NEW: 'PREPARING', PREPARING: 'READY', READY: 'SERVED', SERVED: null
            };
            return <div key={order.id} className={panel + ' space-y-2'}>
              <div className="flex items-center justify-between">
                <strong>{order.number}</strong><span className="rounded-full bg-[#fdf0f2] px-3 py-1 text-xs text-[#800000]">{order.kitchen}</span>
              </div>
              <p className="text-xs text-slate-500">{order.type} {order.table ? '· ' + order.table : ''}
                {' '}· {order.payment === 'UNPAID' ? 'Payment not recorded' : 'Cash recorded'}</p>
              {order.items.map((line, idx) => <p key={idx} className="border-b py-1 text-sm">
                {line.quantity} × {line.name} ({line.size})</p>)}
              {next[order.kitchen] && <button className={button + ' w-full'} disabled={busy}
                onClick={() => void status(order.id, next[order.kitchen]!)}>
                Mark {next[order.kitchen]}</button>}
            </div>;
          })}
        </div>
      </section>}
      {page === 'INVENTORY' && <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[#800000]">Inventory master · {ledger.inventory.length}</h2>
        <p className="text-sm text-slate-600">All 144 original items are saved locally. Zero stock is unverified until physically counted.
          Automatic ingredient deduction stays disabled until recipes and portions are approved.</p>
        <input className={field} type="search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search TOT-001, noodles, oil, rice…" />
        <div className="space-y-2">
          {ledger.inventory.filter(item =>
            [item.id, item.name, item.category].some(value => value.toLowerCase().includes(query.toLowerCase().trim()))
          ).map(item => <div key={item.id} className={panel + ' flex flex-wrap items-center justify-between gap-3'}>
            <div className="min-w-[140px] flex-1">
              <p className="text-xs font-semibold text-[#800000]">{item.id} · {item.category}</p>
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-slate-600">{item.stockVerified ? 'Physically verified' : 'Opening stock NOT verified'}
                {' '}· {item.currentStock} {item.unit}</p>
            </div>
            {isOwner(staff) && <div className="flex w-full gap-2 sm:w-auto">
              <input type="number" min="0" step="any" placeholder={'Count (' + item.unit + ')'}
                className={field + ' min-w-0 max-w-44'} value={stockAmounts[item.id] ?? ''}
                onChange={e => setStockAmounts(prev => ({ ...prev, [item.id]: e.target.value }))} />
              <button className={button + ' whitespace-nowrap px-3'} disabled={busy} onClick={() => void count(item.id)}>Record</button>
            </div>}
          </div>)}
        </div>
      </section>}
      {page === 'STAFF' && isOwner(staff) && <section className="grid gap-4 md:grid-cols-2">
        <div className={panel + ' space-y-3'}>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#800000]"><UserPlus className="h-5 w-5" /> Add staff PIN</h2>
          <p className="text-sm text-slate-600">Each staff member must use a different 6–10 digit PIN. No default or shared owner PIN.</p>
          <form className="space-y-3" onSubmit={e => void enrollStaff(e)}>
            <label className="block text-sm font-medium">Staff name<input className={field} required maxLength={80}
              value={staffName} onChange={e => setStaffName(e.target.value)} /></label>
            <label className="block text-sm font-medium">Staff role
              <select className={field} value={staffRole} onChange={e => setStaffRole(e.target.value as 'CASHIER' | 'KITCHEN')}>
                <option value="CASHIER">Cashier · POS</option><option value="KITCHEN">Kitchen · Tickets</option>
              </select></label>
            <label className="block text-sm font-medium">Private PIN
              <input className={field} type="password" inputMode="numeric" autoComplete="off"
                pattern="[0-9]{6,10}" minLength={6} maxLength={10} required value={staffPin}
                onChange={e => setStaffPin(e.target.value.replace(/\D/g, ''))} /></label>
            <button className={button + ' w-full'} disabled={busy}>Create staff PIN</button>
          </form>
        </div>
        <div className={panel + ' space-y-3'}>
          <h2 className="text-xl font-bold text-[#800000]">This device's staff</h2>
          {ledger.staff.map(item => <div key={item.id} className="flex items-center justify-between border-b py-2 text-sm">
            <span>{item.name}</span><span className="font-semibold text-[#800000]">{item.role}</span>
          </div>)}
          <button className={quietButton + ' flex items-center gap-2'} onClick={() => void downloadBackup()}>
            <Download className="h-4 w-4" /> Export private backup
          </button>
        </div>
      </section>}
    </main>
    <nav aria-label="Local TalkOS navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#edd8dc] bg-white p-2">
      <div className="mx-auto flex max-w-6xl items-center justify-around gap-1">
        {pages.filter(item => item.allowed).map(item => <button key={item.id} type="button" onClick={() => {
          setPage(item.id); setError(''); setNotice(''); setQuery('');
        }} className={(page === item.id ? 'bg-[#800000] text-white' : 'text-[#800000]') +
          ' flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 py-2 text-[11px] font-bold'}>
          <item.icon className="mb-1 h-5 w-5" /> {item.label}
        </button>)}
        <button className="flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 py-2 text-[11px] font-bold text-[#800000]"
          onClick={lock}><LogOut className="mb-1 h-5 w-5" /> Lock</button>
      </div>
    </nav>
  </div>;
}

export default FreshTalkOS;
