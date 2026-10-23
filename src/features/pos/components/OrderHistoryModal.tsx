import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Receipt, 
  ChefHat, 
  Ban, 
  Calendar, 
  Clock, 
  Utensils, 
  ShoppingBag, 
  Truck, 
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Order } from '../models/pos';

interface OrderHistoryModalProps {
  orders: Order[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onSelectOrderForPrint: (order: Order, defaultTab: 'receipt' | 'kot') => void;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onClose: () => void;
}

export function OrderHistoryModal({
  orders,
  loading,
  error,
  onRefresh,
  onSelectOrderForPrint,
  onCancelOrder,
  onClose
}: OrderHistoryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'CANCELLED'>('ALL');
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'ALL'>('TODAY');
  
  // Void modal state
  const [orderToVoid, setOrderToVoid] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredOrders = orders.filter(order => {
    // Date filter
    if (dateFilter === 'TODAY') {
      const orderDate = order.createdAt.split('T')[0];
      if (orderDate !== todayStr) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const matchOrderNum = order.orderNumber.toLowerCase().includes(query);
      const matchCustomer = order.customerName?.toLowerCase().includes(query);
      const matchPhone = order.customerPhone?.includes(query);
      const matchTable = order.tableNumber?.toLowerCase().includes(query);
      const matchItem = order.items.some(i => i.name.toLowerCase().includes(query));
      return matchOrderNum || matchCustomer || matchPhone || matchTable || matchItem;
    }

    return true;
  });

  const handleConfirmVoid = async () => {
    if (!orderToVoid) return;
    if (!voidReason.trim()) {
      alert("Please provide a reason for cancelling this order");
      return;
    }

    setIsVoiding(true);
    try {
      await onCancelOrder(orderToVoid.id, voidReason);
      setOrderToVoid(null);
      setVoidReason('');
    } catch (err: any) {
      alert(`Could not cancel order: ${err.message}`);
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white border-2 border-[#ebd5da] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden text-[#800000] flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#800000] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide">Orders & Bills History</h2>
              <p className="text-xs text-[#fbe6ea] font-medium">
                View past tickets, reprint bills & KOT slips, manage cancellations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 border-b border-[#ebd5da] bg-[#fdf5f6] flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#800000]/60" />
            <input
              type="text"
              placeholder="Search by Order #, Table, Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-white border border-[#ebd5da] rounded-xl text-[#800000] focus:ring-2 focus:ring-[#800000] focus:outline-none placeholder-[#800000]/40"
            />
          </div>

          {/* Date Toggle */}
          <div className="flex bg-white rounded-xl border border-[#ebd5da] p-0.5">
            <button
              type="button"
              onClick={() => setDateFilter('TODAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                dateFilter === 'TODAY'
                  ? 'bg-[#800000] text-white'
                  : 'text-[#800000] hover:bg-[#fee8eb]'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                dateFilter === 'ALL'
                  ? 'bg-[#800000] text-white'
                  : 'text-[#800000] hover:bg-[#fee8eb]'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Status Toggle */}
          <div className="flex bg-white rounded-xl border border-[#ebd5da] p-0.5">
            {(['ALL', 'PAID', 'CANCELLED'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#800000] text-white'
                    : 'text-[#800000] hover:bg-[#fee8eb]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {error && <p role="alert" className="rounded-lg bg-[#fee8eb] p-3 text-sm font-bold">{error}</p>}
          {error && orders.length === 0 ? null : loading && orders.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-[#800000]/60 p-6">
              <Receipt className="w-10 h-10 mb-2 text-[#800000]/30" />
              <p className="font-black text-sm text-[#800000]">No bills match your search criteria</p>
              <p className="text-xs text-[#800000]/70 mt-1">Try switching filters or creating a new sale</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const orderDate = new Date(order.createdAt);
              const formattedTime = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const formattedDate = orderDate.toLocaleDateString();

              return (
                <div 
                  key={order.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    order.status === 'CANCELLED'
                      ? 'bg-red-50/50 border-red-200 opacity-80'
                      : 'bg-[#fdf5f6]/40 border-[#ebd5da] hover:border-[#800000]'
                  }`}
                >
                  {/* Order Overview */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-[#800000]">
                        {order.orderNumber}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        order.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                      {order.orderType && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#ebd5da] text-[#800000] flex items-center gap-1">
                          {order.orderType === 'DINE_IN' && <Utensils className="w-2.5 h-2.5" />}
                          {order.orderType === 'TAKEAWAY' && <ShoppingBag className="w-2.5 h-2.5" />}
                          {order.orderType === 'DELIVERY' && <Truck className="w-2.5 h-2.5" />}
                          {order.orderType === 'DINE_IN' ? (order.tableNumber || 'Dine In') : order.orderType}
                        </span>
                      )}
                      {order.paymentMethod && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#800000] text-white">
                          {order.paymentMethod}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#800000]/70 flex items-center gap-3 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#800000]/50" />
                        {formattedDate} at {formattedTime}
                      </span>
                      {order.customerName && (
                        <span>• Cust: <strong>{order.customerName}</strong></span>
                      )}
                      {order.customerPhone && (
                        <span>({order.customerPhone})</span>
                      )}
                    </div>

                    {/* Items summary */}
                    <div className="text-xs font-medium text-[#800000]/90 pt-1 line-clamp-1">
                      {order.items.map(i => {
                        const name = i.selectedOption || (i.size && i.size !== 'Standard' ? `${i.name} (${i.size})` : i.name);
                        return `${i.quantity}x ${name}`;
                      }).join(', ')}
                    </div>

                    {order.status === 'CANCELLED' && order.voidReason && (
                      <p className="text-xs font-bold text-red-700 italic">
                        Void Reason: {order.voidReason}
                      </p>
                    )}
                  </div>

                  {/* Pricing & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#ebd5da]/60">
                    <div className="text-right">
                      <span className="text-xs text-[#800000]/70 block font-bold">Total Bill</span>
                      <span className="text-lg font-black text-[#800000]">
                        ₹{order.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectOrderForPrint(order, 'receipt')}
                        className="p-2 rounded-lg bg-white border border-[#ebd5da] text-[#800000] hover:bg-[#800000] hover:text-white transition-colors cursor-pointer"
                        title="Print Customer Bill"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectOrderForPrint(order, 'kot')}
                        className="p-2 rounded-lg bg-white border border-[#ebd5da] text-[#800000] hover:bg-[#800000] hover:text-white transition-colors cursor-pointer"
                        title="Print Kitchen KOT"
                      >
                        <ChefHat className="w-4 h-4" />
                      </button>

                      {order.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => setOrderToVoid(order)}
                          className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                          title="Void / Cancel Order"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Void / Cancellation Confirmation Modal */}
        {orderToVoid && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border-2 border-red-300 max-w-md w-full p-5 space-y-4 shadow-2xl text-[#800000]">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-black">Cancel & Void Bill</h3>
              </div>
              <p className="text-xs font-semibold leading-relaxed">
                Are you sure you want to void order <strong>{orderToVoid.orderNumber}</strong> (₹{orderToVoid.total.toFixed(2)})? This will mark the bill as CANCELLED in financial records.
              </p>
              <div>
                <label className="block text-xs font-black mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer cancelled order, duplicate punch, entered wrong item"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full p-2.5 text-xs font-medium border border-[#ebd5da] rounded-xl focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToVoid(null)}
                  className="px-4 py-2 text-xs font-black rounded-xl border border-[#ebd5da] hover:bg-[#fee8eb] cursor-pointer"
                >
                  Nevermind
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  disabled={isVoiding || !voidReason.trim()}
                  className="px-4 py-2 text-xs font-black rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  {isVoiding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Void
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
