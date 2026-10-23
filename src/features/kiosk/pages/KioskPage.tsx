import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Utensils, ShoppingBag, Plus, Minus, ArrowLeft, Check, 
  CreditCard, Sparkles, ChefHat, Clock, Banknote, QrCode, 
  RotateCcw, Globe, Volume2, ShieldCheck, Heart, AlertCircle,
  X, ChevronRight, CheckCircle2, Printer
} from 'lucide-react';
import QRCode from 'qrcode';
import { posService } from '../../pos/services/posService';
import { Product, OrderItem } from '../../pos/models/pos';

type KioskStep = 'ATTRACT' | 'DINING_OPTION' | 'CATALOG' | 'PAYMENT' | 'SUCCESS';

export function KioskPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<KioskStep>('ATTRACT');
  const [diningOption, setDiningOption] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [buzzerTentNumber, setBuzzerTentNumber] = useState<string>('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Cart
  const [cart, setCart] = useState<OrderItem[]>([]);
  
  // Customization modal
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('Standard');
  const [itemNote, setItemNote] = useState<string>('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI' | 'CASH'>('CARD');
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED'>('IDLE');
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');

  // Success
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    buzzerNumber: string;
    total: number;
  } | null>(null);

  // Inactivity auto-reset timer
  const [autoResetTimer, setAutoResetTimer] = useState<number>(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load menu items
  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        const data = await posService.getProducts();
        setProducts(data.filter(p => p.active !== false && p.isAvailable !== false && !p.isSubItem));
      } catch (err) {
        console.error('Kiosk menu fetch error:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, []);

  // Auto reset on success screen
  useEffect(() => {
    if (step === 'SUCCESS') {
      setAutoResetTimer(25);
      const countdown = setInterval(() => {
        setAutoResetTimer(prev => {
          if (prev <= 1) {
            clearInterval(countdown);
            handleResetToAttract();
            return 25;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdown);
    }
  }, [step]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category || 'Dishes')));
    return ['ALL', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'ALL') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  }, [cart]);

  const taxAmount = Math.round(cartTotal * 0.05);
  const grandTotal = cartTotal + taxAmount;

  const handleResetToAttract = () => {
    setCart([]);
    setStep('ATTRACT');
    setCustomizingProduct(null);
    setPaymentStatus('IDLE');
    setCompletedOrder(null);
    setTableNumber('');
    setBuzzerTentNumber('');
  };

  const handleOpenCustomize = (product: Product) => {
    setCustomizingProduct(product);
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0].size);
    } else {
      setSelectedSize('Standard');
    }
    setItemNote('');
  };

  const handleAddToCart = () => {
    if (!customizingProduct) return;
    
    let price = customizingProduct.price;
    if (customizingProduct.sizes && customizingProduct.sizes.length > 0) {
      const match = customizingProduct.sizes.find(s => s.size === selectedSize);
      if (match) price = match.price;
    }

    const cartKey = `${customizingProduct.id}_${selectedSize}_${itemNote}`;
    setCart(prev => {
      const idx = prev.findIndex(it => (it as any).cartKey === cartKey);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [
        ...prev,
        {
          cartItemId: `ci_${Date.now()}_${Math.random()}`,
          productId: customizingProduct.id,
          name: customizingProduct.name,
          size: selectedSize as any,
          price,
          quantity: 1,
          notes: itemNote || undefined,
          isCombo: customizingProduct.isCombo,
          cartKey
        } as any
      ];
    });

    setCustomizingProduct(null);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(it => {
        if (it.cartItemId === cartItemId) {
          const next = it.quantity + delta;
          return next > 0 ? { ...it, quantity: next } : null;
        }
        return it;
      }).filter(Boolean) as OrderItem[];
    });
  };

  // Generate UPI QR code when UPI payment selected
  useEffect(() => {
    if (step === 'PAYMENT' && paymentMethod === 'UPI') {
      // No unverified merchant UPI ID is embedded in the application.
      setUpiQrUrl('');
    }
  }, [step, paymentMethod, grandTotal]);

  // Guest checkout must be acknowledged by a real backend, never a simulated payment.
  const handleProcessKioskPayment = async () => {
    if (cart.length === 0) return;
    setPaymentStatus('PROCESSING');
    try {
      const res = await fetch('/api/orders/guest-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          orderType: diningOption,
          tableNumber: diningOption === 'DINE_IN' ? (tableNumber || buzzerTentNumber || undefined) : undefined,
          paymentMethod
        })
      });
      if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Guest checkout service unavailable');
      }
      const data = await res.json();
      if (!data.success || !data.orderId || !data.orderNumber ||
          (paymentMethod !== 'CASH' && data.paymentVerified !== true)) {
        throw new Error('Order or digital payment has not been verified');
      }
      setCompletedOrder({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        buzzerNumber: data.buzzerNumber || '',
        total: grandTotal
      });
      setPaymentStatus('COMPLETED');
      setStep('SUCCESS');
    } catch (error) {
      console.error('Verified kiosk checkout unavailable', error);
      setPaymentStatus('IDLE');
      alert('Self-order checkout is not available. Please place your order at the counter; no payment or order has been recorded.');
    }
  };

  // 1. ATTRACT MODE (Idle Screensaver)
  if (step === 'ATTRACT') {
    return (
      <div 
        onClick={() => setStep('DINING_OPTION')}
        className="fixed inset-0 z-50 bg-gradient-to-br from-[#42000c] via-[#800000] to-[#250007] text-white flex flex-col justify-between p-8 cursor-pointer select-none overflow-hidden"
      >
        {/* Top Kiosk Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-[#800000] font-black text-2xl flex items-center justify-center shadow-lg">
              T
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">TalkOS Bistro & Kitchen</h1>
              <p className="text-xs text-rose-200 uppercase tracking-widest font-semibold">Self-Ordering Terminal 01</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-semibold">
            <Globe className="w-4 h-4 text-rose-300" />
            <span>English</span>
            <span className="text-white/40">•</span>
            <span>Touch Screen Enabled</span>
          </div>
        </div>

        {/* Hero Visual Area */}
        <div className="max-w-2xl mx-auto text-center space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-rose-200 text-sm font-bold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-300" /> Made Fresh To Order
          </div>

          <h2 className="text-5xl sm:text-6xl font-black leading-tight tracking-tight drop-shadow-md">
            Craving Something Delicious?
          </h2>
          
          <p className="text-lg text-rose-100/90 max-w-lg mx-auto font-medium">
            Explore our artisanal handcrafted meals, chef specials, noodle bowls, and beverages.
          </p>

          <div className="pt-6">
            <div className="inline-block px-10 py-5 rounded-3xl bg-white text-[#800000] text-xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all">
              TOUCH ANYWHERE TO START ORDER
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="flex items-center justify-between text-xs text-rose-200/80 border-t border-white/10 pt-4">
          <div className="flex items-center gap-4">
            <span>✓ Contactless Card / Tap & Pay</span>
            <span>✓ UPI & Digital QR</span>
            <span>✓ Cash at Counter</span>
          </div>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); navigate('/'); }}
            className="text-[11px] text-white/50 hover:text-white underline"
          >
            Staff Exit
          </button>
        </div>
      </div>
    );
  }

  // 2. DINING OPTION SELECTION
  if (step === 'DINING_OPTION') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col justify-between p-8 select-none">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep('ATTRACT')}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" /> Cancel
          </button>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Step 1 of 3</div>
        </div>

        <div className="max-w-2xl mx-auto w-full text-center space-y-8 my-auto">
          <div>
            <h2 className="text-4xl font-black">Where will you be dining today?</h2>
            <p className="text-slate-400 text-base mt-2">Choose your dining experience to begin</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Dine In */}
            <button
              type="button"
              onClick={() => {
                setDiningOption('DINE_IN');
                setStep('CATALOG');
              }}
              className="p-8 rounded-3xl bg-slate-800 hover:bg-indigo-600/30 border-2 border-slate-700 hover:border-indigo-500 transition-all text-center group flex flex-col items-center justify-center gap-4 shadow-xl active:scale-95"
            >
              <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                <Utensils className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black">Dine In</h3>
                <p className="text-xs text-slate-400 mt-1">Eat here inside the restaurant</p>
              </div>
            </button>

            {/* Takeaway */}
            <button
              type="button"
              onClick={() => {
                setDiningOption('TAKEAWAY');
                setStep('CATALOG');
              }}
              className="p-8 rounded-3xl bg-slate-800 hover:bg-emerald-600/30 border-2 border-slate-700 hover:border-emerald-500 transition-all text-center group flex flex-col items-center justify-center gap-4 shadow-xl active:scale-95"
            >
              <div className="w-20 h-20 rounded-2xl bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black">Take Away</h3>
                <p className="text-xs text-slate-400 mt-1">Pack my food to go</p>
              </div>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Need special assistance? Please wave to any member of our staff.
        </div>
      </div>
    );
  }

  // 3. CATALOG & CART VIEW
  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden select-none">
      
      {/* Kiosk Header */}
      <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleResetToAttract}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            <RotateCcw className="w-4 h-4 text-rose-500" /> Start Over
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
          <div>
            <h2 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
              TalkOS Bistro
            </h2>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[11px] font-bold">
                {diningOption === 'DINE_IN' ? '🍽️ Dine In' : '🥡 Take Away'}
              </span>
              <span>Self-Ordering Touch Kiosk</span>
            </div>
          </div>
        </div>

        {/* Right Info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">Total in Cart</div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">₹{grandTotal}</div>
          </div>
        </div>
      </header>

      {/* Main Catalog Body: Left Category Sidebar + Center Menu Grid + Right Cart Sidebar */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Categories Bar */}
        <aside className="w-44 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col py-3 px-2 space-y-1.5 overflow-y-auto shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-3.5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-between ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate">{cat === 'ALL' ? '🔥 All Items' : cat}</span>
            </button>
          ))}
        </aside>

        {/* Menu Grid */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-bold">Loading delicious menu...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Utensils className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">No items available in this category</p>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Show All Menu Items
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const inCart = cart
                  .filter(c => c.productId === product.id)
                  .reduce((s, it) => s + it.quantity, 0);

              return (
                <div
                  key={product.id}
                  onClick={() => handleOpenCustomize(product)}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer active:scale-98 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className={`w-3.5 h-3.5 border flex items-center justify-center rounded-xs shrink-0 mt-0.5 ${
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

                      {product.isCombo && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                          COMBO
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors leading-snug">
                      {product.name}
                    </h3>

                    {product.comboDescription && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {product.comboDescription}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block -mb-0.5">Price</span>
                      <span className="font-black text-lg text-slate-900 dark:text-white">₹{product.price}</span>
                    </div>

                    <div className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                      inCart > 0 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-indigo-600 text-white group-hover:bg-indigo-700'
                    }`}>
                      {inCart > 0 ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added ({inCart})</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>TAP TO ADD</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </main>

        {/* Right Cart Sidebar */}
        <aside className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 shadow-lg">
          
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Your Tray</h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {cart.reduce((s, it) => s + it.quantity, 0)} items
            </span>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
                <Utensils className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2 stroke-1" />
                <p className="text-sm font-semibold">Your tray is empty.</p>
                <p className="text-xs mt-1">Tap any dish on the left to add it to your order.</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                        {item.name}
                      </div>
                      {item.size && item.size !== 'Standard' && (
                        <span className="text-[11px] text-indigo-500 font-semibold">
                          Size: {item.size}
                        </span>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 italic">Note: {item.notes}</p>
                      )}
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400">₹{item.price} each</span>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId!, -1)}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId!, 1)}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span>₹{taxAmount}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Total Due</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setStep('PAYMENT')}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-base shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <span>CHECKOUT & PAY</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </aside>
      </div>

      {/* Customization Modal */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {customizingProduct.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Select portion size and preferences</p>
              </div>
              <button 
                onClick={() => setCustomizingProduct(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sizing */}
            {customizingProduct.sizes && customizingProduct.sizes.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Select Size:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {customizingProduct.sizes.map(s => (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => setSelectedSize(s.size)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        selectedSize === s.size
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-black'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold">{s.size}</div>
                      <div className="text-base font-black mt-0.5">₹{s.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Special Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Special Kitchen Note:
              </label>
              <input
                type="text"
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="e.g. Mild spice, less ice, extra sauce"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> ADD TO TRAY
            </button>
          </div>
        </div>
      )}

      {/* 4. PAYMENT MODAL SCREEN */}
      {step === 'PAYMENT' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-8 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Payment & Completion
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Order Total: <strong className="text-indigo-600 dark:text-indigo-400 text-sm font-black">₹{grandTotal}</strong>
                </p>
              </div>
              <button 
                onClick={() => setStep('CATALOG')}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* If Dine-In, prompt for Table / Tent buzzer number */}
            {diningOption === 'DINE_IN' && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Table Tent / Buzzer Number:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={buzzerTentNumber}
                    onChange={(e) => setBuzzerTentNumber(e.target.value)}
                    placeholder="Take a tent stand number from the kiosk counter (e.g. 14)"
                    className="flex-1 px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select How You Wish To Pay:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'CARD', label: 'Card / Tap', desc: 'Chip & Contactless', icon: CreditCard },
                  { id: 'UPI', label: 'UPI QR Pay', desc: 'GPay / PhonePe', icon: QrCode },
                  { id: 'CASH', label: 'Cash', desc: 'Pay at Counter', icon: Banknote }
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all ${
                        paymentMethod === m.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-1.5" />
                      <div className="text-sm font-extrabold">{m.label}</div>
                      <div className="text-[10px] opacity-75">{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Details Container */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
              {paymentMethod === 'CARD' && (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 mx-auto flex items-center justify-center animate-bounce">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Tap or Insert Card on POS Terminal
                  </h4>
                  <p className="text-xs text-slate-400">
                    Terminal is ready below the kiosk screen. Apple Pay & Google Pay supported.
                  </p>
                </div>
              )}

              {paymentMethod === 'UPI' && (
                <div className="space-y-2">
                  {upiQrUrl ? (
                    <img src={upiQrUrl} alt="UPI QR" className="w-36 h-36 mx-auto border rounded-xl p-1 bg-white shadow-xs" />
                  ) : (
                    <div className="w-36 h-36 mx-auto flex items-center justify-center text-xs text-slate-400">Loading QR...</div>
                  )}
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Scan with any UPI App (GPay, Paytm, PhonePe)
                  </p>
                </div>
              )}

              {paymentMethod === 'CASH' && (
                <div className="space-y-2">
                  <Banknote className="w-10 h-10 text-amber-500 mx-auto" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Pay at Cashier Counter
                  </h4>
                  <p className="text-xs text-slate-400">
                    A token slip will print. Hand it to the cashier to pay and receive your food.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={paymentStatus === 'PROCESSING'}
              onClick={handleProcessKioskPayment}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all"
            >
              {paymentStatus === 'PROCESSING' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Payment & Kitchen Ticket...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>CONFIRM & PLACE ORDER (₹{grandTotal})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 5. SUCCESS & RECEIPT SCREEN */}
      {step === 'SUCCESS' && completedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col justify-between p-8 select-none">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Order Placed Successfully</span>
            <div className="text-xs font-bold px-3 py-1 bg-slate-800 text-rose-300 rounded-full">
              Screen resets in {autoResetTimer}s
            </div>
          </div>

          <div className="max-w-md mx-auto w-full text-center space-y-6 my-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-3xl font-black">Thank You For Your Order!</h2>
              <p className="text-sm text-slate-300 mt-1">
                Your order has been transmitted directly to the kitchen display.
              </p>
            </div>

            {/* Buzzer / Token Badge */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-3xl text-white shadow-2xl">
              <div className="text-xs uppercase tracking-widest font-bold text-indigo-200">
                {diningOption === 'DINE_IN' ? 'Table Stand / Token' : 'Pickup Token'}
              </div>
              <div className="text-5xl font-black my-2 tracking-tight">
                {completedOrder.buzzerNumber}
              </div>
              <div className="text-xs font-mono text-indigo-100 opacity-90">
                Order ID: {completedOrder.orderNumber}
              </div>
            </div>

            {/* Receipt Preview */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-xs space-y-2 text-left font-mono">
              <div className="flex justify-between font-bold text-slate-200 border-b border-slate-700 pb-1">
                <span>TalkOS Bistro</span>
                <span>Paid ₹{completedOrder.total}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Type: {diningOption}</span>
                <span>Kitchen: In Queue</span>
              </div>
              <div className="text-center text-[11px] text-emerald-400 pt-1">
                ✓ Receipt printed at kiosk slot below
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetToAttract}
              className="w-full py-4 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-sm shadow-xl transition-all"
            >
              DONE / NEXT CUSTOMER
            </button>
          </div>

          <div className="text-center text-[11px] text-slate-500">
            TalkOS Omnichannel ERP • Single Authoritative Backend
          </div>
        </div>
      )}

    </div>
  );
}
