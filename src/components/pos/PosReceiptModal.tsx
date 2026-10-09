import React from 'react';
import { PosTransaction } from '../../types';
import { TenantConfig } from '../../config/tenantConfig';
import { Printer, Zap, RotateCcw } from 'lucide-react';

interface PosReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PosTransaction | null;
  tenant: TenantConfig;
  printerStatusMessage: string | null;
  isDirectPrinting: boolean;
  onDirectThermalPrint: () => void;
  onKickDrawer?: () => void;
  onNewSale: () => void;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  tenant,
  printerStatusMessage,
  isDirectPrinting,
  onDirectThermalPrint,
  onKickDrawer,
  onNewSale,
}) => {
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm bg-white text-black font-mono rounded-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 select-text">
        {/* Printable Receipt Area */}
        <div id="thermal-receipt-print-area" className="text-center space-y-2 text-xs">
          <div className="font-bold text-base tracking-wider">{tenant.legalName}</div>
          <div className="text-[11px] text-gray-600">{tenant.address}</div>
          <div className="text-[11px] text-gray-600">Tel: {tenant.phone}</div>
          <div className="text-[10px] text-gray-500">Tax ID: {tenant.taxIdentifier || 'REG-MM-2026'}</div>

          <div className="border-t border-b border-dashed border-gray-400 py-1.5 text-[11px] text-left">
            <div>Receipt No: <strong>{transaction.receiptNumber}</strong></div>
            <div>Date: {new Date(transaction.timestamp).toLocaleString()}</div>
            <div>Cashier: {transaction.cashierName} · {transaction.terminalId}</div>
            <div>Client: {transaction.customerName} ({transaction.customerPhone})</div>
            {transaction.bayAllocation && (
              <div>Bay: {transaction.bayAllocation}</div>
            )}
          </div>

          {/* Items */}
          <div className="text-left space-y-1 py-2">
            {transaction.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <span className="truncate max-w-[180px]">
                  {item.quantity}x {item.title}
                </span>
                <span>{(item.unitPriceMMK * item.quantity).toLocaleString()} MMK</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-right text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{transaction.subtotalMMK.toLocaleString()} MMK</span>
            </div>
            {transaction.depositCreditedMMK > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Deposit Credited:</span>
                <span>-{transaction.depositCreditedMMK.toLocaleString()} MMK</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1">
              <span>TOTAL DUE:</span>
              <span>{transaction.totalDueMMK.toLocaleString()} MMK</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tendered ({transaction.paymentMethod}):</span>
              <span>{(transaction.tenderedCashMMK || transaction.totalDueMMK).toLocaleString()} MMK</span>
            </div>
            {transaction.changeDueMMK !== undefined && transaction.changeDueMMK > 0 && (
              <div className="flex justify-between font-bold text-gray-900">
                <span>Change:</span>
                <span>{transaction.changeDueMMK.toLocaleString()} MMK</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 pt-3 text-center space-y-1">
            <div className="font-bold text-[11px]">THANK YOU FOR CHOOSING OUR ATELIER</div>
            <div className="text-[10px] text-gray-500">Master raw images preserved for 14 days</div>
            <div className="text-[9px] text-gray-400 font-mono">POWERED BY AJ STUDIO DESK v2.4</div>
          </div>
        </div>

        {/* Printer Status Feedback */}
        {printerStatusMessage && (
          <div className="mb-2 p-2 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 text-center font-medium">
            {printerStatusMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onDirectThermalPrint}
              disabled={isDirectPrinting}
              className="flex-1 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Send raw ESC/POS binary directly to USB thermal printer, cut paper & kick drawer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isDirectPrinting ? 'Sending...' : 'Direct ESC/POS'}</span>
            </button>

            {onKickDrawer && (
              <button
                type="button"
                onClick={onKickDrawer}
                className="py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                title="Trigger ESC/POS cash drawer kick pulse immediately"
              >
                <span>Kick Drawer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 py-2.5 rounded-lg bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              title="Standard Browser Print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onNewSale();
            }}
            className="w-full py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start New Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
