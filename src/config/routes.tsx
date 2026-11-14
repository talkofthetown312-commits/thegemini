import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../shared/layouts/AppShell';
import { useAuth } from '../core/auth/AuthContext';
import { SplashScreen } from '../shared/components/SplashScreen';

// Auth Pages
import { AuthLayout } from '../features/auth/pages/AuthLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { PhoneAuthPage } from '../features/auth/pages/PhoneAuthPage';
import { PinAuthPage } from '../features/auth/pages/PinAuthPage';

// Dashboard
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';

// POS
import { PosPage } from '../features/pos/pages/PosPage';
import { MenuManagementPage } from '../features/pos/pages/MenuManagementPage';

// KDS
import { KdsPage } from '../features/kds/pages/KdsPage';

// Purchasing
import { PurchasingPage } from '../features/purchasing/pages/PurchasingPage';

// Inventory
import { InventoryPage } from '../features/inventory/pages/InventoryPage';
import { OfflineInventoryPage } from '../features/inventory/pages/OfflineInventoryPage';

// CRM
import { CrmPage } from '../features/crm/pages/CrmPage';

// Manufacturing
import { ManufacturingPage } from '../features/manufacturing/pages/ManufacturingPage';

// Table Management
import { TableManagementPage } from '../features/table-management/pages/TableManagementPage';

// Finance
import { FinancePage } from '../features/finance/pages/FinancePage';
import { HrPage } from '../features/hr/pages/HrPage';

// AI
import { AiPage } from '../features/ai/pages/AiPage';

// Reports
import { ReportsPage } from '../features/reports/pages/ReportsPage';

// Admin / Settings
import { AdminPage } from '../features/admin/pages/AdminPage';

// Customer Facing Kiosk, Table QR Ordering, and Omnichannel Integrations
import { KioskPage } from '../features/kiosk/pages/KioskPage';
import { TableOrderingPage } from '../features/online-ordering/pages/TableOrderingPage';
import { IntegrationsPage } from '../features/integrations/pages/IntegrationsPage';

// Auth Guard
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <SplashScreen />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Keep the offline catalogue Android-only. It does not authorize staff access.
function AndroidOnlyInventory() {
  const native = typeof window !== 'undefined' && (
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    (window.location.hostname === 'localhost' && window.location.protocol === 'https:')
  );
  return native ? <OfflineInventoryPage /> : <Navigate to="/auth" replace />;
}

export const router = createBrowserRouter([
  // Bundled Android-only read-only catalogue. No Firestore / POS access.
  { path: '/offline-inventory', element: <AndroidOnlyInventory /> },
  // Public Customer Facing Routes (No Staff Auth Required)
  {
    path: '/kiosk',
    element: <KioskPage />
  },
  {
    path: '/order',
    element: <TableOrderingPage />
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'phone', element: <PhoneAuthPage /> },
      { path: 'pin', element: <PinAuthPage /> },
    ]
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'pos',
        element: <PosPage />,
      },
      {
        path: 'menu',
        element: <MenuManagementPage />,
      },
      {
        path: 'kds',
        element: <KdsPage />,
      },
      {
        path: 'purchasing',
        element: <PurchasingPage />,
      },
      {
        path: 'inventory',
        element: <InventoryPage />,
      },
      {
        path: 'manufacturing',
        element: <ManufacturingPage />,
      },
      {
        path: 'tables',
        element: <TableManagementPage />,
      },
      {
        path: 'crm',
        element: <CrmPage />,
      },
      {
        path: 'hr',
        element: <HrPage />,
      },
      {
        path: 'finance',
        element: <FinancePage />,
      },
      {
        path: 'ai',
        element: <AiPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'integrations',
        element: <IntegrationsPage />,
      },
      {
        path: 'settings',
        element: <AdminPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      }
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  }
]);
