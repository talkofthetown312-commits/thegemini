import React, { useState } from 'react';
import { 
  X, 
  Banknote, 
  QrCode, 
  CreditCard, 
  Split, 
  Percent, 
  Utensils, 
  ShoppingBag, 
  Truck, 
  Check, 
  Copy, 
  Loader2, 
  Tag,
  User,
  Phone,
  FileText
} from 'lucide-react';
import { 
  OrderItem, 
  OrderType, 
  PaymentMethod, 
  PaymentDetails, 
  DiscountType,
  Order
} from '../models/pos';

interface BillingModalProps {
  cart: OrderItem[];
  orderType: OrderType;
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  orderNotes: string;
  discount: { type: DiscountType; value: number; reason?: string } | null;
  onSetOrderType: (type: OrderType) => void;
  onSetTableNumber: (table: string) => void;
  onSetCustomerName: (name: string) => void;
  onSetCustomerPhone: (phone: string) => void;
  onSetOrderNotes: (notes: string) => void;
  onApplyDiscount: (type: DiscountType, value: number, reason?: string) => void;
  onRemoveDiscount: () => void;
  onClose: () => void;
  onCompleteCheckout: (payment: { method: PaymentMethod; details: PaymentDetails }) => Promise<Order>;
}

export function BillingModal({
  cart,
  orderType,
  tableNumber,
  customerName,
  customerPhone,
  orderNotes,
  discount,
  onSetOrderType,
  onSetTableNumber,
  onSetCustomerName,
  onSetCustomerPhone,
  onSetOrderNotes,
  onApplyDiscount,
  onRemoveDiscount,
  onClose,
  onCompleteCheckout
}: BillingModalProps) {
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Discount form state
  const [discountInputType, setDiscountInputType] = useState<DiscountType>('PERCENTAGE');
  const [discountInputValue, setDiscountInputValue] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');

  // Cash payment state
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

  const [cashTendered, setCashTendered] = useState<string>(grandTotal.toString());
  
  // UPI payment state
  const [upiRef, setUpiRef] = useState<string>('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Card payment state
  const [cardType, setCardType] = useState<'Visa' | 'MasterCard' | 'RuPay'>('RuPay');
  const [cardLast4, setCardLast4] = useState<string>('');

  // Split payment state
  const [splitCash, setSplitCash] = useState<string>((Math.floor(grandTotal / 2)).toString());
  const splitRemaining = Math.max(0, grandTotal - (parseFloat(splitCash) || 0));

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, Math.round((tenderedNum - grandTotal) * 100) / 100);
  const remainingDue = Math.max(0, Math.round((grandTotal - tenderedNum) * 100) / 100);

  const handleQuickCash = (amount: number) => {
    setCashTendered(amount.toString());
  };

  const handleApplyPresetDiscount = (pct: number) => {
    onApplyDiscount('PERCENTAGE', pct, `${pct}% Flat Discount`);
  };

  const handleCustomDiscountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(discountInputValue);
    if (!isNaN(val) && val > 0) {
      onApplyDiscount(discountInputType, val, discountReason || undefined);
      setDiscountInputValue('');
    }
  };


  const handleSettleOrder = async () => {
    setErrorMessage(null);

    // Manual cashier confirmation: no gateway integration is assumed.
    if (activePaymentMethod !== 'CASH' && !paymentConfirmed) {
      setErrorMessage('Confirm the payment on your UPI app or card terminal before marking this order paid.');
      return;
    }
    if (activePaymentMethod === 'UPI' && !upiRef.trim()) {
      setErrorMessage('Enter the actual UPI transaction reference.');
      return;
    }
    // Validation
    if (activePaymentMethod === 'CASH') {
      if (tenderedNum < grandTotal) {
        setErrorMessage(`Cash tendered (₹${tenderedNum}) is less than total amount (₹${grandTotal.toFixed(2)})`);
        return;
      }
    }

    if (activePaymentMethod === 'SPLIT') {
      const cashVal = parseFloat(splitCash) || 0;
      if (cashVal <= 0 || cashVal >= grandTotal) {
        setErrorMessage("Please enter a valid split cash amount greater than ₹0 and less than total");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let details: PaymentDetails;

      if (activePaymentMethod === 'CASH') {
        details = {
          method: 'CASH',
          cashTendered: tenderedNum,
          changeDue: changeDue
        };
      } else if (activePaymentMethod === 'UPI') {
        details = {
          method: 'UPI',
          upiReference: upiRef.trim()
        };
      } else if (activePaymentMethod === 'CARD') {
        details = {
          method: 'CARD',
          cardType,
          cardLast4: cardLast4.trim() || undefined
        };
      } else {
        // SPLIT
        const cashVal = parseFloat(splitCash) || 0;
        details = {
          method: 'SPLIT',
          splitBreakdown: {
            cash: cashVal,
            upi: splitRemaining
          }
        };
      }

      await onCompleteCheckout({
        method: activePaymentMethod,
        details
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment settlement failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const tableOptions = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'Table 7', 'Table 8', 'Counter 1', 'Patio 1'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white border-2 border-[#ebd5da] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden text-[#800000] flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#800000] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide">Checkout & Billing</h2>
              <p className="text-xs text-[#fbe6ea] font-medium">
                {cart.reduce((s, i) => s + i.quantity, 0)} items • Bill Total: ₹{grandTotal.toFixed(2)}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-[#fee8eb] border-b border-[#ebd5da] px-6 py-2.5 text-xs font-bold text-[#800000] flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-xs font-black underline ml-2">Dismiss</button>
          </div>
        )}

        {/* Modal Body - 2 Columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#ebd5da]">
          
          {/* ================= LEFT COLUMN: Order Details, Taxes & Customer ================= */}
          <div className="lg:col-span-6 p-6 space-y-5 bg-[#fdf5f6]/40 overflow-y-auto">
            
            {/* 1. Order Type Switcher */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#800000] mb-2">
                Order Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onSetOrderType('DINE_IN')}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    orderType === 'DINE_IN'
                      ? 'bg-[#800000] text-white border-[#800000] shadow-xs'
                      : 'bg-white text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  Dine In
                </button>
                <button
                  type="button"
                  onClick={() => onSetOrderType('TAKEAWAY')}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    orderType === 'TAKEAWAY'
                      ? 'bg-[#800000] text-white border-[#800000] shadow-xs'
                      : 'bg-white text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Takeaway
                </button>
                <button
                  type="button"
                  onClick={() => onSetOrderType('DELIVERY')}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    orderType === 'DELIVERY'
                      ? 'bg-[#800000] text-white border-[#800000] shadow-xs'
                      : 'bg-white text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  Delivery
                </button>
              </div>
            </div>

            {/* 2. Table Assignment (if Dine In) */}
            {orderType === 'DINE_IN' && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#800000] mb-1.5">
                  Assigned Table
                </label>
                <div className="flex gap-2">
                  <select
                    value={tableNumber}
                    onChange={(e) => onSetTableNumber(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-bold bg-white border border-[#ebd5da] rounded-xl text-[#800000] focus:ring-2 focus:ring-[#800000] focus:outline-none"
                  >
                    {tableOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter Table #"
                    value={tableNumber}
                    onChange={(e) => onSetTableNumber(e.target.value)}
                    className="w-36 px-3 py-2 text-xs font-bold bg-white border border-[#ebd5da] rounded-xl text-[#800000] focus:ring-2 focus:ring-[#800000] focus:outline-none placeholder-[#800000]/40"
                  />
                </div>
              </div>
            )}

            {/* 3. Customer Info (Optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#800000] mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-[#800000]/60" /> Customer Name
                </label>
                <input
                  type="text"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => onSetCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-[#ebd5da] rounded-xl text-[#800000] focus:ring-2 focus:ring-[#800000] focus:outline-none placeholder-[#800000]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#800000] mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#800000]/60" /> Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={customerPhone}
                  onChange={(e) => onSetCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-[#ebd5da] rounded-xl text-[#800000] focus:ring-2 focus:ring-[#800000] focus:outline-none placeholder-[#800000]/40"
                />
              </div>
            </div>

            {/* 4. Kitchen Instructions / Order Notes */}
            <div>
              <label className="block text-xs font-bold text-[#800000] mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-[#800000]/60" /> Kitchen / Billing Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Less spicy, pack curry separately"
                value={orderNotes}
                onChange={(e) => onSetOrderNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-[#ebd5da] rounded-xl text-[#800000] focus:ring-2 focus:ring-[#800000] focus:outline-none placeholder-[#800000]/40"
              />
            </div>

            {/* 5. Discount Section */}
            <div className="border border-[#ebd5da] rounded-xl p-3.5 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#800000] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#800000]" /> Discounts & Offers
                </span>
                {discount && (
                  <button
                    type="button"
                    onClick={onRemoveDiscount}
                    className="text-[11px] text-red-600 hover:underline font-bold"
                  >
                    Remove Discount
                  </button>
                )}
              </div>

              {discount ? (
                <div className="bg-[#fee8eb] border border-[#ebd5da] p-2.5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-[#800000]">
                      {discount.type === 'PERCENTAGE' ? `${discount.value}% OFF` : `₹${discount.value} Flat OFF`}
                    </span>
                    {discount.reason && (
                      <span className="text-[11px] text-[#800000]/70 block font-medium">
                        {discount.reason}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-black text-emerald-700">
                    -₹{discountAmount.toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleApplyPresetDiscount(pct)}
                        className="px-2.5 py-1 rounded-lg text-xs font-black border border-[#ebd5da] bg-[#fdf5f6] hover:bg-[#800000] hover:text-white transition-colors cursor-pointer text-[#800000]"
                      >
                        {pct}% OFF
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleCustomDiscountSubmit} className="flex gap-2 pt-1">
                    <select
                      value={discountInputType}
                      onChange={(e) => setDiscountInputType(e.target.value as DiscountType)}
                      className="px-2 py-1 text-xs font-bold border border-[#ebd5da] rounded-lg bg-[#fdf5f6] text-[#800000]"
                    >
                      <option value="PERCENTAGE">%</option>
                      <option value="FIXED">₹ Flat</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Value"
                      value={discountInputValue}
                      onChange={(e) => setDiscountInputValue(e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-bold border border-[#ebd5da] rounded-lg bg-white text-[#800000]"
                    />
                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs font-medium border border-[#ebd5da] rounded-lg bg-white text-[#800000] placeholder-[#800000]/40"
                    />
                    <button
                      type="submit"
                      disabled={!discountInputValue}
                      className="px-3 py-1 bg-[#800000] text-white text-xs font-black rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* 6. Order Financial Breakdown (Standard Indian GST 5%) */}
            <div className="border border-[#ebd5da] rounded-xl p-4 bg-white space-y-2 text-xs">
              <div className="flex justify-between text-[#800000]/80">
                <span>Items Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-bold">₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#800000]/80 pt-1 border-t border-[#ebd5da]/60">
                <span>Taxable Amount</span>
                <span>₹{taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#800000]/70">
                <span>CGST (2.5%)</span>
                <span>₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#800000]/70">
                <span>SGST (2.5%)</span>
                <span>₹{sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-[#800000] pt-2 border-t-2 border-[#800000]">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN: Payment Method & Settlement ================= */}
          <div className="lg:col-span-6 p-6 flex flex-col justify-between bg-white">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#800000] mb-3">
                Select Payment Mode
              </label>

              {/* Payment Mode Selector Tabs */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setActivePaymentMethod('CASH')}
                  className={`py-3 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    activePaymentMethod === 'CASH'
                      ? 'bg-[#800000] text-white border-[#800000] shadow-sm'
                      : 'bg-[#fdf5f6] text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentMethod('UPI')}
                  className={`py-3 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    activePaymentMethod === 'UPI'
                      ? 'bg-[#800000] text-white border-[#800000] shadow-sm'
                      : 'bg-[#fdf5f6] text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  UPI / QR
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentMethod('CARD')}
                  className={`py-3 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    activePaymentMethod === 'CARD'
                      ? 'bg-[#800000] text-white border-[#800000] shadow-sm'
                      : 'bg-[#fdf5f6] text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentMethod('SPLIT')}
                  className={`py-3 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    activePaymentMethod === 'SPLIT'
                      ? 'bg-[#800000] text-white border-[#800000] shadow-sm'
                      : 'bg-[#fdf5f6] text-[#800000] border-[#ebd5da] hover:bg-[#fee8eb]'
                  }`}
                >
                  <Split className="w-5 h-5" />
                  Split
                </button>
              </div>

              {activePaymentMethod !== 'CASH' && (
                <label className="flex items-start gap-2 mb-4 text-xs font-bold text-[#800000]">
                  <input type="checkbox" checked={paymentConfirmed} onChange={e => setPaymentConfirmed(e.target.checked)} />
                  I have verified receipt of this payment outside TalkOS (bank, UPI app or card terminal).
                </label>
              )}

              {/* Method Specific UI */}

              {/* 1. CASH PAYMENT */}
              {activePaymentMethod === 'CASH' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-[#800000] mb-1">
                      Cash Received from Customer (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-black text-base text-[#800000]">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 text-xl font-black bg-[#fdf5f6] border-2 border-[#ebd5da] rounded-xl text-[#800000] focus:border-[#800000] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Fast Denomination Buttons */}
                  <div>
                    <span className="block text-[11px] font-bold text-[#800000]/70 mb-1.5 uppercase tracking-wider">
                      Quick Cash Presets
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickCash(grandTotal)}
                        className="px-3 py-1.5 rounded-lg text-xs font-black bg-white border border-[#800000] text-[#800000] hover:bg-[#800000] hover:text-white transition-colors cursor-pointer"
                      >
                        Exact (₹{grandTotal.toFixed(0)})
                      </button>
                      {[100, 200, 500, 1000, 2000].filter(d => d >= grandTotal - 50).slice(0, 4).map((den) => (
                        <button
                          key={den}
                          type="button"
                          onClick={() => handleQuickCash(den)}
                          className="px-3 py-1.5 rounded-lg text-xs font-black bg-[#fdf5f6] border border-[#ebd5da] text-[#800000] hover:bg-[#800000] hover:text-white transition-colors cursor-pointer"
                        >
                          ₹{den}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change Due / Remaining Box */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${
                    tenderedNum >= grandTotal
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-amber-50 border-amber-500 text-amber-900'
                  }`}>
                    {tenderedNum >= grandTotal ? (
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                            Change to Return
                          </span>
                          <p className="text-2xl font-black text-emerald-700 mt-0.5">
                            ₹{changeDue.toFixed(2)}
                          </p>
                        </div>
                        <span className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                          ✓
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                            Amount Remaining Due
                          </span>
                          <p className="text-2xl font-black text-amber-700 mt-0.5">
                            ₹{remainingDue.toFixed(2)}
                          </p>
                        </div>
                        <span className="text-xs font-black text-amber-800 bg-amber-200 px-2 py-1 rounded">
                          Incomplete
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. UPI / QR PAYMENT */}
              {activePaymentMethod === 'UPI' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] flex flex-col items-center text-center">
                    {/* QR Code Graphic */}
                    <p className="text-sm font-bold text-[#800000]">Collect payment using your restaurant's own configured UPI account or QR display.</p>
                    <p className="text-xs text-[#800000]">Check the payment receipt in your bank or UPI app. This screen does not generate a payment QR or verify bank settlement.</p>
                    <p className="text-base font-black text-[#800000] mt-1">Amount: ₹{grandTotal.toFixed(2)}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#800000] mb-1">
                      Transaction UTR / Reference (Required)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 423985712903"
                      value={upiRef}
                      onChange={(e) => setUpiRef(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#fdf5f6] border border-[#ebd5da] rounded-xl text-[#800000] focus:ring-2 focus:ring-[#800000] focus:outline-none placeholder-[#800000]/40"
                    />
                  </div>
                </div>
              )}

              {/* 3. CARD PAYMENT */}
              {activePaymentMethod === 'CARD' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] space-y-3">
                    <span className="block text-xs font-black uppercase tracking-wider text-[#800000]">
                      POS Card Terminal
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['RuPay', 'Visa', 'MasterCard'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCardType(type)}
                          className={`py-2 px-2 text-xs font-black rounded-lg border cursor-pointer ${
                            cardType === type
                              ? 'bg-[#800000] text-white border-[#800000]'
                              : 'bg-white text-[#800000] border-[#ebd5da]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#800000] mb-1">
                        Last 4 Digits of Card (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="••••"
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 text-base tracking-widest font-mono font-bold bg-white border border-[#ebd5da] rounded-xl text-[#800000] focus:ring-2 focus:ring-[#800000] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                    💡 Swipe, insert chip, or tap card on the physical card reader for <strong>₹{grandTotal.toFixed(2)}</strong>.
                  </div>
                </div>
              )}

              {/* 4. SPLIT PAYMENT */}
              {activePaymentMethod === 'SPLIT' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] space-y-3">
                    <div>
                      <label className="block text-xs font-black text-[#800000] mb-1">
                        Cash Portion (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={grandTotal}
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        className="w-full px-3 py-2 text-lg font-black bg-white border border-[#ebd5da] rounded-xl text-[#800000]"
                      />
                    </div>
                    <div className="pt-2 border-t border-[#ebd5da] flex justify-between items-center text-xs font-bold">
                      <span>UPI / Card Balance</span>
                      <span className="text-base font-black text-[#800000]">
                        ₹{splitRemaining.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-4 border-t border-[#ebd5da] flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-3 px-5 rounded-xl border border-[#ebd5da] bg-[#fdf5f6] text-[#800000] font-black text-sm hover:bg-[#fee8eb] transition-colors cursor-pointer"
              >
                Back to POS
              </button>
              <button
                type="button"
                onClick={handleSettleOrder}
                disabled={isSubmitting || (activePaymentMethod === 'CASH' && tenderedNum < grandTotal)}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#800000] hover:bg-[#680016] text-white font-black text-base flex items-center justify-center transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Settling Bill...
                  </>
                ) : (
                  <>
                    Complete & Print Bill (₹{grandTotal.toFixed(2)}) →
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
