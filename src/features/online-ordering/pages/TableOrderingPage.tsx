import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Utensils, Search, ShoppingBag, Plus, Minus, ArrowLeft, Check, 
  Sparkles, ChefHat, Clock, CreditCard, Banknote, AlertCircle, 
  Info, X, ChevronRight, Share2 
} from 'lucide-react';
import { posService } from '../../pos/services/posService';
import { Product, OrderItem, MenuItemSize } from '../../pos/models/pos';
import { OrderStatusTracker } from '../components/OrderStatusTracker';

export function TableOrderingPage() {
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table') || '';
  
  const [tableNumber, setTableNumber] = useState<string>(tableParam || 'Table 1');
  const [isEditingTable, setIsEditingTable] = useState<boolean>(!tableParam);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Cart state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Customization modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('Standard');
  const [itemNote, setItemNote] = useState('');
  
  // Checkout & Submission state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    estimatedMinutes: number;
  } | null>(null);

  // Load menu products
  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        const data = await posService.getProducts();
        setProducts(data.filter(p => p.active !== false && p.isAvailable !== false && !p.isSubItem));
      } catch (err) {
        console.error('Failed to load menu items:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category || 'General')));
    return ['ALL', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.comboDescription && p.comboDescription.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.quantity, 0);
  }, [cart]);

  const taxAmount = Math.round(cartTotal * 0.05); // 5% GST
  const grandTotal = cartTotal + taxAmount;

  // Add item with sizing
  const handleOpenCustomize = (product: Product) => {
    setSelectedProduct(product);
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0].size);
    } else {
      setSelectedSize('Standard');
    }
    setItemNote('');
  };

  const handleConfirmAddToCart = () => {
    if (!selectedProduct) return;
    
    let price = selectedProduct.price;
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
      const match = selectedProduct.sizes.find(s => s.size === selectedSize);
      if (match) price = match.price;
    }

    const cartKey = `${selectedProduct.id}_${selectedSize}_${itemNote}`;
    
    setCart(prev => {
      const existingIdx = prev.findIndex(item => (item as any).cartKey === cartKey);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += 1;
        return next;
      }
      return [
        ...prev,
        {
          cartItemId: `ci_${Date.now()}_${Math.random()}`,
          productId: selectedProduct.id,
          name: selectedProduct.name,
          size: selectedSize as any,
          price,
          quantity: 1,
          notes: itemNote || undefined,
          isCombo: selectedProduct.isCombo,
          cartKey
        } as any
      ];
    });

    setSelectedProduct(null);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as OrderItem[];
    });
  };

  // Submit Order directly to authoritative backend
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!tableNumber) {
      alert('Please enter your Table number to place your order.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/orders/guest-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          orderType: 'DINE_IN',
          tableNumber,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          paymentMethod,
          paymentDetails: {
            method: paymentMethod,
            timestamp: new Date().toISOString()
          },
          orderNotes
        })
      });

      if (!res.ok) {
        throw new Error('Server returned error placing order');
      }

      const data = await res.json();
      if (!data.success || !data.orderId || !data.orderNumber) throw new Error('Order not acknowledged by backend');
      setSubmittedOrder({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        estimatedMinutes: data.estimatedMinutes || 18
      });
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error('Order submission failed:', err);
      alert('Order was not accepted by the restaurant server. No payment or order has been recorded; please ask counter staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already ordered, render the live tracker!
  if (submittedOrder) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
        <div className="max-w-md mx-auto mb-4 flex items-center justify-between">
          <button
            onClick={() => setSubmittedOrder(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Menu
          </button>
          <span className="text-xs font-medium text-slate-400">TalkOS Live Guest Tracker</span>
        </div>
        <OrderStatusTracker 
          orderId={submittedOrder.orderId}
          orderNumber={submittedOrder.orderNumber}
          tableNumber={tableNumber}
          initialEstimatedMinutes={submittedOrder.estimatedMinutes}
          onOrderAgain={() => setSubmittedOrder(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 text-slate-900 dark:text-slate-100">
      
      {/* Top Mobile App Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              T
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-tight tracking-tight text-slate-900 dark:text-white">
                TalkOS Bistro
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Dine-In Menu</span>
                <span>•</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Fresh Kitchen</span>
              </div>
            </div>
          </div>

          {/* Table Number Pill */}
          <div className="flex items-center gap-1.5">
            {isEditingTable ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. T4"
                  className="w-16 px-2 py-1 text-xs font-bold border border-indigo-400 rounded-lg bg-white dark:bg-slate-800 text-center"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingTable(false)}
                  className="p-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTable(true)}
                className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1 hover:bg-indigo-100 transition-colors"
              >
                <span>{tableNumber}</span>
                <span className="text-[10px] text-indigo-500 font-normal underline">edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, burgers, chowmein, drinks..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Category Carousel Pills */}
        <div className="max-w-2xl mx-auto px-4 pb-2.5 overflow-x-auto flex gap-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'ALL' ? '🔥 All Dishes' : cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main Menu Grid */}
      <main className="max-w-2xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading fresh menu...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-medium">No menu items match your search.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
              className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProducts.map(product => {
              const inCartQty = cart
                .filter(it => it.productId === product.id)
                .reduce((s, it) => s + it.quantity, 0);

              const hasSizes = product.sizes && product.sizes.length > 1;

              return (
                <div 
                  key={product.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* Veg / Non-Veg dot */}
                        <span className={`w-3.5 h-3.5 border flex items-center justify-center rounded-xs shrink-0 ${
                          product.category?.toLowerCase().includes('veg') && !product.category?.toLowerCase().includes('non')
                            ? 'border-emerald-600'
                            : 'border-rose-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            product.category?.toLowerCase().includes('veg') && !product.category?.toLowerCase().includes('non')
                              ? 'bg-emerald-600'
                              : 'bg-rose-600'
                          }`} />
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {product.name}
                        </h3>
                      </div>
                      
                      {product.isCombo && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black tracking-wide shrink-0">
                          COMBO
                        </span>
                      )}
                    </div>

                    {product.comboDescription && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {product.comboDescription}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block -mb-0.5">Price</span>
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">
                        ₹{product.price}
                      </span>
                      {hasSizes && (
                        <span className="text-[10px] text-indigo-500 ml-1 font-semibold">
                          ({product.sizes.length} sizes)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCustomize(product)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all ${
                        inCartQty > 0
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {inCartQty > 0 ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added ({inCartQty})</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>ADD</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Item Customization Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedProduct.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your preferred portion and instructions
                </p>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Size Options */}
            {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Select Size Portion:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {selectedProduct.sizes.map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => setSelectedSize(s.size)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        selectedSize === s.size
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-semibold">{s.size}</div>
                      <div className="text-sm font-extrabold mt-0.5">₹{s.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Special Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Special Kitchen Note (Optional):
              </label>
              <input
                type="text"
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="e.g. Mild spice, no spring onions, extra crisp"
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmAddToCart}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-0 z-40 max-w-md mx-auto px-4">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold shadow-xl flex items-center justify-between transition-transform active:scale-98"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white text-indigo-700 text-xs font-black flex items-center justify-center">
                {cartCount}
              </div>
              <span className="text-sm">View Table Order</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-black">
              <span>₹{grandTotal}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Bottom Sheet / Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Your Table Order — {tableNumber}
                </h3>
                <p className="text-xs text-slate-400">Review selected dishes</p>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {cart.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex-1 pr-2">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.name}
                    </div>
                    {item.size && item.size !== 'Standard' && (
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mr-2">
                        Size: {item.size}
                      </span>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-slate-400 italic">
                        Note: {item.notes}
                      </p>
                    )}
                    <div className="font-bold text-xs text-slate-700 dark:text-slate-300 mt-1">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartItemId!, -1)}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartItemId!, 1)}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Guest Details */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Guest Name (Optional)"
                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone (For SMS updates)"
                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Order instructions for table/kitchen..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Payment Method Selection */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Payment Preference:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI / QR', icon: CreditCard },
                    { id: 'CARD', label: 'Card', icon: CreditCard },
                    { id: 'CASH', label: 'Pay at Counter', icon: Banknote },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          paymentMethod === m.id
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-xs font-semibold block">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-700/80">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Food Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Restaurant GST (5%)</span>
                  <span>₹{taxAmount}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>
            </div>

            {/* Place Order CTA */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                type="button"
                disabled={isSubmitting || cart.length === 0}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting to Kitchen...</span>
                  </>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4" />
                    <span>Send Order to Kitchen • ₹{grandTotal}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
