import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BookingState,
  EquipmentItem,
  EquipmentCategory,
  InvoiceLineItem,
  PaymentGateway,
} from '../types';
import { TenantConfig, activeTenantConfig } from '../config/tenantConfig';
import {
  EQUIPMENT_CATEGORIES,
  INITIAL_EQUIPMENT_LIST,
  getGearRentalRate,
} from '../data/equipmentData';
import {
  Printer,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Search,
  Sliders,
  ShieldCheck,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Camera,
  Layers,
  Zap,
  Aperture,
  Tag,
  Share2,
} from 'lucide-react';

interface ClientInvoiceGeneratorProps {
  bookingState: BookingState;
  onNavigateToGearInventory?: () => void;
  tenantConfig?: TenantConfig;
}

const STORAGE_KEY = 'akk_studio_equipment_inventory_v1';

export const ClientInvoiceGenerator: React.FC<ClientInvoiceGeneratorProps> = ({
  bookingState,
  onNavigateToGearInventory,
  tenantConfig = activeTenantConfig,
}) => {
  const activeTenant = tenantConfig;

  // Load gear inventory from localStorage or fallback
  const [equipmentList] = useState<EquipmentItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_EQUIPMENT_LIST;
  });

  // Invoice Style Mode
  const [invoiceTheme, setInvoiceTheme] = useState<'paper' | 'dark'>('paper');

  // Invoice Metadata State
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => `${activeTenant.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [issueDate, setIssueDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });

  const [clientName, setClientName] = useState(bookingState.guestName || 'Client');
  const [clientPhone, setClientPhone] = useState(bookingState.clientPhone || activeTenant.phone);
  const [sessionTitle, setSessionTitle] = useState(
    `${bookingState.selectedPackage.name} (${bookingState.bayAllocation || 'BAY ALPHA-01'})`
  );
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'deposit_paid' | 'pending' | 'due'>('deposit_paid');
  const normalizedInitialGateway = (bookingState.gateway === 'CB / AYA' ? 'AYA Pay' : bookingState.gateway) || 'KBZPay';
  const [paymentMethod, setPaymentMethod] = useState<PaymentGateway | 'Cash at Studio'>(normalizedInitialGateway);

  useEffect(() => {
    if (bookingState.gateway) {
      const gw = bookingState.gateway === 'CB / AYA' ? 'AYA Pay' : bookingState.gateway;
      setPaymentMethod(gw);
    }
  }, [bookingState.gateway]);

  // Financial Options
  const [includePackage, setIncludePackage] = useState(true);
  const [applyDeposit, setApplyDeposit] = useState(true);
  const [discountMMK, setDiscountMMK] = useState(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [customStudioNote, setCustomStudioNote] = useState(
    activeTenant.invoiceFooterNote ||
      'All equipment handed over in working condition. Standard studio rental terms apply.'
  );

  // Search & Filter for Gear Selector
  const [gearSearch, setGearSearch] = useState('');
  const [gearCategory, setGearCategory] = useState<string>('all');

  // Selected Equipment Items for Invoice
  // Default: Pre-select equipment assigned to the client's current bay or status === 'in_use'
  const [selectedGearMap, setSelectedGearMap] = useState<
    Record<string, { quantity: number; unitRate: number; customNote?: string }>
  >(() => {
    const map: Record<string, { quantity: number; unitRate: number; customNote?: string }> = {};
    const bayItems = equipmentList.filter(
      (item) =>
        item.allocatedBay === bookingState.bayAllocation ||
        (item.allocatedBay === 'BAY ALPHA-01' && item.status === 'in_use')
    );
    const initialItems = bayItems.length > 0 ? bayItems : equipmentList.slice(0, 4);
    initialItems.forEach((item) => {
      map[item.id] = {
        quantity: 1,
        unitRate: getGearRentalRate(item),
      };
    });
    return map;
  });

  // UI Toasts
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Quick Action: Select all bay gear
  const handleSelectAllBayGear = () => {
    const newMap: Record<string, { quantity: number; unitRate: number }> = {};
    equipmentList
      .filter(
        (item) =>
          item.allocatedBay === bookingState.bayAllocation ||
          item.allocatedBay.includes('BAY ALPHA-01') ||
          item.status === 'in_use'
      )
      .forEach((item) => {
        newMap[item.id] = {
          quantity: 1,
          unitRate: getGearRentalRate(item),
        };
      });
    setSelectedGearMap(newMap);
    showToast('Allocated Bay Gear Selected');
  };

  // Toggle gear item selection
  const handleToggleGear = (item: EquipmentItem) => {
    setSelectedGearMap((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = {
          quantity: 1,
          unitRate: getGearRentalRate(item),
        };
      }
      return next;
    });
  };

  // Update item quantity
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setSelectedGearMap((prev) => {
      const item = prev[itemId];
      if (!item) return prev;
      const newQty = Math.max(1, item.quantity + delta);
      return {
        ...prev,
        [itemId]: { ...item, quantity: newQty },
      };
    });
  };

  // Update unit rate
  const handleUpdateUnitRate = (itemId: string, newRate: number) => {
    setSelectedGearMap((prev) => {
      const item = prev[itemId];
      if (!item) return prev;
      return {
        ...prev,
        [itemId]: { ...item, unitRate: Math.max(0, newRate) },
      };
    });
  };

  // Filtered gear items for the picker
  const filteredGear = useMemo(() => {
    return equipmentList.filter((item) => {
      const matchesCat = gearCategory === 'all' || item.category === gearCategory;
      const query = gearSearch.toLowerCase().trim();
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.myanmarName && item.myanmarName.toLowerCase().includes(query)) ||
        item.assetCode.toLowerCase().includes(query) ||
        item.serialNumber.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });
  }, [equipmentList, gearCategory, gearSearch]);

  // Invoice Line Items construction
  const invoiceLines = useMemo<InvoiceLineItem[]>(() => {
    const lines: InvoiceLineItem[] = [];

    // 1. Session Package (if included)
    if (includePackage) {
      lines.push({
        id: 'pkg-studio-session',
        description: `${bookingState.selectedPackage.name} Session Fee`,
        myanmarDescription: 'စတူဒီယို သီးသန့် ဓာတ်ပုံရိုက်ကူးမှု အခကြေးငွေ',
        category: 'Studio Session',
        assetCode: bookingState.manifestId || `${activeTenant.invoicePrefix || 'INV'}-BAY-A1`,
        quantity: 1,
        unitPriceMMK: bookingState.selectedPackage.price,
        totalPriceMMK: bookingState.selectedPackage.price,
        isGear: false,
        notes: `${bookingState.bayAllocation} • Retouched Masters + RAW Library`,
      });
    }

    // 2. Selected Equipment Items
    Object.entries(selectedGearMap).forEach(([itemId, rawConfig]) => {
      const config = rawConfig as { quantity: number; unitRate: number; customNote?: string };
      const eq = equipmentList.find((g) => g.id === itemId);
      if (!eq) return;
      lines.push({
        id: eq.id,
        equipmentId: eq.id,
        description: eq.name,
        myanmarDescription: eq.myanmarName,
        category: eq.category.toUpperCase().replace('_', ' '),
        assetCode: eq.assetCode,
        serialNumber: eq.serialNumber,
        quantity: config.quantity,
        unitPriceMMK: config.unitRate,
        totalPriceMMK: config.unitRate * config.quantity,
        isGear: true,
        notes: `S/N: ${eq.serialNumber} • ${eq.allocatedBay}`,
      });
    });

    return lines;
  }, [includePackage, bookingState, selectedGearMap, equipmentList]);

  // Financial Calculations
  const packageTotal = includePackage ? bookingState.selectedPackage.price : 0;
  const gearSubtotal = useMemo(() => {
    return Object.values(selectedGearMap).reduce<number>((sum, config) => {
      const itemConfig = config as { quantity: number; unitRate: number };
      return sum + itemConfig.unitRate * itemConfig.quantity;
    }, 0);
  }, [selectedGearMap]);

  const grossSubtotal = packageTotal + gearSubtotal;
  const taxableAmount = Math.max(0, grossSubtotal - discountMMK);
  const taxAmount = Math.round((taxableAmount * taxPercent) / 100);
  const grandTotal = taxableAmount + taxAmount;
  const depositCredit = applyDeposit ? bookingState.depositAmount || 0 : 0;
  const balanceDue = Math.max(0, grandTotal - depositCredit);

  // Selected gear count
  const selectedCount = Object.keys(selectedGearMap).length;

  // Print Invoice Action
  const handlePrint = () => {
    window.print();
  };

  // Copy Plaintext Invoice for Telegram/Viber
  const handleCopyText = () => {
    const textLines = [
      `=========================================`,
      activeTenant.receiptHeader || `${activeTenant.displayName.toUpperCase()} // OFFICIAL INVOICE`,
      `=========================================`,
      `Invoice No : ${invoiceNumber}`,
      `Date       : ${issueDate} (Due: ${dueDate})`,
      `Client     : ${clientName} (${clientPhone})`,
      `Allocation : ${sessionTitle}`,
      `Token      : ${bookingState.token}`,
      `Status     : ${paymentStatus.toUpperCase().replace('_', ' ')}`,
      `-----------------------------------------`,
      `ITEMIZED SERVICES & GEAR ALLOCATION:`,
      ...invoiceLines.map(
        (l, i) =>
          `${String(i + 1).padStart(2, '0')}. ${l.description} [${l.assetCode || 'N/A'}] x${l.quantity} = ${l.totalPriceMMK.toLocaleString()} MMK`
      ),
      `-----------------------------------------`,
      `Subtotal          : ${grossSubtotal.toLocaleString()} MMK`,
      discountMMK > 0 ? `Discount          : -${discountMMK.toLocaleString()} MMK` : null,
      taxPercent > 0 ? `Commercial Tax (${taxPercent}%): +${taxAmount.toLocaleString()} MMK` : null,
      `Grand Total       : ${grandTotal.toLocaleString()} MMK`,
      depositCredit > 0 ? `Deposit Paid      : -${depositCredit.toLocaleString()} MMK` : null,
      `-----------------------------------------`,
      `BALANCE PAYABLE   : ${balanceDue.toLocaleString()} MMK`,
      `Payment Method    : ${paymentMethod}`,
      `Remittance Account: ${activeTenant.remittanceAccount}`,
      `=========================================`,
      `${activeTenant.address}.`,
    ]
      .filter(Boolean)
      .join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textLines);
    }
    showToast('Invoice text copied for Telegram/Viber!');
  };

  // Download Standalone Branded HTML Invoice
  const handleDownloadHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoiceNumber} - ${activeTenant.displayName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 40px 20px; color: #18181b; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e4e4e7; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #18181b; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .sub { font-size: 12px; color: #71717a; margin-top: 4px; font-family: monospace; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #38bdf8; color: #09090b; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; font-size: 13px; }
    .meta-col { background: #fafafa; border: 1px solid #f4f4f5; padding: 14px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { text-align: left; padding: 10px; background: #f4f4f5; border-bottom: 1px solid #e4e4e7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 12px 10px; border-bottom: 1px solid #f4f4f5; }
    .text-right { text-align: right; }
    .totals { width: 320px; margin-left: auto; margin-bottom: 30px; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f4f4f5; }
    .grand-total { font-size: 16px; font-weight: 800; border-top: 2px solid #18181b; border-bottom: 2px solid #18181b; padding: 10px 0; }
    .footer { border-top: 1px solid #e4e4e7; padding-top: 20px; font-size: 11px; color: #71717a; line-height: 1.6; }
    .stamp { display: inline-block; border: 2px solid #dc2626; color: #dc2626; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 11px; letter-spacing: 1px; transform: rotate(-4deg); }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand">${activeTenant.legalName || activeTenant.displayName}</div>
        <div class="sub">${activeTenant.invoiceSubtitle || activeTenant.address.toUpperCase()}</div>
        <div class="sub">${activeTenant.registrationNumber} • TEL: ${activeTenant.phone}</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">EQUIPMENT &amp; SERVICE INVOICE</span>
        <div style="font-size: 16px; font-weight: 700; margin-top: 8px;">${invoiceNumber}</div>
        <div class="sub">Issued: ${issueDate}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <strong>BILLED TO:</strong><br/>
        Name: ${clientName}<br/>
        Phone: ${clientPhone}<br/>
        Manifest Token: ${bookingState.token}<br/>
        Session Bay: ${bookingState.bayAllocation || 'BAY ALPHA-01'}
      </div>
      <div class="meta-col">
        <strong>STATEMENT DETAILS:</strong><br/>
        Status: <strong>${paymentStatus.toUpperCase().replace('_', ' ')}</strong><br/>
        Payment Method: ${paymentMethod}<br/>
        Remittance Account: ${activeTenant.remittanceAccount}<br/>
        Due Date: ${dueDate}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item / Gear Description</th>
          <th>Asset Code</th>
          <th>Qty</th>
          <th class="text-right">Rate (MMK)</th>
          <th class="text-right">Total (MMK)</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceLines
          .map(
            (l, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${l.description}</strong><br/><span style="font-size:11px;color:#71717a;">${l.myanmarDescription || ''}</span></td>
            <td><code>${l.assetCode || 'N/A'}</code></td>
            <td>${l.quantity}</td>
            <td class="text-right">${l.unitPriceMMK.toLocaleString()}</td>
            <td class="text-right"><strong>${l.totalPriceMMK.toLocaleString()}</strong></td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Gross Subtotal:</span><span>${grossSubtotal.toLocaleString()} MMK</span></div>
      ${discountMMK > 0 ? `<div class="totals-row"><span>Courtesy Discount:</span><span>-${discountMMK.toLocaleString()} MMK</span></div>` : ''}
      ${taxPercent > 0 ? `<div class="totals-row"><span>Commercial Tax (${taxPercent}%):</span><span>+${taxAmount.toLocaleString()} MMK</span></div>` : ''}
      <div class="totals-row"><span>Grand Total:</span><span><strong>${grandTotal.toLocaleString()} MMK</strong></span></div>
      ${depositCredit > 0 ? `<div class="totals-row" style="color:#059669;"><span>Deposit Credited:</span><span>-${depositCredit.toLocaleString()} MMK</span></div>` : ''}
      <div class="totals-row grand-total"><span>BALANCE PAYABLE:</span><span>${balanceDue.toLocaleString()} MMK</span></div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding:15px; background:#f9fafb; border-radius:8px;">
      <div>
        <div class="stamp">${activeTenant.displayName.toUpperCase()} GEAR MANIFEST</div>
      </div>
      <div style="text-align:right; font-size:12px;">
        <div style="font-family:cursive; font-size:18px; color:#18181b;">${activeTenant.ownerName}</div>
        <div style="color:#71717a;">${activeTenant.authorizedSignatureTitle || 'Studio Director'}</div>
      </div>
    </div>

    <div class="footer" style="margin-top:20px;">
      <strong>Studio Terms:</strong> ${customStudioNote}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${invoiceNumber}_${clientName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Invoice HTML Document Downloaded!');
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg bg-[#34D399] text-[#071423] font-mono text-xs font-bold shadow-xl flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Sub-section Header & Quick Action Launcher */}
      <div className="glass-plate hairline-copper-top border border-[rgba(120,165,190,0.18)] rounded-xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-ui font-bold text-xl text-[#F1F5F9] tracking-tight">
                  Client Invoice &amp; Gear Manifest Generator
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-ui text-[10px] font-semibold">
                  PDF Snippet
                </span>
              </div>
              <p className="font-ui text-xs text-[#7E8F9F] mt-1">
                Select precision studio gear, bundle photography packages, and generate branded PDF-style client statements for remittance.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSelectAllBayGear}
              className="px-3.5 py-2 rounded-lg bg-[#102538] hover:bg-[#102538]/80 border border-[#1E3A4F] hover:border-[#38BDF8]/50 text-xs font-ui font-semibold text-[#F1F5F9] flex items-center space-x-1.5 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              <Zap className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Select {bookingState.bayAllocation || 'Bay'} Gear ({equipmentList.filter(i => i.allocatedBay === bookingState.bayAllocation || i.status === 'in_use').length})</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-ui font-semibold text-xs flex items-center space-x-1.5 shadow-[0_0_15px_rgba(56,189,248,0.25)] transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Controls + Right Live PDF-Style Invoice Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Gear Inventory Picker (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 no-print">
          {/* Section 1: Gear Selection Box */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-ui font-bold text-sm text-[#F1F5F9]">
                  1. Studio Gear Selection
                </h3>
              </div>
              <span className="font-ui text-xs px-2 py-0.5 rounded bg-[#030F1E] border border-[#1E3A4F] text-[#38BDF8]">
                {selectedCount} Items Included
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-ui scrollbar-thin scrollbar-thumb-[#1E3A4F]">
              <button
                type="button"
                onClick={() => setGearCategory('all')}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                  gearCategory === 'all'
                    ? 'bg-[#38BDF8] text-[#071423] font-semibold'
                    : 'bg-[#102538] text-[#7E8F9F] hover:text-[#F1F5F9] border border-[#1E3A4F]'
                }`}
              >
                All Gear
              </button>
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setGearCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                    gearCategory === cat.id
                      ? 'bg-[#38BDF8] text-[#071423] font-semibold'
                      : 'bg-[#102538] text-[#7E8F9F] hover:text-[#F1F5F9] border border-[#1E3A4F]'
                  }`}
                >
                  {cat.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Gear Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7E8F9F] absolute left-3 top-3" />
              <input
                type="text"
                value={gearSearch}
                onChange={(e) => setGearSearch(e.target.value)}
                placeholder="Search gear by name, code or serial..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-xs font-ui text-[#F1F5F9] placeholder-[#7E8F9F] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
              />
            </div>

            {/* Gear Item List (Scrollable) */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredGear.map((item) => {
                const isSelected = !!selectedGearMap[item.id];
                const config = selectedGearMap[item.id];
                const itemRate = config ? config.unitRate : getGearRentalRate(item);

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-[#38BDF8]/10 border-[#38BDF8]/50 text-[#F1F5F9]'
                        : 'bg-[#030F1E] hover:bg-[#102538] border-[#1E3A4F] text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="flex items-center space-x-2.5 flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleToggleGear(item)}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#38BDF8] border-[#38BDF8] text-[#071423]'
                              : 'border-[#1E3A4F] bg-[#102538]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-9 h-9 rounded-md object-cover border border-[#1E3A4F] flex-shrink-0"
                        />

                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate font-ui text-[#F1F5F9]">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-[#7E8F9F] font-ui flex items-center gap-1.5">
                            <span className="font-mono-code text-[#38BDF8]">{item.assetCode}</span>
                            <span>•</span>
                            <span className="truncate">{item.allocatedBay}</span>
                          </div>
                        </div>
                      </div>

                      {/* Price & Quantity Controls */}
                      <div className="flex items-center space-x-2 flex-shrink-0 font-ui tabular-nums text-xs">
                        <span className="text-[#F1F5F9] font-semibold">
                          {itemRate.toLocaleString()} K
                        </span>

                        {isSelected && (
                          <div className="flex items-center space-x-1 bg-[#0B1B2B] border border-[#1E3A4F] rounded-md px-1 py-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQuantity(item.id, -1);
                              }}
                              className="w-4 h-4 text-[#7E8F9F] hover:text-[#F1F5F9] flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-[#38BDF8] px-1">
                              {config.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQuantity(item.id, 1);
                              }}
                              className="w-4 h-4 text-[#7E8F9F] hover:text-[#F1F5F9] flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Invoice Metadata & Billing Configuration */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-lg p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E3A4F] pb-3">
              <CreditCard className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="font-ui font-bold text-sm text-[#F1F5F9]">
                2. Statement &amp; Remittance Details
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 font-ui text-xs">
              <div>
                <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] font-mono-code text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>
              <div>
                <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                >
                  <option value="deposit_paid" className="bg-[#0B1B2B] text-[#F1F5F9]">Deposit Paid (Balance Due)</option>
                  <option value="paid" className="bg-[#0B1B2B] text-[#F1F5F9]">Paid in Full (Clear)</option>
                  <option value="pending" className="bg-[#0B1B2B] text-[#F1F5F9]">Pending Transfer</option>
                  <option value="due" className="bg-[#0B1B2B] text-[#F1F5F9]">Full Balance Due</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Payment Gateway</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                >
                  <option value="KBZPay" className="bg-[#0B1B2B] text-[#F1F5F9]">KBZPay Mobile</option>
                  <option value="WavePay" className="bg-[#0B1B2B] text-[#F1F5F9]">WavePay Mobile</option>
                  <option value="AYA Pay" className="bg-[#0B1B2B] text-[#F1F5F9]">AYA Pay Direct</option>
                  <option value="Cash at Studio" className="bg-[#0B1B2B] text-[#F1F5F9]">Cash at Studio Bay</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>
              <div>
                <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Client Phone</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>

              <div>
                <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>
              <div>
                <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>
            </div>

            {/* Package & Deposit Toggles */}
            <div className="space-y-2 pt-2 border-t border-[#1E3A4F] font-ui text-xs">
              <label className="flex items-center space-x-2 cursor-pointer text-[#94A3B8]">
                <input
                  type="checkbox"
                  checked={includePackage}
                  onChange={(e) => setIncludePackage(e.target.checked)}
                  className="rounded border-[#1E3A4F] bg-[#030F1E] text-[#38BDF8] focus:ring-0"
                />
                <span>Include Base Package ({bookingState.selectedPackage.name} — {bookingState.selectedPackage.price.toLocaleString()} MMK)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-[#94A3B8]">
                <input
                  type="checkbox"
                  checked={applyDeposit}
                  onChange={(e) => setApplyDeposit(e.target.checked)}
                  className="rounded border-[#1E3A4F] bg-[#030F1E] text-[#34D399] focus:ring-0"
                />
                <span className="text-[#34D399]">Credit Deposit Already Paid (-{bookingState.depositAmount.toLocaleString()} MMK)</span>
              </label>
            </div>

            {/* Discount & Tax */}
            <div className="grid grid-cols-2 gap-3 pt-2 font-ui text-xs">
              <div>
                <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Courtesy Discount (MMK)</label>
                <input
                  type="number"
                  value={discountMMK}
                  onChange={(e) => setDiscountMMK(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>
              <div>
                <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Commercial Tax (%)</label>
                <select
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                >
                  <option value={0} className="bg-[#0B1B2B] text-[#F1F5F9]">0% (Tax Exempt)</option>
                  <option value={5} className="bg-[#0B1B2B] text-[#F1F5F9]">5% (Myanmar Commercial Tax)</option>
                </select>
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="text-xs text-[#7E8F9F] block mb-1 font-ui font-medium">Studio Terms / Warranty Note</label>
              <textarea
                rows={2}
                value={customStudioNote}
                onChange={(e) => setCustomStudioNote(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-xs font-ui text-[#F1F5F9] placeholder-[#7E8F9F] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Branded PDF-Style Invoice Snippet Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 font-ui">
          {/* Top Bar for Snippet Preview */}
          <div className="flex items-center justify-between flex-wrap gap-2 no-print bg-[#0B1B2B] border border-[#1E3A4F] rounded-lg px-4 py-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span className="font-ui font-bold text-xs text-[#F1F5F9]">
                Branded PDF-Style Invoice Snippet
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Paper vs Dark Theme Switcher */}
              <div className="flex items-center p-0.5 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-xs font-ui">
                <button
                  type="button"
                  onClick={() => setInvoiceTheme('paper')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer focus:outline-none ${
                    invoiceTheme === 'paper'
                      ? 'bg-[#F1F5F9] text-[#071423] font-semibold shadow-sm'
                      : 'text-[#7E8F9F] hover:text-[#F1F5F9]'
                  }`}
                >
                  📄 Paper Print View
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceTheme('dark')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer focus:outline-none ${
                    invoiceTheme === 'dark'
                      ? 'bg-[#38BDF8] text-[#071423] font-semibold shadow-sm'
                      : 'text-[#7E8F9F] hover:text-[#F1F5F9]'
                  }`}
                >
                  🌑 Studio Dark View
                </button>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleCopyText}
                className="p-1.5 rounded-md bg-[#102538] hover:bg-[#102538]/80 border border-[#1E3A4F] text-[#F1F5F9] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                title="Copy Plaintext Invoice for Telegram/Viber"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="p-1.5 rounded-md bg-[#102538] hover:bg-[#102538]/80 border border-[#1E3A4F] text-[#38BDF8] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                title="Download Standalone HTML Invoice File"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* THE PDF INVOICE SNIPPET DOCUMENT */}
          <div
            id="print-invoice-sheet"
            className={`rounded-lg p-6 sm:p-8 transition-all border shadow-2xl relative overflow-hidden font-ui print-invoice-sheet ${
              invoiceTheme === 'paper'
                ? 'bg-[#fafafa] text-[#18181b] border-[#e4e4e7]'
                : 'bg-[#0B1B2B] text-[#F1F5F9] border-[#1E3A4F]'
            }`}
          >
            {/* Background Watermark */}
            <div className="absolute right-6 top-24 pointer-events-none opacity-[0.03] select-none text-[120px] font-ui font-black">
              {activeTenant.invoicePrefix || activeTenant.displayName.slice(0, 3).toUpperCase()}
            </div>

            {/* Document Header */}
            <div className={`pb-6 border-b flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
              invoiceTheme === 'paper' ? 'border-zinc-300' : 'border-[#1E3A4F]'
            }`}>
              <div className="flex items-start space-x-3.5">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center border font-bold text-xl ${
                  invoiceTheme === 'paper'
                    ? 'bg-zinc-900 border-zinc-950 text-white'
                    : 'bg-[#030F1E] border-[#38BDF8]/40 text-[#38BDF8]'
                }`}>
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-ui font-extrabold text-lg sm:text-xl tracking-tight uppercase">
                      {activeTenant.displayName}
                    </span>
                    <span className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                      invoiceTheme === 'paper'
                        ? 'bg-zinc-200 text-zinc-800'
                        : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30'
                    }`}>
                      Atelier Invoice
                    </span>
                  </div>
                  <div className={`text-xs mt-1 font-ui ${
                    invoiceTheme === 'paper' ? 'text-zinc-600' : 'text-[#7E8F9F]'
                  }`}>
                    {activeTenant.address}
                  </div>
                  <div className={`text-[11px] font-ui ${
                    invoiceTheme === 'paper' ? 'text-zinc-500' : 'text-[#7E8F9F]'
                  }`}>
                    {activeTenant.registrationNumber} • TEL: {activeTenant.phone}
                  </div>
                </div>
              </div>

              {/* Invoice Meta Top Right */}
              <div className="sm:text-right font-ui">
                <div className="text-xs text-[#7E8F9F]">Statement Number</div>
                <div className="font-mono-code font-bold text-base tracking-tight text-[#38BDF8]">
                  {invoiceNumber}
                </div>
                <div className="mt-1 flex sm:justify-end">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-ui ${
                      paymentStatus === 'paid'
                        ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                        : paymentStatus === 'deposit_paid'
                        ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30'
                        : 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30'
                    }`}
                  >
                    {paymentStatus === 'paid' && '✓ Paid in full'}
                    {paymentStatus === 'deposit_paid' && '● Deposit credited (Balance due)'}
                    {paymentStatus === 'pending' && '⏳ Pending remittance'}
                    {paymentStatus === 'due' && '! Full balance due'}
                  </span>
                </div>
              </div>
            </div>

            {/* Client & Session Info Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b font-ui text-xs ${
              invoiceTheme === 'paper' ? 'border-zinc-200' : 'border-[#1E3A4F]'
            }`}>
              <div className={`p-3.5 rounded-lg border ${
                invoiceTheme === 'paper'
                  ? 'bg-zinc-100/70 border-zinc-200'
                  : 'bg-[#030F1E] border-[#1E3A4F]'
              }`}>
                <span className="text-[10px] text-[#7E8F9F] font-bold block mb-1 uppercase tracking-wider">
                  Billed to client
                </span>
                <div className="font-ui font-bold text-sm text-zinc-900 dark:text-[#F1F5F9]">
                  {clientName}
                </div>
                <div className="text-zinc-600 dark:text-[#94A3B8] text-xs mt-0.5">
                  Phone: {clientPhone}
                </div>
                <div className="text-zinc-600 dark:text-[#94A3B8] text-xs">
                  Manifest Token: <span className="font-mono-code font-semibold text-[#38BDF8]">{bookingState.token}</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-lg border ${
                invoiceTheme === 'paper'
                  ? 'bg-zinc-100/70 border-zinc-200'
                  : 'bg-[#030F1E] border-[#1E3A4F]'
              }`}>
                <span className="text-[10px] text-[#7E8F9F] font-bold block mb-1 uppercase tracking-wider">
                  Session allocation &amp; dates
                </span>
                <div className="font-ui font-bold text-sm text-zinc-900 dark:text-[#F1F5F9]">
                  {bookingState.bayAllocation || 'BAY ALPHA-01'}
                </div>
                <div className="text-zinc-600 dark:text-[#94A3B8] text-xs mt-0.5">
                  Issue Date: {issueDate} • Due: {dueDate}
                </div>
                <div className="text-zinc-600 dark:text-[#94A3B8] text-xs">
                  Gateway: <span className="font-semibold">{paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-5 overflow-x-auto">
              <table className="w-full text-left font-ui text-xs">
                <thead>
                  <tr className={`border-b text-[10px] uppercase tracking-wider ${
                    invoiceTheme === 'paper'
                      ? 'border-zinc-300 text-zinc-600 bg-zinc-100/60'
                      : 'border-[#1E3A4F] text-[#7E8F9F] bg-[#101C2C]'
                  }`}>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item / Gear Description</th>
                    <th className="py-2.5 px-3">Asset Code</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount (MMK)</th>
                  </tr>
                </thead>
                <tbody className={invoiceTheme === 'paper' ? 'divide-y divide-zinc-200' : 'divide-y divide-[#1E3A4F]'}>
                  {invoiceLines.map((line, idx) => (
                    <tr
                      key={line.id}
                      className={idx % 2 === 1 ? (invoiceTheme === 'paper' ? 'bg-zinc-50/50' : 'bg-[#101C2C]/40') : ''}
                    >
                      <td className="py-3 px-3 text-[#7E8F9F]">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium font-ui text-zinc-900 dark:text-[#F1F5F9]">
                          {line.description}
                        </div>
                        {line.myanmarDescription && (
                          <div className="text-xs text-[#7E8F9F] mt-0.5">{line.myanmarDescription}</div>
                        )}
                        {line.notes && (
                          <div className="text-xs text-[#7E8F9F] italic mt-0.5">{line.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono-code font-semibold ${
                          invoiceTheme === 'paper'
                            ? 'bg-zinc-200 text-zinc-800'
                            : 'bg-[#030F1E] text-[#38BDF8] border border-[#1E3A4F]'
                        }`}>
                          {line.assetCode || 'ATELIER-01'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold tabular-nums">{line.quantity}</td>
                      <td className="py-3 px-3 text-right text-zinc-600 dark:text-[#94A3B8] tabular-nums">
                        {line.unitPriceMMK.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-zinc-900 dark:text-[#F1F5F9] tabular-nums">
                        {line.totalPriceMMK.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals & Balance Breakdown */}
            <div className={`pt-4 border-t flex flex-col sm:flex-row justify-between gap-6 ${
              invoiceTheme === 'paper' ? 'border-zinc-300' : 'border-[#1E3A4F]'
            }`}>
              {/* Left: Payment Guidance & Remittance info */}
              <div className="sm:max-w-xs space-y-2.5 font-ui text-xs">
                <div className={`p-3 rounded-lg border ${
                  invoiceTheme === 'paper'
                    ? 'bg-zinc-100 border-zinc-200'
                    : 'bg-[#030F1E] border-[#1E3A4F]'
                }`}>
                  <div className="flex items-center space-x-2 text-[#7E8F9F] text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Building2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Remittance Instructions</span>
                  </div>
                  <div className="font-semibold text-zinc-800 dark:text-[#F1F5F9]">
                    Account: {activeTenant.legalName || activeTenant.displayName}
                  </div>
                  <div className="text-zinc-600 dark:text-[#94A3B8] text-xs space-y-0.5 mt-0.5">
                    <div>{activeTenant.remittanceAccount}</div>
                  </div>
                  <div className="text-[11px] text-[#7E8F9F] mt-1">
                    Reference: <span className="font-mono-code">{bookingState.token || invoiceNumber}</span>
                  </div>
                </div>

                {/* Terms text */}
                <div className="text-xs text-[#7E8F9F] leading-relaxed">
                  {customStudioNote}
                </div>
              </div>

              {/* Right: Calculations Summary */}
              <div className="w-full sm:w-72 space-y-2 font-ui text-xs tabular-nums">
                <div className="flex justify-between text-zinc-600 dark:text-[#94A3B8] py-1">
                  <span>Gross Services Subtotal:</span>
                  <span className="font-semibold">{grossSubtotal.toLocaleString()} MMK</span>
                </div>

                {discountMMK > 0 && (
                  <div className="flex justify-between text-[#FB7185] py-1">
                    <span>Courtesy Discount:</span>
                    <span>-{discountMMK.toLocaleString()} MMK</span>
                  </div>
                )}

                {taxPercent > 0 && (
                  <div className="flex justify-between text-zinc-600 dark:text-[#94A3B8] py-1">
                    <span>Commercial Tax ({taxPercent}%):</span>
                    <span>+{taxAmount.toLocaleString()} MMK</span>
                  </div>
                )}

                <div className={`flex justify-between py-1.5 border-t ${
                  invoiceTheme === 'paper' ? 'border-zinc-300' : 'border-[#1E3A4F]'
                }`}>
                  <span className="font-bold">Total Invoiced Amount:</span>
                  <span className="font-bold">{grandTotal.toLocaleString()} MMK</span>
                </div>

                {depositCredit > 0 && (
                  <div className="flex justify-between text-[#34D399] font-semibold py-1">
                    <span>Deposit Credited (Paid):</span>
                    <span>-{depositCredit.toLocaleString()} MMK</span>
                  </div>
                )}

                <div className={`flex justify-between items-center py-2.5 px-3 rounded-lg border font-ui ${
                  invoiceTheme === 'paper'
                    ? 'bg-zinc-900 text-white border-zinc-950'
                    : 'bg-[#102538] border-[#38BDF8]/40 text-[#38BDF8]'
                }`}>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                      Balance Payable
                    </div>
                    <div className="text-base sm:text-lg font-bold tabular-nums">
                      {balanceDue.toLocaleString()} MMK
                    </div>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-[#34D399]" />
                </div>
              </div>
            </div>

            {/* Studio Director Hologram Stamp & Signature Footer */}
            <div className={`mt-8 pt-5 border-t flex flex-col sm:flex-row items-center justify-between gap-4 font-ui text-xs ${
              invoiceTheme === 'paper' ? 'border-zinc-200' : 'border-[#1E3A4F]'
            }`}>
              {/* Official Atelier Stamp */}
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-full border-2 border-[#FB7185]/80 text-[#FB7185] flex flex-col items-center justify-center text-center p-1 transform -rotate-6 select-none">
                  <span className="text-[7px] font-black uppercase tracking-tighter">{activeTenant.displayName}</span>
                  <span className="text-[8px] font-black uppercase tracking-wider">GEAR</span>
                  <span className="text-[6px] font-bold tracking-tighter uppercase">MANIFEST</span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-zinc-800 dark:text-[#F1F5F9] uppercase">
                    Official Studio Stamp
                  </div>
                  <div className="text-[10px] text-[#7E8F9F]">
                    Master Colorist &amp; Calibration Lead
                  </div>
                </div>
              </div>

              {/* Studio Director Sign */}
              <div className="text-center sm:text-right">
                <div className="font-serif italic text-lg sm:text-xl text-zinc-800 dark:text-[#F1F5F9] tracking-wide">
                  {activeTenant.ownerName}
                </div>
                <div className="text-[10px] text-[#7E8F9F] border-t border-zinc-300 dark:border-[#1E3A4F] pt-1 mt-0.5">
                  {activeTenant.authorizedSignatureTitle || 'Studio Director'} • {activeTenant.displayName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EXPLICIT PRINT PORTAL: Renders isolated A4 document directly into body for window.print() */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="invoice-print-root" className="font-ui text-slate-900 leading-normal">
            {/* Document Header */}
            <div className="pb-4 border-b-2 border-slate-900 flex justify-between items-start">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded bg-slate-950 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-lg uppercase tracking-tight text-slate-950">
                      {activeTenant.displayName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 uppercase tracking-wider">
                      Atelier Invoice
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    {activeTenant.address}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono-code mt-0.5">
                    {activeTenant.registrationNumber} • TEL: {activeTenant.phone}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  Statement Number
                </div>
                <div className="font-mono-code font-extrabold text-base text-slate-900 tracking-tight">
                  {invoiceNumber}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : paymentStatus === 'deposit_paid'
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : paymentStatus === 'pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {paymentStatus === 'paid' && '✓ Paid in full'}
                    {paymentStatus === 'deposit_paid' && '● Deposit credited (Balance due)'}
                    {paymentStatus === 'pending' && '⏳ Pending remittance'}
                    {paymentStatus === 'due' && '! Full balance due'}
                  </span>
                </div>
              </div>
            </div>

            {/* Client & Session Info Grid */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs print-avoid-break">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">
                  Billed to client
                </span>
                <div className="font-bold text-sm text-slate-900">
                  {clientName}
                </div>
                <div className="text-slate-600 mt-0.5">
                  Phone: {clientPhone}
                </div>
                <div className="text-slate-600 mt-0.5">
                  Manifest Token: <span className="font-mono-code font-bold text-slate-900">{bookingState.token}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">
                  Session allocation &amp; dates
                </span>
                <div className="font-bold text-sm text-slate-900">
                  {bookingState.bayAllocation || 'BAY ALPHA-01'}
                </div>
                <div className="text-slate-600 mt-0.5">
                  Issue Date: {issueDate} • Due: {dueDate}
                </div>
                <div className="text-slate-600 mt-0.5">
                  Gateway: <span className="font-semibold text-slate-900">{paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-[10px] uppercase tracking-wider text-slate-600 bg-slate-100">
                    <th className="py-2 px-2.5">#</th>
                    <th className="py-2 px-2.5">Item / Gear Description</th>
                    <th className="py-2 px-2.5">Asset Code</th>
                    <th className="py-2 px-2.5 text-center">Qty</th>
                    <th className="py-2 px-2.5 text-right">Unit Rate</th>
                    <th className="py-2 px-2.5 text-right">Amount (MMK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoiceLines.map((line, idx) => (
                    <tr key={line.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : ''}>
                      <td className="py-2 px-2.5 text-slate-400 font-mono-code">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="py-2 px-2.5">
                        <div className="font-bold text-slate-900">
                          {line.description}
                        </div>
                        {line.myanmarDescription && (
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">{line.myanmarDescription}</div>
                        )}
                        {line.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">{line.notes}</div>
                        )}
                      </td>
                      <td className="py-2 px-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {line.assetCode || 'ATELIER-01'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center font-bold tabular-nums">{line.quantity}</td>
                      <td className="py-2 px-2.5 text-right text-slate-600 tabular-nums">
                        {line.unitPriceMMK.toLocaleString()}
                      </td>
                      <td className="py-2 px-2.5 text-right font-bold text-slate-900 tabular-nums">
                        {line.totalPriceMMK.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Unified Summary Block & Signature Footer (Protected from mid-block fragmentation) */}
            <div className="mt-4 pt-3 border-t border-slate-300 print-avoid-break space-y-4">
              <div className="flex justify-between gap-6">
                {/* Left: Remittance Instructions & Terms */}
                <div className="w-1/2 space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-700" />
                      <span>Remittance Instructions</span>
                    </div>
                    <div className="font-bold text-slate-900">
                      Account: {activeTenant.legalName || activeTenant.displayName}
                    </div>
                    <div className="text-slate-600 text-xs space-y-0.5 mt-0.5">
                      <div>{activeTenant.remittanceAccount}</div>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Reference: <span className="font-mono-code font-bold text-slate-800">{bookingState.token || invoiceNumber}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 leading-relaxed italic">
                    <strong>Studio Terms:</strong> {customStudioNote}
                  </div>
                </div>

                {/* Right: Calculation Breakdown */}
                <div className="w-1/2 max-w-[280px] space-y-1.5 text-xs tabular-nums">
                  <div className="flex justify-between text-slate-600 py-0.5">
                    <span>Gross Services Subtotal:</span>
                    <span className="font-semibold text-slate-900">{grossSubtotal.toLocaleString()} MMK</span>
                  </div>

                  {discountMMK > 0 && (
                    <div className="flex justify-between text-rose-600 py-0.5">
                      <span>Courtesy Discount:</span>
                      <span>-{discountMMK.toLocaleString()} MMK</span>
                    </div>
                  )}

                  {taxPercent > 0 && (
                    <div className="flex justify-between text-slate-600 py-0.5">
                      <span>Commercial Tax ({taxPercent}%):</span>
                      <span>+{taxAmount.toLocaleString()} MMK</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 border-t border-slate-300 font-bold text-slate-900">
                    <span>Total Invoiced Amount:</span>
                    <span>{grandTotal.toLocaleString()} MMK</span>
                  </div>

                  {depositCredit > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold py-0.5">
                      <span>Deposit Credited (Paid):</span>
                      <span>-{depositCredit.toLocaleString()} MMK</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-950 text-white font-bold mt-2">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-300">
                        Balance Payable
                      </div>
                      <div className="text-base font-extrabold tabular-nums">
                        {balanceDue.toLocaleString()} MMK
                      </div>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Footer: Stamp & Sign */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-4 text-xs">
                {/* Studio Stamp */}
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full border-2 border-rose-600 text-rose-600 flex flex-col items-center justify-center text-center p-0.5 transform -rotate-6 select-none flex-shrink-0">
                    <span className="text-[6px] font-black uppercase tracking-tighter">{activeTenant.displayName}</span>
                    <span className="text-[7px] font-black uppercase tracking-wider">GEAR</span>
                    <span className="text-[5px] font-bold tracking-tighter uppercase">MANIFEST</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 uppercase">
                      Official Studio Stamp
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Master Colorist &amp; Calibration Lead
                    </div>
                  </div>
                </div>

                {/* Studio Director Signature */}
                <div className="text-right">
                  <div className="font-serif italic text-lg text-slate-900 tracking-wide font-bold">
                    {activeTenant.ownerName}
                  </div>
                  <div className="text-[10px] text-slate-500 border-t border-slate-300 pt-0.5 mt-0.5">
                    {activeTenant.authorizedSignatureTitle || 'Studio Director'} • {activeTenant.displayName}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
