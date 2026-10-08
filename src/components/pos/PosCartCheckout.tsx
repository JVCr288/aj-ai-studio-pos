import React from 'react';
import { PosCartLineItem, PosPaymentMethod } from '../../types';
import { TenantConfig } from '../../config/tenantConfig';
import {
  User,
  Trash2,
  Minus,
  Plus,
  Upload,
  FileCheck,
  Receipt,
  Layers,
} from 'lucide-react';

interface PosCartCheckoutProps {
  tenant: TenantConfig;
  guestName: string;
  onGuestNameChange: (val: string) => void;
  clientPhone: string;
  onClientPhoneChange: (val: string) => void;
  linkedBookingRef?: string;
  cartItems: PosCartLineItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  subtotalMMK: number;
  depositCreditedMMK: number;
  totalDueMMK: number;
  paymentMethod: PosPaymentMethod;
  onSelectPaymentMethod: (method: PosPaymentMethod) => void;
  tenderedCashInput: string;
  onTenderedCashInputChange: (val: string) => void;
  changeDueMMK: number;
  splitCashInput: string;
  onSplitCashInputChange: (val: string) => void;
  splitDigitalInput: string;
  onSplitDigitalInputChange: (val: string) => void;
  isOcrVerifying: boolean;
  ocrResult: { transaction_id?: string | null; amount_mmk?: number | null } | null;
  onSlipFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCompleteCheckout: () => void;
  onKickDrawer?: () => void;
  drawerStatusMessage?: string | null;
}

