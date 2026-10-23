import React from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { RecoveryAuthProvider, useRecoveryAuth } from './RecoveryAuth';
import { RecoveryLogin } from './RecoveryLogin';
import { RecoveryDashboard } from './RecoveryDashboard';
import { AppShell } from '../shared/layouts/AppShell';
import { PosPage } from '../features/pos/pages/PosPage';
import { MenuManagementPage } from '../features/pos/pages/MenuManagementPage';
import { KdsPage } from '../features/kds/pages/KdsPage';
import { InventoryPage } from '../features/inventory/pages/InventoryPage';
import { usePosStore } from '../features/pos/store/posStore';
import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

function RecoveryGuard({ children }: { children: React.ReactNode }) {
  const { user } = useRecoveryAuth();
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}
function ScopedOriginalRoute({ title }: { title: string }) {
  return <div className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-[#ebd5da] bg-white p-6 text-[#800000]">
    <h1 className="text-xl font-bold">{title}</h1>
    <p className="flex gap-2 text-sm text-amber-900"><ShieldAlert className="h-5 w-5 shrink-0"/>
      This original TalkOS module is preserved, but its cloud backend has not been migrated to the offline device yet.
      It cannot be used for live operations in this APK until verified. No sample data or fake transactions will be shown.
    </p>
    <p className="text-sm">The source implementation remains in the original TalkOS repository.</p>
  </div>;
}
function OriginalPosOffline() {
  const loadProducts = usePosStore(s => s.loadProducts);
  useEffect(() => { void loadProducts(); }, [loadProducts]);
  return <PosPage />;
}
const router = createBrowserRouter([
  { path: '/auth', element: <RecoveryLogin /> },
  { path: '/', element: <RecoveryGuard><AppShell /></RecoveryGuard>, children: [
    { index: true, element: <RecoveryDashboard /> },
    { path: 'pos', element: <OriginalPosOffline /> },
    { path: 'menu', element: <MenuManagementPage /> },
    { path: 'kds', element: <KdsPage /> },
    { path: 'inventory', element: <InventoryPage /> },
    ...[
      ['tables','Table Management'], ['purchasing','Purchasing'],
      ['manufacturing','Manufacturing & Recipes'], ['crm','CRM & Loyalty'],
      ['finance','Finance'], ['hr','HR & Payroll'], ['ai','AI Assistant'],
      ['reports','Reports'], ['integrations','Integrations'], ['settings','Settings']
    ].map(([path,title]) => ({ path, element: <ScopedOriginalRoute title={title} /> }))
  ]},
  { path: '*', element: <Navigate to="/" replace /> }
]);
export default function OriginalOfflineTalkOS() {
  return <RecoveryAuthProvider><RouterProvider router={router} /></RecoveryAuthProvider>;
}
