import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ChefHat, Package, ArrowRight, Download, AlertTriangle } from 'lucide-react';
import { exportFreshBackup, loadFreshLedger, type FreshLedger } from './localEngine';
import { useRecoveryAuth } from './RecoveryAuth';
const cash = (amount: number) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' }).format(amount);
export function RecoveryDashboard() {
  const [ledger, setLedger] = useState<FreshLedger | null>(null);
  const [error, setError] = useState('');
  const { profile } = useRecoveryAuth();
  useEffect(() => {
    let live = true;
    const fetch = () => loadFreshLedger().then(s => { if (live) setLedger(s); }).catch(e => { if (live) setError(String(e)); });
    void fetch();
    window.addEventListener('talkos:local-ledger-updated', fetch);
    return () => { live = false; window.removeEventListener('talkos:local-ledger-updated', fetch); };
  }, []);
  const orders = ledger?.orders || [];
  const paid = orders.filter(o => o.payment === 'CASH_RECEIVED');
  const revenue = paid.reduce((n, o) => n + o.total, 0);
  const kitchen = orders.filter(o => o.kitchen !== 'SERVED').length;
  const alerts = ledger?.inventory.filter(i => !i.stockVerified).length ?? 144;
  const exportBackup = async () => {
    try {
      const blob = new Blob([await exportFreshBackup()], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = 'TalkOS-private-local-backup-' + new Date().toISOString().slice(0,10)+'.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) { setError(String(e)); }
  };
  return <div className="space-y-5 text-[#800000]">
    <div><h1 className="text-2xl font-bold">Welcome, {profile?.displayName?.split(' ')[0] || 'Staff'}</h1>
      <p className="text-sm text-[#800000]/70">Talk of the Town · Imphal · Recorded restaurant data only</p>
      <p className="mt-1 text-xs font-bold text-amber-800">OFFLINE DEVICE · No cloud sync. Keep a backup.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[{label:'New Order',to:'/pos'},{label:'Inventory Count',to:'/inventory'},{label:'Kitchen Orders',to:'/kds'},{label:'Manage Menu',to:'/menu'}].map(a =>
        <Link key={a.to} to={a.to} className="rounded-xl border border-[#ead6da] p-4 font-bold shadow-sm hover:bg-[#fdf5f6]">
          <ArrowRight className="mb-2 h-5 w-5"/>{a.label}</Link>)}
    </div>
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <div className="rounded-xl border border-[#ebd5da] p-5">
        <h2 className="flex items-center gap-2 font-bold"><Receipt className="h-5 w-5"/> Today's recorded cash sales</h2>
        <p className="mt-3 text-xs text-slate-500">{paid.length ? 'Recorded cash payments on this device' : 'No cash payments recorded on this device.'}</p>
        <div className="mt-3 grid grid-cols-2 text-center">
          <div className="text-2xl font-black">{cash(revenue)}<p className="text-xs font-normal">Cash revenue</p></div>
          <div className="text-2xl font-black">{paid.length}<p className="text-xs font-normal">Paid orders</p></div>
        </div>
      </div>
      <div className="rounded-xl border border-[#ebd5da] p-5">
        <h2 className="flex items-center gap-2 font-bold"><ChefHat className="h-5 w-5"/> Kitchen tickets</h2>
        <p className="mt-3 text-xs text-slate-500">{orders.length ? 'Orders generated on this device' : 'No kitchen tickets recorded.'}</p>
        <p className="mt-3 text-2xl font-black">{kitchen}<span className="ml-2 text-xs font-normal">not served</span></p>
      </div>
      <div className="rounded-xl border border-[#ebd5da] p-5">
        <h2 className="flex items-center gap-2 font-bold"><Package className="h-5 w-5"/> 144 master inventory items</h2>
        <p className="mt-2 text-sm"><AlertTriangle className="mr-1 inline h-4 w-4 text-amber-700" />
          {alerts} items need physical stock verification. Zero is not a confirmed balance.</p>
        <Link className="mt-3 inline-block text-sm font-bold underline" to="/inventory">Open inventory</Link>
      </div>
      <div className="rounded-xl border border-[#ebd5da] p-5">
        <h2 className="font-bold">Recorded order activity</h2>
        <p className="mt-2 text-sm text-slate-600">{orders.length ? orders.length + ' genuine orders saved locally' : 'No recorded orders yet.'}</p>
        {profile?.roles.includes('OWNER') && <button className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#800000] px-3 py-2 text-xs font-bold" onClick={() => void exportBackup()}>
          <Download className="h-4 w-4"/> Export private backup</button>}
      </div>
    </div>
  </div>;
}
