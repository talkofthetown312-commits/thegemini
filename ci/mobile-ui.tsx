// Test-only entry point. Vite's production entry remains index.html / src/main.tsx.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '../src/shared/layouts/AppShell';
import { InventoryPage } from '../src/features/inventory/pages/InventoryPage';
import { PosPage } from '../src/features/pos/pages/PosPage';
import { MenuManagementPage } from '../src/features/pos/pages/MenuManagementPage';
import '../src/index.css';

const router = createMemoryRouter([{
  path: '/', element: <AppShell />, children: [
    { index: true, element: <p>Navigation test</p> },
    { path: 'inventory', element: <InventoryPage /> },
    { path: 'pos', element: <PosPage /> },
    { path: 'menu', element: <MenuManagementPage /> },
  ],
}], { initialEntries: ['/inventory'] });
createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
