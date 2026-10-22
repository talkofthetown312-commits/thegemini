import React, { useState } from 'react';
import { InventoryItem } from '../models/inventory';
import { useInventoryStore } from '../store/inventoryStore';

interface ItemFormProps {
  onClose: () => void;
  item?: InventoryItem;
}

export function ItemForm({ onClose, item }: ItemFormProps) {
  const { categories, addItem, updateItem } = useInventoryStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<Partial<InventoryItem>>(item || {
    name: '',
    sku: '',
    categoryId: '',
    unit: 'kg',
    costPrice: 0,
    sellingPrice: 0,
    reorderLevel: 0,
    minimumStock: 0,
    valuationMethod: 'WEIGHTED_AVERAGE',
    status: 'ACTIVE'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.name || !formData.sku || !formData.categoryId) {
        throw new Error('Name, SKU, and Category are required');
      }

      for (const key of ['costPrice', 'sellingPrice', 'minimumStock', 'reorderLevel'] as const) {
        if (!Number.isFinite(formData[key]) || (formData[key] ?? -1) < 0) throw new Error('Prices and stock thresholds must be nonnegative numbers');
      }
      if (item) {
        const { name, categoryId, unit, costPrice, sellingPrice, minimumStock, reorderLevel, valuationMethod } = formData;
        await updateItem(item.id, { name, categoryId, unit, costPrice, sellingPrice, minimumStock, reorderLevel, valuationMethod });
      } else {
        await addItem(formData as Omit<InventoryItem, 'id' | 'lastUpdated' | 'createdAt' | 'currentStock'>);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{item ? 'Edit Inventory Item' : 'Add Inventory Item'}</h2>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="mb-4 text-red-500 bg-red-100 dark:bg-red-900/30 p-3 rounded">{error}</div>}
          
          <form id="item-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU *</label>
                <input 
                  type="text" 
                  required
                  disabled={!!item}
                  value={formData.sku || ''}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                <select 
                  required
                  value={formData.categoryId || ''}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit of Measure *</label>
                <input 
                  type="text" 
                  required
                  value={formData.unit || ''}
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" 
                  placeholder="e.g., kg, liters, pcs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cost Price *</label>
                <input 
                  type="number" 
                  required
                  min="0" step="0.01"
                  value={formData.costPrice || 0}
                  onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value)})}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Selling Price</label>
                <input 
                  type="number" 
                  min="0" step="0.01"
                  value={formData.sellingPrice || 0}
                  onChange={e => setFormData({...formData, sellingPrice: parseFloat(e.target.value)})}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Minimum Stock *</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={formData.minimumStock || 0}
                  onChange={e => setFormData({...formData, minimumStock: parseFloat(e.target.value)})}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reorder Level *</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={formData.reorderLevel || 0}
                  onChange={e => setFormData({...formData, reorderLevel: parseFloat(e.target.value)})}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valuation Method</label>
                <select 
                  required
                  value={formData.valuationMethod}
                  onChange={e => setFormData({...formData, valuationMethod: e.target.value as any})}
                  className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="WEIGHTED_AVERAGE">Weighted Average (Standard)</option>
                  <option value="FIFO">FIFO (First In, First Out)</option>
                  <option value="FEFO">FEFO (First Expire, First Out)</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="item-form"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