export const PosCartCheckout: React.FC<PosCartCheckoutProps> = ({
  tenant,
  guestName,
  onGuestNameChange,
  clientPhone,
  onClientPhoneChange,
  linkedBookingRef,
  cartItems,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  subtotalMMK,
  depositCreditedMMK,
  totalDueMMK,
  paymentMethod,
  onSelectPaymentMethod,
  tenderedCashInput,
  onTenderedCashInputChange,
  changeDueMMK,
  splitCashInput,
  onSplitCashInputChange,
  splitDigitalInput,
  onSplitDigitalInputChange,
  isOcrVerifying,
  ocrResult,
  onSlipFileUpload,
  onCompleteCheckout,
  onKickDrawer,
  drawerStatusMessage,
}) => {
  return (
    <div className="w-full md:w-[400px] lg:w-[450px] bg-[#071423] flex flex-col shrink-0 border-t md:border-t-0 md:border-l border-[#1E3A4F]">
      {/* Active Customer Details Banner */}
      <div className="p-3 sm:p-3.5 border-b border-[#1E3A4F] bg-[#102538]/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center space-x-1">
            <User className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Customer / Client</span>
          </span>
          <div className="flex items-center space-x-2">
            {onKickDrawer && (
              <button
                type="button"
                onClick={onKickDrawer}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                title="Pop open cash drawer manually via ESC/POS pulse"
              >
                ⚡ Kick Drawer
              </button>
            )}
            {linkedBookingRef && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 font-bold truncate max-w-[140px]">
                {linkedBookingRef}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <input
            type="text"
            value={guestName}
            onChange={(e) => onGuestNameChange(e.target.value)}
            placeholder="Guest Name"
            className="bg-[#071423] border border-[#1E3A4F] rounded-lg px-2.5 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
          />
          <input
            type="text"
            value={clientPhone}
            onChange={(e) => onClientPhoneChange(e.target.value)}
            placeholder="Phone Number"
            className="bg-[#071423] border border-[#1E3A4F] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
          />
        </div>
      </div>

      {/* Cart Line Items Table */}
      <div className="flex-1 p-3 overflow-y-auto max-h-[38vh] md:max-h-none space-y-2">
        <div className="flex items-center justify-between text-xs text-[#64748B] font-mono pb-1 border-b border-[#1E3A4F]/60">
          <span>ITEMS ({cartItems.length})</span>
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="text-rose-400 hover:text-rose-300 text-[11px] cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {cartItems.map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg bg-[#030F1E] border border-[#1E3A4F] flex items-center justify-between space-x-2 text-xs"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[#F1F5F9] truncate">{item.title}</div>
              <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-[#64748B] font-mono">
                <span className="text-[#38BDF8]">{item.unitPriceMMK.toLocaleString()} MMK</span>
                {item.notes && <span className="truncate max-w-[120px]"> • {item.notes}</span>}
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center space-x-1 shrink-0 bg-[#071423] border border-[#1E3A4F] rounded-lg p-0.5 font-mono">
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.id, -1)}
                className="p-1 hover:bg-[#1E3A4F] rounded text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.id, 1)}
                className="p-1 hover:bg-[#1E3A4F] rounded text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRemoveFromCart(item.id)}
              className="text-[#64748B] hover:text-rose-400 p-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {cartItems.length === 0 && (
          <div className="p-8 text-center text-[#64748B] text-xs font-mono">
            No items on register ticket. Select items or packages on the left.
          </div>
        )}
      </div>

      {/* Ledger Financial Summary */}
      <div className="p-3 sm:p-3.5 border-t border-[#1E3A4F] bg-[#102538]/40 space-y-1.5 text-xs font-mono">
        <div className="flex items-center justify-between text-[#94A3B8]">
          <span>Subtotal:</span>
          <span>{subtotalMMK.toLocaleString()} MMK</span>
        </div>

        {depositCreditedMMK > 0 && (
          <div className="flex items-center justify-between text-[#34D399]">
            <span>Deposit Credited:</span>
            <span>-{depositCreditedMMK.toLocaleString()} MMK</span>
          </div>
        )}

        <div className="pt-2 border-t border-[#1E3A4F] flex items-center justify-between text-sm font-bold">
          <span className="text-[#F1F5F9]">TOTAL BALANCE DUE:</span>
          <span className="text-[#38BDF8] text-base">{totalDueMMK.toLocaleString()} MMK</span>
        </div>
      </div>

      {/* Payment Method Selector & Cash Tender */}
      <div className="p-3 sm:p-3.5 border-t border-[#1E3A4F] bg-[#071423] space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {(['CASH', 'KBZPAY', 'WAVEPAY', 'SPLIT'] as PosPaymentMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => onSelectPaymentMethod(method)}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                paymentMethod === method
                  ? 'bg-[#38BDF8] text-[#071423] shadow'
                  : 'bg-[#102538] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Cash Tender Calculation */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-2 bg-[#030F1E] p-2.5 rounded-lg border border-[#1E3A4F]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">Tendered Cash:</span>
              <input
                type="text"
                value={tenderedCashInput}
                onChange={(e) => onTenderedCashInputChange(e.target.value)}
                placeholder={totalDueMMK.toLocaleString()}
                className="w-28 text-right bg-[#071423] border border-[#1E3A4F] rounded px-2 py-0.5 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>

            <div className="flex items-center space-x-1 overflow-x-auto pb-0.5">
              {[totalDueMMK, 50000, 100000, 200000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onTenderedCashInputChange(amt.toLocaleString())}
                  className="px-2 py-0.5 rounded bg-[#102538] hover:bg-[#1E3A4F] text-[10px] font-mono text-[#38BDF8] border border-[#1E3A4F] cursor-pointer shrink-0"
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-[#1E3A4F]/60">
              <span className="text-[#F1F5F9]">Change Due:</span>
              <span className="text-[#34D399] font-mono">{changeDueMMK.toLocaleString()} MMK</span>
            </div>

            {drawerStatusMessage && (
              <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded text-center font-mono">
                {drawerStatusMessage}
              </div>
            )}
          </div>
        )}

        {/* Split Tender Allocation */}
        {paymentMethod === 'SPLIT' && (
          <div className="space-y-2 bg-[#030F1E] p-2.5 rounded-lg border border-[#1E3A4F] text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Cash Part:</span>
              <input
                type="text"
                value={splitCashInput}
                onChange={(e) => onSplitCashInputChange(e.target.value)}
                placeholder="0"
                className="w-28 text-right bg-[#071423] border border-[#1E3A4F] rounded px-2 py-0.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Digital Part:</span>
              <input
                type="text"
                value={splitDigitalInput}
                onChange={(e) => onSplitDigitalInputChange(e.target.value)}
                placeholder={totalDueMMK.toLocaleString()}
                className="w-28 text-right bg-[#071423] border border-[#1E3A4F] rounded px-2 py-0.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>
        )}

        {/* Mobile Wallets / QR Check */}
        {(paymentMethod === 'KBZPAY' || paymentMethod === 'WAVEPAY') && (
          <div className="bg-[#030F1E] p-2.5 rounded-lg border border-[#1E3A4F] flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-xs font-bold text-[#F1F5F9] block truncate">{paymentMethod} Scan</span>
              <p className="text-[11px] text-[#94A3B8] font-mono truncate">
                Account: 09 792 108 421 ({tenant.displayName})
              </p>
            </div>
            <label className="px-2.5 py-1 rounded bg-[#38BDF8]/20 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>{isOcrVerifying ? 'Verifying...' : 'Audit Slip'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={onSlipFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {ocrResult && (
          <div className="p-2 rounded-lg bg-[#34D399]/10 border border-[#34D399]/30 text-xs text-[#34D399] flex items-center space-x-1.5 font-mono">
            <FileCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">AI Verified: Trx {ocrResult.transaction_id || 'Valid'} · MMK {ocrResult.amount_mmk?.toLocaleString()}</span>
          </div>
        )}

        {/* Complete Checkout Button */}
        <button
          type="button"
          onClick={onCompleteCheckout}
          disabled={cartItems.length === 0}
          className="w-full py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] disabled:bg-[#1E3A4F] disabled:text-[#64748B] text-[#071423] font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#38BDF8]/20 flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
        >
          <Receipt className="w-4 h-4" />
          <span>Complete &amp; Print Receipt</span>
        </button>
      </div>
    </div>
  );
};
