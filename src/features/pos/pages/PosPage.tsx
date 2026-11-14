import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosStore } from '../store/posStore';
import { Product, ItemSize, Order } from '../models/pos';
import { 
  Loader2, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  Sparkles, 
  UtensilsCrossed, 
  Receipt, 
  PauseCircle, 
  Banknote, 
  Tag, 
  FileText, 
  Utensils, 
  ShoppingBag, 
  Truck,
  RotateCcw,
  Check,
  Camera,
  Barcode as BarcodeIcon,
  X,
  ChevronUp,
  Globe
} from 'lucide-react';
import { SizeSelectorModal } from '../components/SizeSelectorModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { BillingModal } from '../components/BillingModal';
import { OrderHistoryModal } from '../components/OrderHistoryModal';
import { ParkedOrdersModal } from '../components/ParkedOrdersModal';
import { DayRegisterModal } from '../components/DayRegisterModal';
import { OnlineOrdersModal } from '../components/OnlineOrdersModal';
import { BarcodeScannerModal } from '../../../shared/components/BarcodeScannerModal';
import { hardwareService } from '../../../core/hardware/hardwareService';
import { useKeyboardShortcuts } from '../../../core/hardware/useKeyboardShortcuts';

export function PosPage() {
  const { 
    products, 
    cart, 
    loading, 
    error, 
    menuError,
    ordersError,
    lastCompletedOrder,
    orderType,
    tableNumber,
    customerName,
    customerPhone,
    orderNotes,
    discount,
    parkedOrders,
    ordersHistory,
    ordersLoading,
    loadProducts, 
    setOrderType,
    setTableNumber,
    setCustomerName,
    setCustomerPhone,
    setOrderNotes,
    applyDiscount,
    removeDiscount,
    addToCart, 
    updateQuantity,
    updateItemNotes,
    removeFromCart, 
    clearCart,
    parkCurrentOrder,
    recallParkedOrder,
    deleteParkedOrder,
    completeCheckout,
    clearCompletedOrder,
    loadOrdersHistory,
    cancelOrder
  } = usePosStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  // Customer menu editor is available at /menu.
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  // Billing & History Modals
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isOnlineOrdersModalOpen, setIsOnlineOrdersModalOpen] = useState(false);
  const [onlineOrderCount, setOnlineOrderCount] = useState(0);

  // Reprints
  const [orderForReprint, setOrderForReprint] = useState<{ order: Order; tab: 'receipt' | 'kot' } | null>(null);

  // Item note input state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadProducts();
    loadOrdersHistory();

    const fetchLiveCount = () => {
      fetch('/api/orders/live')
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.count === 'number') {
            setOnlineOrderCount(data.count);
          }
        })
        .catch(() => {});
    };

    fetchLiveCount();
    const interval = setInterval(fetchLiveCount, 8000);
    return () => clearInterval(interval);
  }, [loadProducts, loadOrdersHistory]);

  // Only display active, sellable items (filters out deactivated Momo, Macaroni, Stir Fry, Beverages, and sub-items)
  const activeProducts = products.filter(
    p => p.active !== false && p.isAvailable !== false && !p.isSubItem
  );

  const categories = ['All', ...Array.from(new Set(activeProducts.map(p => p.category)))];

  const filteredProducts = activeProducts.filter(p => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Specials') return p.category === 'Specials' || p.category === 'Chilly';
    return p.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const handleProductClick = (product: Product) => {
    const activeSizes = (product.sizes || []).filter(s => s.active !== false);
    const hasMultipleSizes = activeSizes.length > 1;
    const hasComboChoice = product.comboComponents?.some(c => c.isChoice);

    if (hasMultipleSizes || hasComboChoice) {
      setModalProduct(product);
    } else {
      // Single size item adds directly as Standard
      const singleSize = activeSizes[0]?.size || 'Standard';
      addToCart(product, singleSize);
    }
  };

  const handleConfirmSize = (
    product: Product, 
    size: ItemSize, 
    selectedOption?: string, 
    quantity?: number
  ) => {
    addToCart(product, size, selectedOption, quantity);
    setModalProduct(null);
  };

  // Hardware Barcode Scanner Listener
  useEffect(() => {
    const unsubscribe = hardwareService.onBarcodeScanned((code) => {
      const query = code.toLowerCase().trim();
      const matched = activeProducts.find(
        p => p.id.toLowerCase() === query || 
             p.name.toLowerCase().includes(query)
      );
      if (matched) {
        handleProductClick(matched);
      }
    });
    return () => unsubscribe();
  }, [activeProducts]);

  // Global Desktop Keyboard Shortcuts
  useKeyboardShortcuts({
    onNewSale: () => clearCart(),
    onHoldOrder: () => {
      if (cart.length > 0) parkCurrentOrder();
    },
    onHistory: () => setIsHistoryModalOpen(true),
    onSettle: () => {
      if (cart.length > 0) setIsBillingModalOpen(true);
    },
    onKickDrawer: () => hardwareService.kickCashDrawer(),
    onEscape: () => {
      setModalProduct(null);
      setIsBillingModalOpen(false);
      setIsHistoryModalOpen(false);
      setIsParkedModalOpen(false);
      setIsRegisterModalOpen(false);
      setIsBarcodeModalOpen(false);
      setIsMobileCartOpen(false);
      setOrderForReprint(null);
    }
  });

  // Calculations for active cart
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'PERCENTAGE') {
      discountAmount = (subtotal * discount.value) / 100;
    } else {
      discountAmount = Math.min(subtotal, discount.value);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const cgst = taxableAmount * 0.025; // 2.5%
  const sgst = taxableAmount * 0.025; // 2.5%
  const tax = cgst + sgst; // 5% total GST
  const grandTotal = Math.round((taxableAmount + tax) * 100) / 100;

  const handleSaveItemNote = (cartItemIdOrProductId: string) => {
    updateItemNotes(cartItemIdOrProductId, noteText.trim());
    setEditingNoteId(null);
    setNoteText('');
  };

  const tableQuickList = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'Table 7', 'Table 8'];

  // Cart View Component shared between Desktop Sidebar and Mobile Bottom Sheet
  const renderCartContent = (isMobileSheet = false) => (
    <div className="flex flex-col h-full bg-white text-[#800000]">
      {/* Cart Top Header with Order Channel & Table Controls */}
      <div className="p-3.5 border-b border-[#ebd5da] bg-[#fdf5f6] space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#800000] flex items-center">
            <ShoppingCart className="w-4 h-4 mr-1.5 text-[#800000]" /> Active Ticket
          </h2>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] font-black text-red-600 hover:underline px-1 py-0.5 cursor-pointer"
                title="Clear Cart"
              >
                Clear
              </button>
            )}
            <span className="text-xs font-black bg-[#800000] text-white px-2 py-0.5 rounded-full">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
            {isMobileSheet && (
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                aria-label="Close cart"
                className="p-1 text-[#800000] hover:bg-[#fee8eb] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Order Channel Switcher */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setOrderType('DINE_IN')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer ${
              orderType === 'DINE_IN'
                ? 'bg-[#800000] text-white border-[#800000]'
                : 'bg-white text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
            }`}
          >
            <Utensils className="w-3 h-3" />
            Dine In
          </button>
          <button
            type="button"
            onClick={() => setOrderType('TAKEAWAY')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer ${
              orderType === 'TAKEAWAY'
                ? 'bg-[#800000] text-white border-[#800000]'
                : 'bg-white text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
            }`}
          >
            <ShoppingBag className="w-3 h-3" />
            Takeaway
          </button>
          <button
            type="button"
            onClick={() => setOrderType('DELIVERY')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer ${
              orderType === 'DELIVERY'
                ? 'bg-[#800000] text-white border-[#800000]'
                : 'bg-white text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
            }`}
          >
            <Truck className="w-3 h-3" />
            Delivery
          </button>
        </div>

        {/* If Dine In: Quick Table Dropdown */}
        {orderType === 'DINE_IN' && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-[#800000]/70 text-[11px]">Table:</span>
            <select
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="flex-1 py-1 px-2 rounded-lg bg-white border border-[#ebd5da] text-[#800000] font-black text-xs"
            >
              {tableQuickList.map(tbl => (
                <option key={tbl} value={tbl}>{tbl}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#800000]/60 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#fdf5f6] border border-[#ebd5da] flex items-center justify-center mb-3">
              <ShoppingCart className="w-6 h-6 text-[#800000]/40" />
            </div>
            <p className="font-bold text-sm text-[#800000]">Order is currently empty</p>
            <p className="text-xs text-[#800000]/70 mt-1">Tap items or scan barcode to add to ticket</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item, idx) => {
              const itemKey = item.cartItemId || item.id || `${item.productId}_${idx}`;
              const isEditingNote = editingNoteId === itemKey;

              return (
                <div 
                  key={itemKey} 
                  className="p-3.5 rounded-xl bg-[#fdf5f6] border border-[#ebd5da] flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <h4 className="font-black text-sm text-[#800000] leading-tight">
                        {item.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.size && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#800000] text-white">
                            {item.size}
                          </span>
                        )}
                        {item.selectedOption && (
                          <span className="text-[11px] font-bold text-[#800000]/80">
                            • {item.selectedOption}
                          </span>
                        )}
                      </div>
                      {item.notes && !isEditingNote && (
                        <p className="text-[11px] font-bold text-red-700 mt-1 italic">
                          * {item.notes}
                        </p>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeFromCart(item.cartItemId || item.productId)} 
                      className="text-[#800000]/60 hover:text-[#800000] p-1 hover:bg-[#fee8eb] rounded-lg transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Note editor row */}
                  {isEditingNote ? (
                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="e.g. Less oil, extra spicy"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs bg-white border border-[#ebd5da] rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveItemNote(item.cartItemId || item.productId)}
                        className="p-1 rounded bg-[#800000] text-white cursor-pointer"
                        title="Save note"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(itemKey);
                        setNoteText(item.notes || '');
                      }}
                      className="text-[10px] font-bold text-[#800000]/60 hover:text-[#800000] flex items-center gap-1 w-fit"
                    >
                      <FileText className="w-3 h-3" />
                      {item.notes ? 'Edit note' : '+ Add item note'}
                    </button>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-[#ebd5da]/60">
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2 bg-white border border-[#ebd5da] rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId || item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded flex items-center justify-center text-[#800000] hover:bg-[#fee8eb] transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-[#800000]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId || item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded flex items-center justify-center text-[#800000] hover:bg-[#fee8eb] transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm text-[#800000]">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-[#800000]/70 font-bold">
                        ₹{item.price.toFixed(2)} ea
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Total & Settle Footer */}
      <div className="p-4 border-t-2 border-[#ebd5da] bg-[#fdf5f6] space-y-3">
        {/* Quick Hold / Park Order button */}
        {cart.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => parkCurrentOrder()}
              className="flex-1 py-1.5 px-3 rounded-lg border border-[#ebd5da] bg-white text-[#800000] text-xs font-black hover:bg-[#fee8eb] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Park this ticket and serve another customer (F4)"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              Hold Order (F4)
            </button>
          </div>
        )}

        <div className="space-y-1.5 text-xs font-semibold">
          <div className="flex justify-between text-[#800000]/80">
            <span>Subtotal</span>
            <span className="font-bold">₹{subtotal.toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Discount</span>
              <span>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-[#800000]/80">
            <span>GST (5% - CGST 2.5% + SGST 2.5%)</span>
            <span className="font-bold">₹{tax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-xl font-black text-[#800000] pt-2 border-t border-[#ebd5da]">
            <span>Payable Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => {
            setIsBillingModalOpen(true);
            if (isMobileSheet) setIsMobileCartOpen(false);
          }}
          disabled={cart.length === 0 || loading}
          className="w-full bg-[#800000] hover:bg-[#680016] text-white font-black py-3.5 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors shadow-xs cursor-pointer text-base"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          Pay & Settle ₹{grandTotal.toFixed(2)} (F9) →
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 bg-white text-[#800000] relative overflow-hidden">
      {/* Products Catalog Area */}
      <div className="flex-1 p-3 md:p-6 overflow-y-auto flex flex-col min-w-0">
        
        {/* Header & Management Bar */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#800000] tracking-tight">
                Talk of the Town POS
              </h1>
              <p className="text-[11px] md:text-xs text-[#800000]/80 font-bold uppercase tracking-wider">
                Quick Service & Cross-Platform Billing
              </p>
            </div>

            {/* Quick Action Buttons */}
            <Link to="/menu" className="rounded-xl bg-[#800000] text-white px-3 py-2 text-xs font-bold">Manage Menu</Link>
            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-[#800000] text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Camera Barcode Scanner"
              >
                <Camera className="w-4 h-4 text-[#800000]" />
                <span className="hidden sm:inline">Scan SKU</span>
              </button>

              <button
                type="button"
                onClick={() => setIsParkedModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-[#800000] text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer relative"
              >
                <PauseCircle className="w-4 h-4 text-[#800000]" />
                <span className="hidden sm:inline">Held</span>
                {parkedOrders.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#800000] text-white text-[10px] font-black flex items-center justify-center">
                    {parkedOrders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOnlineOrdersModalOpen(true)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer relative ${
                  onlineOrderCount > 0 
                    ? 'border-[#800000] bg-[#fee8eb] text-[#800000] animate-pulse ring-2 ring-[#800000]/20' 
                    : 'border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-[#800000]'
                }`}
                title="View Online, Table QR, and Kiosk incoming orders"
              >
                <Globe className="w-4 h-4 text-[#800000]" />
                <span className="hidden sm:inline">Online/Kiosk</span>
                {onlineOrderCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#800000] text-white text-[10px] font-black flex items-center justify-center">
                    {onlineOrderCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-[#800000] text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-[#800000]" />
                <span className="hidden sm:inline">Bills</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#fee8eb] text-[#800000] text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Banknote className="w-4 h-4 text-[#800000]" />
                <span className="hidden sm:inline">Register</span>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#800000] text-white shadow-xs'
                      : 'bg-[#fdf5f6] border border-[#ebd5da] text-[#800000] hover:bg-[#fee8eb]'
                  }`}
                >
                  {cat === 'Combo Meals' && <Sparkles className="w-3.5 h-3.5 inline mr-1" />}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 text-[#800000] bg-[#fee8eb] border border-[#ebd5da] p-3 rounded-lg font-bold text-sm">
            {error}
          </div>
        )}

        {menuError && (
          <div role="alert" className="mb-4 text-[#800000] bg-[#fee8eb] border border-[#ebd5da] p-3 rounded-lg text-sm">
            <p className="font-bold">{menuError}</p>
            <button type="button" disabled={loading} onClick={() => { void loadProducts(); }} className="mt-2 font-bold underline disabled:opacity-50">Retry menu</button>
          </div>
        )}
        {ordersError && <p role="alert" className="mb-4 text-sm text-[#800000]">{ordersError}</p>}

        {/* An empty customer menu is not a loading failure. Show a setup path. */}
        {!loading && !menuError && activeProducts.length === 0 && (
          <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">No active menu items available for sale.</p>
            <p className="mt-1">Add your first item or enable an existing item in Manage Menu. No sample menu will be imported automatically.</p>
            <Link to="/menu" className="mt-2 inline-block font-bold underline">Open Manage Menu</Link>
          </div>
        )}

        {/* Catalog Grid */}
        {loading && activeProducts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
          </div>
        ) : (
          <div className="space-y-6 flex-1 pb-16 lg:pb-0">
            {/* If looking at All, highlight Combo Meals in their own distinct section */}
            {selectedCategory === 'All' && activeProducts.some(p => p.category === 'Combo Meals') && (
              <div className="bg-[#fdf5f6] border-2 border-[#ebd5da] rounded-2xl p-4 md:p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#800000]" />
                    <h2 className="text-base md:text-lg font-black text-[#800000]">Combo Meals</h2>
                  </div>
                  <span className="text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#800000] text-white uppercase tracking-wider">
                    Best Value
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {activeProducts.filter(p => p.category === 'Combo Meals').map(product => (
                    <div 
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="bg-white p-3.5 md:p-4 rounded-xl border-2 border-[#ebd5da] hover:border-[#800000] cursor-pointer shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group active:scale-[0.98]"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-black text-[#800000] text-sm md:text-base group-hover:underline">
                            {product.name}
                          </h3>
                          <span className="text-sm md:text-base font-black text-[#800000]">
                            ₹{product.price}
                          </span>
                        </div>
                        {product.comboDescription && (
                          <p className="text-[11px] md:text-xs text-[#800000]/70 mt-1 leading-relaxed font-semibold">
                            {product.comboDescription}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-[#ebd5da] flex items-center justify-between text-xs font-black text-[#800000]">
                        <span>{product.comboComponents?.some(c => c.isChoice) ? 'Choose Base' : 'Quick Add'}</span>
                        <span className="text-[#800000] font-black group-hover:translate-x-0.5 transition-transform">
                          Add →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Catalog Grid */}
            <div>
              {selectedCategory === 'All' && activeProducts.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <UtensilsCrossed className="w-4 h-4 text-[#800000]" />
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-[#800000]">
                    A La Carte Menu
                  </h2>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {(selectedCategory === 'All' 
                  ? filteredProducts.filter(p => p.category !== 'Combo Meals')
                  : filteredProducts
                ).map(product => {
                  const activeSizes = (product.sizes || []).filter(s => s.active !== false);
                  const isMultiSize = activeSizes.length > 1;

                  return (
                    <div 
                      key={product.id} 
                      className="bg-white p-3 md:p-4 rounded-xl border border-[#ebd5da] shadow-xs cursor-pointer hover:border-[#800000] hover:shadow-sm transition-all group flex flex-col justify-between active:scale-[0.98]"
                      onClick={() => handleProductClick(product)}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-[#800000]/70">
                            {product.category}
                          </span>
                          {isMultiSize ? (
                            <span className="text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#fee8eb] text-[#800000] border border-[#ebd5da]">
                              3 Sizes
                            </span>
                          ) : (
                            <span className="text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#fdf5f6] text-[#800000]/80">
                              Std
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-[#800000] text-xs sm:text-sm md:text-base line-clamp-2 group-hover:underline">
                          {product.name}
                        </h3>
                        {product.comboDescription && (
                          <p className="text-[10px] md:text-xs text-[#800000]/70 mt-1 line-clamp-2">
                            {product.comboDescription}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#ebd5da] flex items-center justify-between">
                        <div>
                          {isMultiSize ? (
                            <span className="text-[11px] md:text-xs font-bold text-[#800000]/80">
                              From <strong className="text-sm md:text-base text-[#800000] font-black">₹{product.price}</strong>
                            </span>
                          ) : (
                            <span className="text-sm md:text-base font-black text-[#800000]">
                              ₹{product.price}
                            </span>
                          )}
                        </div>
                        <span className="w-7 h-7 rounded-lg bg-[#fdf5f6] group-hover:bg-[#800000] group-hover:text-white text-[#800000] border border-[#ebd5da] flex items-center justify-center font-bold text-xs transition-colors">
                          +
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && !loading && !menuError && activeProducts.length > 0 && (
                  <div className="col-span-full text-center text-[#800000]/70 py-12 font-bold">
                    No active items found in this category.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Persistent Cart Sidebar (hidden on mobile, shown on lg) */}
      <div className="hidden lg:flex w-96 bg-white border-l-2 border-[#ebd5da] flex-col shadow-xs shrink-0">
        {renderCartContent(false)}
      </div>

      {/* Mobile Floating Cart Summary Bar (shown only on mobile when items in cart) */}
      <div className="mobile-cart-bar lg:hidden fixed left-0 right-0 p-3 bg-gradient-to-t from-white via-white to-transparent pointer-events-none z-30">
        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full bg-[#800000] text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between pointer-events-auto active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block leading-none text-[#fbe6ea]">Active Order</span>
              <span className="text-sm font-black">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black bg-white/20 px-3 py-1.5 rounded-xl">
            <span>Review & Pay</span>
            <ChevronUp className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Mobile Cart Bottom Sheet Drawer */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div 
            className="bg-white rounded-t-3xl max-h-[88dvh] h-[85dvh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {renderCartContent(true)}
          </div>
        </div>
      )}

      {/* Modals */}
      {modalProduct && (
        <SizeSelectorModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onConfirm={handleConfirmSize}
        />
      )}

      {isBillingModalOpen && (
        <BillingModal
          cart={cart}
          orderType={orderType}
          tableNumber={tableNumber}
          customerName={customerName}
          customerPhone={customerPhone}
          orderNotes={orderNotes}
          discount={discount}
          onSetOrderType={setOrderType}
          onSetTableNumber={setTableNumber}
          onSetCustomerName={setCustomerName}
          onSetCustomerPhone={setCustomerPhone}
          onSetOrderNotes={setOrderNotes}
          onApplyDiscount={applyDiscount}
          onRemoveDiscount={removeDiscount}
          onClose={() => setIsBillingModalOpen(false)}
          onCompleteCheckout={async (payment) => {
            const completedOrder = await completeCheckout(payment);
            // Automatic Thermal Receipt Print via Hardware Layer
            hardwareService.printOrder(completedOrder, 'receipt');
            return completedOrder;
          }}
        />
      )}

      {lastCompletedOrder && (
        <ReceiptModal
          order={lastCompletedOrder}
          onClose={clearCompletedOrder}
        />
      )}

      {orderForReprint && (
        <ReceiptModal
          order={orderForReprint.order}
          defaultTab={orderForReprint.tab}
          onClose={() => setOrderForReprint(null)}
        />
      )}

      {isHistoryModalOpen && (
        <OrderHistoryModal
          orders={ordersHistory}
          loading={ordersLoading}
          error={ordersError}
          onRefresh={loadOrdersHistory}
          onSelectOrderForPrint={(order, tab) => {
            setOrderForReprint({ order, tab });
            setIsHistoryModalOpen(false);
          }}
          onCancelOrder={cancelOrder}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}

      {isParkedModalOpen && (
        <ParkedOrdersModal
          parkedOrders={parkedOrders}
          onResumeOrder={recallParkedOrder}
          onDeleteOrder={deleteParkedOrder}
          onClose={() => setIsParkedModalOpen(false)}
        />
      )}

      {isRegisterModalOpen && (
        <DayRegisterModal
          orders={ordersHistory}
          onClose={() => setIsRegisterModalOpen(false)}
        />
      )}

      {isBarcodeModalOpen && (
        <BarcodeScannerModal
          onScan={(code) => {
            const query = code.toLowerCase().trim();
            const matched = activeProducts.find(
              p => p.id.toLowerCase() === query || 
                   p.name.toLowerCase().includes(query)
            );
            if (matched) {
              handleProductClick(matched);
            }
          }}
          onClose={() => setIsBarcodeModalOpen(false)}
        />
      )}

      {isOnlineOrdersModalOpen && (
        <OnlineOrdersModal
          isOpen={isOnlineOrdersModalOpen}
          onClose={() => setIsOnlineOrdersModalOpen(false)}
          onSelectOrderForPrint={(order, tab) => {
            setOrderForReprint({ order, tab });
            setIsOnlineOrdersModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
