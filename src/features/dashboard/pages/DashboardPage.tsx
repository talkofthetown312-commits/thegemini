import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase/firebaseConfig';
import { useAuth } from '../../../core/auth/AuthContext';
import { QuickActions } from '../components/QuickActions';
import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/components/ui/Card';
import { RefreshCw, AlertTriangle, ChefHat, Package, Receipt, Activity } from 'lucide-react';

type ReadState<T> = { loading: boolean; records: T[] | null; error: string | null };
type OrderRecord = {
  id: string; orderNumber?: string; status?: string; total?: number;
  createdAt?: unknown; customerName?: string; orderType?: string;
};
type KitchenRecord = {
  id: string; orderNumber?: string; status?: string; targetTime?: unknown;
  createdAt?: unknown; completedAt?: unknown; acceptedAt?: unknown;
};
type StockRecord = {
  id: string; name?: string; currentStock?: number; reorderLevel?: number;
  minimumStock?: number; unit?: string; status?: string; stockVerified?: boolean;
};

function emptyState<T>(): ReadState<T> {
  return { loading: true, records: null, error: null };
}

function dateFrom(value: unknown): Date | null {
  if (!value) return null;
  const timestamp = value as { toDate?: () => Date };
  const candidate = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(value as string);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function imphalDate(value: unknown): string | null {
  const date = dateFrom(value);
  return date ? new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date) : null;
}

const money = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
}).format(amount);

