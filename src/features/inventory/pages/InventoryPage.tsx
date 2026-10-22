import React, { useEffect, useState } from 'react';
import { importMasterInventory } from '../services/importInventoryStaging';
import { MASTER_INVENTORY } from '../data/masterInventory';
import { useInventoryStore } from '../store/inventoryStore';
import { Loader2, Plus, Edit2, Trash2, Search, ArrowRightLeft, Package, FolderTree, Building2, AlertTriangle, LayoutDashboard, MapPin, Archive, RefreshCw, Activity } from 'lucide-react';
import { InventoryDashboard } from '../components/InventoryDashboard';

// Placeholder imports for sub-components - we will create these next
import { ItemMaster } from '../components/ItemMaster';
import { CategoryManagement } from '../components/CategoryManagement';
import { WarehouseManagement } from '../components/WarehouseManagement';
import { StorageLocations } from '../components/StorageLocations';
import { BatchManagement } from '../components/BatchManagement';
import { CycleCounting } from '../components/CycleCounting';
import { StockTransactions } from '../components/StockTransactions';
import { InventoryReports } from '../components/InventoryReports';

type TabType = 'DASHBOARD' | 'ITEMS' | 'CATEGORIES' | 'WAREHOUSES' | 'LOCATIONS' | 'BATCHES' | 'TRANSACTIONS' | 'CYCLE_COUNTS' | 'REPORTS';

export function InventoryPage() {
  const { loadInitialData, loading, error, items } = useInventoryStore();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const importCatalogue = async () => {
    if (!window.confirm('Import 144 inventory items at zero stock? Existing records will be skipped.')) return;
    setImporting(true);
    setImportResult('');
    try {
      const result = await importMasterInventory(true);
      await loadInitialData();
      setImportResult('Imported ' + result.imported + ' items; skipped ' + result.skipped);
      setActiveTab('ITEMS');
    } catch (err) {
      setImportResult('Import failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setImporting(false); }
  };
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');
  
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const tabs = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ITEMS', label: 'Item Master', icon: Package },
    { id: 'CATEGORIES', label: 'Categories', icon: FolderTree },
    { id: 'WAREHOUSES', label: 'Warehouses', icon: Building2 },
    { id: 'LOCATIONS', label: 'Storage & Bins', icon: MapPin },
    { id: 'BATCHES', label: 'Batches & Expiry', icon: Archive },
    { id: 'TRANSACTIONS', label: 'Stock Movement', icon: ArrowRightLeft },
    { id: 'CYCLE_COUNTS', label: 'Physical Verification', icon: RefreshCw },
    { id: 'REPORTS', label: 'Reports', icon: Activity },
  ];

  if (loading && activeTab === 'DASHBOARD') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="p-6 pb-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Enterprise Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400">Comprehensive stock, valuation, and location tracking</p>
        </div>
        
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-500">Master catalogue: {MASTER_INVENTORY.length} · Loaded: {items.length}</span>
          <button type="button" disabled={importing} onClick={importCatalogue} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{importing ? 'Importing...' : 'Import 144 master items'}</button>
          {importResult && <span role="status" className="text-sm text-slate-600">{importResult}</span>}
        </div>
        <div className="flex space-x-1 overflow-x-auto pb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-t-lg'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-indigo-500' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'DASHBOARD' && <InventoryDashboard />}
        {activeTab === 'ITEMS' && <ItemMaster />}
        {activeTab === 'CATEGORIES' && <CategoryManagement />}
        {activeTab === 'WAREHOUSES' && <WarehouseManagement />}
        {activeTab === 'LOCATIONS' && <StorageLocations />}
        {activeTab === 'BATCHES' && <BatchManagement />}
        {activeTab === 'TRANSACTIONS' && <StockTransactions />}
        {activeTab === 'CYCLE_COUNTS' && <CycleCounting />}
        {activeTab === 'REPORTS' && <InventoryReports />}
      </div>
    </div>
  );
}