function ReadNotice({ state, empty }: { state: ReadState<unknown>; empty: string }) {
  if (state.loading) return <p className="text-sm text-slate-500">Reading restaurant records…</p>;
  if (state.error) return <p className="text-sm text-red-700">Records unavailable: {state.error}</p>;
  if (!state.records?.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return null;
}

export function DashboardPage() {
  const { profile, hasRole } = useAuth();
  const [orders, setOrders] = useState<ReadState<OrderRecord>>(emptyState);
  const [tickets, setTickets] = useState<ReadState<KitchenRecord>>(emptyState);
  const [inventory, setInventory] = useState<ReadState<StockRecord>>(emptyState);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    if (!db) {
      const message = 'Database connection is not configured';
      setOrders({ loading: false, records: null, error: message });
      setTickets({ loading: false, records: null, error: message });
      setInventory({ loading: false, records: null, error: message });
      return;
    }
    setOrders(emptyState());
    setTickets(emptyState());
    setInventory(emptyState());
    async function readRecords<T extends { id: string }>(
      name: string, setResult: React.Dispatch<React.SetStateAction<ReadState<T>>>
    ) {
      try {
        const snapshot = await getDocs(collection(db, name));
        if (active) setResult({ loading: false, records: snapshot.docs.map(item => ({
          ...item.data(), id: item.id
        } as T)), error: null });
      } catch (error) {
        if (active) setResult({
          loading: false, records: null,
          error: error instanceof Error ? error.message : 'Could not read records'
        });
      }
    }
    void Promise.all([
      readRecords<OrderRecord>('pos_orders', setOrders),
      readRecords<KitchenRecord>('tickets', setTickets),
      readRecords<StockRecord>('inventory_items', setInventory)
    ]);
    return () => { active = false; };
  }, [refreshKey]);

  const today = imphalDate(new Date());
  const paidToday = useMemo(() => (orders.records || []).filter(order =>
    order.status === 'PAID' && imphalDate(order.createdAt) === today
  ), [orders.records, today]);
  const todayRevenue = paidToday.reduce((sum, order) => sum + (
    Number.isFinite(order.total) ? Number(order.total) : 0
  ), 0);
  const activeTickets = (tickets.records || []).filter(ticket =>
    ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(ticket.status || '')
  );
  const overdueTickets = activeTickets.filter(ticket => {
    const target = dateFrom(ticket.targetTime);
    return target && target.getTime() < Date.now() && ticket.status !== 'READY';
  });
  const stockAlerts = (inventory.records || []).filter(item =>
    item.stockVerified !== false &&
    item.status !== 'INACTIVE' &&
    Number.isFinite(item.currentStock) &&
    Number.isFinite(item.reorderLevel) &&
    Number(item.currentStock) <= Number(item.reorderLevel)
  );
  const recentOrders = [...(orders.records || [])]
    .sort((a, b) => (dateFrom(b.createdAt)?.getTime() || 0) - (dateFrom(a.createdAt)?.getTime() || 0))
    .slice(0, 5);

  const canSeeSales = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'].some(hasRole);
  const canSeeKitchen = ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN'].some(hasRole);
  const canSeeInventory = ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY'].some(hasRole);

  return (
    <div className="space-y-6 text-[#800000]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome, {profile?.displayName?.split(' ')[0] || 'Staff'}</h1>
          <p className="text-sm text-slate-600">Talk of the Town · Imphal · Recorded restaurant data only</p>
          {import.meta.env.VITE_FIREBASE_PROJECT_ID === 'talkos-staging-default' && (
            <p className="mt-1 text-xs font-bold text-amber-800">STAGING — test database, not live restaurant figures</p>
          )}
        </div>
        <button type="button" onClick={() => setRefreshKey(key => key + 1)}
          className="flex items-center gap-2 rounded-lg border border-[#ebd5da] bg-white px-3 py-2 text-sm font-bold">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>
      <QuickActions />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {canSeeSales && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Today's recorded sales</CardTitle></CardHeader>
            <CardContent>
              <ReadNotice state={orders} empty="No orders are recorded in this database." />
              {!orders.loading && !orders.error && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-xl font-bold">{money(todayRevenue)}</p><p className="text-xs text-slate-500">Paid revenue</p></div>
                  <div><p className="text-xl font-bold">{paidToday.length}</p><p className="text-xs text-slate-500">Paid orders</p></div>
                  <div><p className="text-xl font-bold">{paidToday.length ? money(todayRevenue / paidToday.length) : '—'}</p><p className="text-xs text-slate-500">Average ticket</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {canSeeKitchen && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5" /> Kitchen tickets</CardTitle></CardHeader>
            <CardContent>
              <ReadNotice state={tickets} empty="No kitchen tickets are recorded." />
              {!tickets.loading && !tickets.error && (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div><p className="text-2xl font-bold">{activeTickets.length}</p><p className="text-xs text-slate-500">Active tickets</p></div>
                  <div><p className="text-2xl font-bold">{overdueTickets.length}</p><p className="text-xs text-slate-500">Past target time</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {canSeeInventory && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Verified stock alerts</CardTitle></CardHeader>
            <CardContent>
              <ReadNotice state={inventory} empty="No inventory records have been loaded." />
              {!inventory.loading && !inventory.error && (
                <div className="space-y-2">
                  <p className="text-sm">{stockAlerts.length ? stockAlerts.length + ' verified items need attention' : 'No verified low-stock alerts.'}</p>
                  {stockAlerts.slice(0, 6).map(item => (
                    <p key={item.id} className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-700" /> {item.name || item.id}: {item.currentStock} {item.unit || ''}</p>
                  ))}
                  {(inventory.records || []).some(item => item.stockVerified === false) && (
                    <p className="text-xs text-slate-500">Unverified opening stock is excluded from alerts.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Recorded order activity</CardTitle></CardHeader>
          <CardContent>
            <ReadNotice state={orders} empty="No recorded activity yet." />
            <div className="space-y-2">
              {!orders.error && recentOrders.map(order => (
                <div key={order.id} className="flex justify-between gap-3 border-b border-[#ebd5da] py-1 text-sm">
                  <span>{order.orderNumber || order.id} · {order.status || 'Unknown status'}</span>
                  <span>{dateFrom(order.createdAt)?.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) || 'No date'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-slate-500">Staff attendance, task assignments and terminal connectivity are not displayed until their live data sources are connected. No example data is presented as actual operations.</p>
    </div>
  );
}
