import React, { useState, useEffect, useMemo } from 'react';
import {
  BookingState,
  WorkspaceView,
  PosCartLineItem,
  PosTransaction,
  PosPaymentMethod,
  PosShiftRecord,
} from '../types';
import { getTenantConfig } from '../config/tenantConfig';
import { PHOTOGRAPHY_PACKAGES } from '../data/mockData';
import { INITIAL_CLIENT_PRODUCTS } from '../data/clientProductsData';
import { INITIAL_EQUIPMENT_LIST } from '../data/equipmentData';
import {
  posService,
  OVERTIME_ADDON_PRESETS,
  OvertimeAddonPreset,
} from '../services/posService';
import { CustomerBookingRecord } from '../services/serverBookingService';
import { verifySlip } from '../services/slipVerificationService';
import { PaymentBrandLogo } from './PaymentBrandLogo';
import {
  ShoppingBag,
  Camera,
  Zap,
  Clock,
  Search,
  User,
  Phone,
  Receipt,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  ArrowRight,
  RotateCcw,
  DollarSign,
  Layers,
  Maximize2,
  Minimize2,
  X,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Check,
  Sliders,
  Store,
  RefreshCw,
  QrCode,
  Upload,
  FileCheck,
} from 'lucide-react';

interface StudioPosDeskProps {
  bookingState: BookingState;
  onCloseDesk: () => void;
  workspaceView?: WorkspaceView;
  onToggleWorkspaceView?: () => void;
  onSyncBookingToGlobal?: (updatedBooking: Partial<BookingState>) => void;
}

type PosActiveTab = 'checkin' | 'packages' | 'addons' | 'gear' | 'retail';

export const StudioPosDesk: React.FC<StudioPosDeskProps> = ({
  bookingState,
  onCloseDesk,
  workspaceView = 'full',
  onToggleWorkspaceView,
  onSyncBookingToGlobal,
}) => {
  const tenant = getTenantConfig(bookingState.tenantId);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<PosActiveTab>('checkin');
  const [searchQuery, setSearchQuery] = useState('');
  const [gearCategoryFilter, setGearCategoryFilter] = useState<string>('all');
  const [retailCategoryFilter, setRetailCategoryFilter] = useState<string>('all');

  // Active Desk Customer Details
  const [guestName, setGuestName] = useState(bookingState.guestName || 'Elena Rostova');
  const [clientPhone, setClientPhone] = useState(bookingState.clientPhone || '+95 9 792 108 421');
  const [bayAllocation, setBayAllocation] = useState(bookingState.bayAllocation || 'BAY ALPHA-01');
  const [linkedBookingRef, setLinkedBookingRef] = useState<string | undefined>(
    bookingState.manifestId || '#AJ-BK-2026-8801'
  );

  // Check-in search
  const [checkInSearch, setCheckInSearch] = useState('');
  const [foundBookings, setFoundBookings] = useState<CustomerBookingRecord[]>([]);
  const [isSearchingBookings, setIsSearchingBookings] = useState(false);

  // Live POS Cart
  const [cartItems, setCartItems] = useState<PosCartLineItem[]>(() => {
    // Initial item: Deposit remaining balance for active booking if any
    const depositCred = bookingState.depositAmount || 105000;
    const total = bookingState.totalAmount || 210000;
    const rem = total - depositCred;
    return [
      {
        id: 'init-booking-bal',
        category: 'BOOKING_BALANCE',
        title: `${bookingState.selectedPackage?.name || 'Gold Commercial Suite'} (Balance Settle)`,
        myanmarTitle: 'Advance Booking Balance Settlement',
        unitPriceMMK: rem > 0 ? rem : total,
        quantity: 1,
        referenceId: bookingState.manifestId,
        bayAllocation: bookingState.bayAllocation,
        notes: `Original Deposit ${depositCred.toLocaleString()} MMK credited`,
      },
    ];
  });

  // Tender & Checkout States
  const [depositCreditedMMK, setDepositCreditedMMK] = useState<number>(
    bookingState.depositAmount || 105000
  );
  const [discountMMK, setDiscountMMK] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('CASH');
  const [tenderedCashInput, setTenderedCashInput] = useState<string>('');
  const [splitCashInput, setSplitCashInput] = useState<string>('');
  const [splitDigitalGateway, setSplitDigitalGateway] = useState<'KBZPay' | 'WavePay' | 'AYA Pay'>('KBZPay');

  // Slip OCR on Counter
  const [slipFileBase64, setSlipFileBase64] = useState<string | null>(null);
  const [isOcrVerifying, setIsOcrVerifying] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  // Shift & Terminal State
  const [shiftRecord, setShiftRecord] = useState<PosShiftRecord>(() =>
    posService.getActiveShift('TERM-01', 'Aung Kyaw')
  );

  // Completed Receipt Modal
  const [completedTransaction, setCompletedTransaction] = useState<PosTransaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Search bookings effect
  useEffect(() => {
    let isCancelled = false;
    const search = async () => {
      if (!checkInSearch.trim()) {
        const initial = await posService.lookupBookingForDesk('AJ', tenant.slug);
        if (!isCancelled) setFoundBookings(initial);
        return;
      }
      setIsSearchingBookings(true);
      const results = await posService.lookupBookingForDesk(checkInSearch, tenant.slug);
      if (!isCancelled) {
        setFoundBookings(results);
        setIsSearchingBookings(false);
      }
    };
    search();
    return () => {
      isCancelled = true;
    };
  }, [checkInSearch, tenant.slug]);

  // Financial Calculations
  const subtotalMMK = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.unitPriceMMK * item.quantity, 0);
  }, [cartItems]);

  const taxMMK = useMemo(() => {
    if (taxPercent <= 0) return 0;
    return Math.round((subtotalMMK * taxPercent) / 100);
  }, [subtotalMMK, taxPercent]);

  const totalDueMMK = useMemo(() => {
    const net = subtotalMMK + taxMMK - discountMMK;
    return Math.max(0, net);
  }, [subtotalMMK, taxMMK, discountMMK]);

  const changeDueMMK = useMemo(() => {
    if (paymentMethod !== 'CASH') return 0;
    const tendered = parseInt(tenderedCashInput.replace(/,/g, ''), 10);
    if (isNaN(tendered)) return 0;
    return Math.max(0, tendered - totalDueMMK);
  }, [tenderedCashInput, totalDueMMK, paymentMethod]);

  // Cart operations
  const handleAddToCart = (item: Omit<PosCartLineItem, 'id'>) => {
    const existingIndex = cartItems.findIndex(
      (c) => c.referenceId === item.referenceId && c.category === item.category
    );

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      const newItem: PosCartLineItem = {
        ...item,
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      };
      setCartItems((prev) => [...prev, newItem]);
    }
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartLineItem[]
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscountMMK(0);
    setTenderedCashInput('');
    setOcrResult(null);
  };

  // Load an existing booking into POS
  const handleLoadBookingToCart = (booking: CustomerBookingRecord) => {
    setGuestName(booking.customerName);
    setClientPhone(booking.customerPhone);
    setBayAllocation(booking.spaceSnapshot.name);
    setLinkedBookingRef(booking.bookingReference);

    const depositAlreadyPaid = booking.verifiedPaidAmount || booking.depositAmount;
    const remainingBalance = booking.outstandingBalance || booking.totalAmount - depositAlreadyPaid;

    setDepositCreditedMMK(depositAlreadyPaid);

    // Replace or add booking balance item
    const bookingItem: PosCartLineItem = {
      id: `booking-bal-${booking.id}`,
      category: 'BOOKING_BALANCE',
      title: `${booking.packageSnapshot.name} (Booking Balance)`,
      myanmarTitle: 'Booking Balance Settlement',
      unitPriceMMK: remainingBalance,
      quantity: 1,
      referenceId: booking.bookingReference,
      bayAllocation: booking.spaceSnapshot.name,
      notes: `Ref ${booking.bookingReference} · Deposit Paid: ${depositAlreadyPaid.toLocaleString()} MMK`,
    };

    setCartItems([bookingItem]);

    if (onSyncBookingToGlobal) {
      onSyncBookingToGlobal({
        guestName: booking.customerName,
        clientPhone: booking.customerPhone,
        manifestId: booking.bookingReference,
        bayAllocation: booking.spaceSnapshot.name,
      });
    }
  };

  // Process Slip OCR
  const handleSlipFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setSlipFileBase64(base64Data);
      setIsOcrVerifying(true);
      try {
        const res = await verifySlip({
          image: base64Data,
          mime_type: file.type || 'image/png',
          expected_amount_mmk: totalDueMMK,
          manifest_id: linkedBookingRef,
          gateway: paymentMethod === 'WAVEPAY' ? 'WavePay' : 'KBZPay',
        });
        setOcrResult(res);
      } catch (err) {
        console.error('OCR Verification failed:', err);
      } finally {
        setIsOcrVerifying(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Complete Checkout
  const handleCompleteCheckout = async () => {
    if (cartItems.length === 0) return;

    const tenderedCash = parseInt(tenderedCashInput.replace(/,/g, ''), 10) || totalDueMMK;

    let splitDetails = undefined;
    if (paymentMethod === 'SPLIT') {
      const cashAmt = parseInt(splitCashInput.replace(/,/g, ''), 10) || 0;
      splitDetails = {
        cashAmountMMK: cashAmt,
        digitalAmountMMK: Math.max(0, totalDueMMK - cashAmt),
        digitalGateway: splitDigitalGateway,
      };
    }

    try {
      const transaction = await posService.recordTransaction(
        {
          orderReference: `#ORD-${Date.now().toString().slice(-6)}`,
          tenantId: tenant.slug,
          bookingReference: linkedBookingRef,
          customerName: guestName,
          customerPhone: clientPhone,
          bayAllocation,
          items: cartItems,
          subtotalMMK,
          depositCreditedMMK,
          discountMMK,
          taxMMK,
          totalDueMMK,
          tenderedCashMMK: paymentMethod === 'CASH' ? tenderedCash : undefined,
          changeDueMMK: paymentMethod === 'CASH' ? changeDueMMK : undefined,
          paymentMethod,
          splitDetails,
          cashierName: shiftRecord.staffName,
          terminalId: shiftRecord.terminalId,
          slipVerificationStatus: ocrResult?.verification_status || 'unverified',
        },
        { updateServerBookingStatus: Boolean(linkedBookingRef) }
      );

      setShiftRecord(posService.getActiveShift(shiftRecord.terminalId, shiftRecord.staffName));
      setCompletedTransaction(transaction);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      alert(`POS Transaction Error: ${err.message || 'Failed to complete sale'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#030F1E] flex flex-col text-[#F1F5F9] font-ui select-none overflow-hidden animate-in fade-in duration-200">
      {/* =====================================================================
          1. TOP BAR: TERMINAL HEADER & SHIFT INDICATOR
      ====================================================================== */}
      <header className="h-14 border-b border-[#1E3A4F] bg-[#071423] px-4 sm:px-6 flex items-center justify-between shrink-0">
        {/* Left: Terminal Brand & Active Tenant */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shadow-sm">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-space font-bold text-sm tracking-wide text-[#F1F5F9]">
                AJ AI STUDIO POS
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30">
                DESK TERMINAL 01
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-[#94A3B8]">
              <span>{tenant.displayName}</span>
              <span>•</span>
              <span className="text-[#34D399]">Shift Open ({shiftRecord.staffName})</span>
            </div>
          </div>
        </div>

        {/* Center: Shift Cash in Drawer Indicator */}
        <div className="hidden md:flex items-center space-x-4 bg-[#102538]/80 border border-[#1E3A4F] rounded-xl px-4 py-1.5 font-mono text-xs">
          <div className="flex items-center space-x-1.5 text-[#38BDF8]">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-[#94A3B8]">Drawer Cash:</span>
            <strong className="text-[#F1F5F9]">{shiftRecord.cashInDrawerMMK.toLocaleString()} MMK</strong>
          </div>
          <div className="h-3 w-px bg-[#1E3A4F]" />
          <div className="text-[#94A3B8]">
            Sales: <span className="text-[#34D399]">{(shiftRecord.totalCashSalesMMK + shiftRecord.totalDigitalSalesMMK).toLocaleString()} MMK</span> ({shiftRecord.totalTransactionsCount} tx)
          </div>
        </div>

        {/* Right: Controls & Close */}
        <div className="flex items-center space-x-2">
          {onToggleWorkspaceView && (
            <button
              type="button"
              onClick={onToggleWorkspaceView}
              className="p-2 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#1E3A4F] transition-colors cursor-pointer"
              title={workspaceView === 'compact' ? 'Full Width' : 'Compact Width'}
            >
              {workspaceView === 'compact' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={onCloseDesk}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
            title="Exit POS Desk to Studio Suite"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close Desk</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN TWO-COLUMN POS WORKSPACE
      ====================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* -------------------------------------------------------------------
            LEFT PANEL: CATALOG SELECTION (60% - 65% width)
        ------------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col border-r border-[#1E3A4F] bg-[#030F1E] overflow-hidden">
          {/* Catalog Tab Navigation */}
          <div className="h-12 border-b border-[#1E3A4F] bg-[#071423]/90 px-4 flex items-center space-x-1 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('checkin')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'checkin'
                  ? 'bg-[#38BDF8] text-[#071423] font-bold shadow-md shadow-[#38BDF8]/20'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#102538]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>1. Reservation Check-in</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('packages')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'packages'
                  ? 'bg-[#38BDF8] text-[#071423] font-bold shadow-md shadow-[#38BDF8]/20'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#102538]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>2. Packages (Walk-In)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('addons')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'addons'
                  ? 'bg-[#38BDF8] text-[#071423] font-bold shadow-md shadow-[#38BDF8]/20'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#102538]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>3. Overtime &amp; Add-ons</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gear')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'gear'
                  ? 'bg-[#38BDF8] text-[#071423] font-bold shadow-md shadow-[#38BDF8]/20'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#102538]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>4. Studio Gear Rental</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('retail')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'retail'
                  ? 'bg-[#38BDF8] text-[#071423] font-bold shadow-md shadow-[#38BDF8]/20'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#102538]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>5. Prints &amp; Retail</span>
            </button>
          </div>

          {/* Tab Content Canvas */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* ---------------------------------------------------------------
                TAB 1: CHECK-IN & EXISTING BOOKING LOOKUP
            --------------------------------------------------------------- */}
            {activeTab === 'checkin' && (
              <div className="space-y-4">
                <div className="bg-[#071423] p-4 rounded-xl border border-[#1E3A4F] flex items-center space-x-3">
                  <Search className="w-5 h-5 text-[#38BDF8] shrink-0" />
                  <input
                    type="text"
                    value={checkInSearch}
                    onChange={(e) => setCheckInSearch(e.target.value)}
                    placeholder="Search reservation by booking ID or phone number (e.g. 8801 or 09792108421)..."
                    className="flex-1 bg-transparent border-none text-sm text-[#F1F5F9] focus:outline-none placeholder:text-[#64748B]"
                  />
                  {checkInSearch && (
                    <button
                      type="button"
                      onClick={() => setCheckInSearch('')}
                      className="text-xs text-[#94A3B8] hover:text-[#F1F5F9]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {foundBookings.map((booking) => {
                    const depositPaid = booking.verifiedPaidAmount || booking.depositAmount;
                    const balance = booking.outstandingBalance || booking.totalAmount - depositPaid;
                    const isSelected = linkedBookingRef === booking.bookingReference;

                    return (
                      <div
                        key={booking.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-[#102538] border-[#38BDF8] shadow-lg shadow-[#38BDF8]/10'
                            : 'bg-[#071423] border-[#1E3A4F] hover:border-[#38BDF8]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-xs font-bold text-[#38BDF8]">
                              {booking.bookingReference}
                            </span>
                            <h4 className="font-semibold text-sm text-[#F1F5F9] mt-0.5">
                              {booking.customerName}
                            </h4>
                            <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                              {booking.customerPhone}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E3A4F] text-[#38BDF8]">
                            {booking.spaceSnapshot.name}
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#1E3A4F]/60 flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-[#64748B]">Deposit Paid: </span>
                            <span className="text-[#34D399] font-medium">
                              {depositPaid.toLocaleString()} MMK
                            </span>
                          </div>
                          <div>
                            <span className="text-[#64748B]">Balance: </span>
                            <span className="text-[#F1F5F9] font-bold">
                              {balance.toLocaleString()} MMK
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLoadBookingToCart(booking)}
                          className="mt-3 w-full py-2 rounded-lg bg-[#38BDF8]/20 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] font-semibold text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Add Balance to Register</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {foundBookings.length === 0 && !isSearchingBookings && (
                  <div className="p-8 text-center bg-[#071423]/50 rounded-xl border border-dashed border-[#1E3A4F] text-[#64748B] text-xs font-mono">
                    No reservation matches found. Enter booking ID or phone in the search box above.
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------------
                TAB 2: PACKAGES (WALK-IN STUDIO BOOKINGS)
            --------------------------------------------------------------- */}
            {activeTab === 'packages' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PHOTOGRAPHY_PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-4 rounded-xl bg-[#071423] border border-[#1E3A4F] hover:border-[#38BDF8] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E3A4F] text-[#38BDF8]">
                          {pkg.suiteAllocation}
                        </span>
                        <span className="font-mono text-sm font-bold text-[#F1F5F9]">
                          {pkg.price.toLocaleString()} MMK
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#F1F5F9] mt-2 group-hover:text-[#38BDF8] transition-colors">
                        {pkg.name}
                      </h4>
                      <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                        {pkg.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleAddToCart({
                          category: 'WALK_IN_PACKAGE',
                          title: pkg.name,
                          myanmarTitle: 'Studio Walk-In Package Fee',
                          unitPriceMMK: pkg.price,
                          quantity: 1,
                          referenceId: pkg.id,
                          bayAllocation: pkg.suiteAllocation,
                        })
                      }
                      className="mt-4 w-full py-2 rounded-lg bg-[#102538] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] font-semibold text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Package to Register</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ---------------------------------------------------------------
                TAB 3: ADD-ONS & OVERTIME METERING
            --------------------------------------------------------------- */}
            {activeTab === 'addons' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#071423] rounded-xl border border-[#1E3A4F] text-xs text-[#94A3B8]">
                  <span className="font-semibold text-[#38BDF8]">Studio Overtime &amp; Extra Services:</span> Instantly add session extensions, beauty vanity styling, or overtime hours to this ticket.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {OVERTIME_ADDON_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        handleAddToCart({
                          category: preset.category,
                          title: preset.title,
                          myanmarTitle: preset.myanmarTitle,
                          unitPriceMMK: preset.unitPriceMMK,
                          quantity: 1,
                          referenceId: preset.id,
                          notes: preset.notes,
                        })
                      }
                      className="p-3.5 rounded-xl bg-[#071423] hover:bg-[#102538] border border-[#1E3A4F] hover:border-[#38BDF8] text-left transition-all group flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
                          {preset.badge}
                        </span>
                        <h5 className="font-semibold text-xs text-[#F1F5F9] mt-2 group-hover:text-[#38BDF8]">
                          {preset.title}
                        </h5>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          {preset.notes}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#1E3A4F]/60 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#F1F5F9]">
                          {preset.unitPriceMMK.toLocaleString()} MMK
                        </span>
                        <span className="text-[10px] font-bold text-[#38BDF8] group-hover:translate-x-0.5 transition-transform">
                          + ADD
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------
                TAB 4: STUDIO GEAR RENTAL
            --------------------------------------------------------------- */}
            {activeTab === 'gear' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  {['all', 'camera', 'lens', 'lighting', 'modifier'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGearCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-colors cursor-pointer ${
                        gearCategoryFilter === cat
                          ? 'bg-[#38BDF8] text-[#071423] font-bold'
                          : 'bg-[#102538] text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {INITIAL_EQUIPMENT_LIST.filter((g) =>
                    gearCategoryFilter === 'all' ? true : g.category === gearCategoryFilter
                  ).map((gear) => {
                    const rate = gear.rentalRateMMK || 25000;
                    return (
                      <div
                        key={gear.id}
                        className="p-3.5 rounded-xl bg-[#071423] border border-[#1E3A4F] hover:border-[#38BDF8] transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                            <span>{gear.assetCode}</span>
                            <span className="text-[#34D399] font-medium">Ready</span>
                          </div>
                          <h5 className="font-semibold text-xs text-[#F1F5F9] mt-1.5 line-clamp-1">
                            {gear.name}
                          </h5>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">
                            {gear.myanmarName || gear.category}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#1E3A4F]/60 flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[#F1F5F9]">
                            {rate.toLocaleString()} MMK
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddToCart({
                                category: 'GEAR_RENTAL',
                                title: gear.name,
                                myanmarTitle: gear.name,
                                unitPriceMMK: rate,
                                quantity: 1,
                                referenceId: gear.id,
                              })
                            }
                            className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            + Rent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------
                TAB 5: RETAIL PRODUCTS & MERCH
            --------------------------------------------------------------- */}
            {activeTab === 'retail' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {INITIAL_CLIENT_PRODUCTS.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-xl bg-[#071423] border border-[#1E3A4F] hover:border-[#38BDF8] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                        <span className="text-[#38BDF8]">{prod.sku}</span>
                        <span>Stock: {prod.stockCount}</span>
                      </div>
                      <h5 className="font-semibold text-xs text-[#F1F5F9] mt-1.5 line-clamp-1">
                        {prod.name}
                      </h5>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">
                        {prod.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#1E3A4F]/60 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#F1F5F9]">
                        {prod.priceMMK.toLocaleString()} MMK
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddToCart({
                            category: 'RETAIL_PRODUCT',
                            title: prod.name,
                            myanmarTitle: prod.name,
                            unitPriceMMK: prod.priceMMK,
                            quantity: 1,
                            referenceId: prod.id,
                          })
                        }
                        className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------------------
            RIGHT PANEL: POS REGISTER & CART CHECKOUT (35% - 40% width)
        ------------------------------------------------------------------- */}
        <div className="w-full md:w-[420px] lg:w-[460px] bg-[#071423] flex flex-col shrink-0 border-l border-[#1E3A4F]">
          {/* Active Customer Details Banner */}
          <div className="p-3.5 border-b border-[#1E3A4F] bg-[#102538]/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Customer / Client</span>
              </span>
              {linkedBookingRef && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 font-bold">
                  {linkedBookingRef}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest Name"
                className="bg-[#071423] border border-[#1E3A4F] rounded-lg px-2.5 py-1 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
              />
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Phone Number"
                className="bg-[#071423] border border-[#1E3A4F] rounded-lg px-2.5 py-1 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>

          {/* Cart Line Items Table */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-xs text-[#64748B] font-mono pb-1 border-b border-[#1E3A4F]/60">
              <span>ITEMS ({cartItems.length})</span>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
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
                    {item.notes && <span>• {item.notes}</span>}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-1 shrink-0 bg-[#071423] border border-[#1E3A4F] rounded-lg p-0.5 font-mono">
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item.id, -1)}
                    className="p-1 hover:bg-[#1E3A4F] rounded text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item.id, 1)}
                    className="p-1 hover:bg-[#1E3A4F] rounded text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveFromCart(item.id)}
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
          <div className="p-3.5 border-t border-[#1E3A4F] bg-[#102538]/40 space-y-2 text-xs font-mono">
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
          <div className="p-3.5 border-t border-[#1E3A4F] bg-[#071423] space-y-3">
            <div className="grid grid-cols-4 gap-1.5">
              {(['CASH', 'KBZPAY', 'WAVEPAY', 'SPLIT'] as PosPaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
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
                    onChange={(e) => setTenderedCashInput(e.target.value)}
                    placeholder={totalDueMMK.toLocaleString()}
                    className="w-28 text-right bg-[#071423] border border-[#1E3A4F] rounded px-2 py-0.5 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div className="flex items-center space-x-1 overflow-x-auto">
                  {[totalDueMMK, 50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedCashInput(amt.toLocaleString())}
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
              </div>
            )}

            {/* Mobile Wallets / QR Check */}
            {(paymentMethod === 'KBZPAY' || paymentMethod === 'WAVEPAY') && (
              <div className="bg-[#030F1E] p-2.5 rounded-lg border border-[#1E3A4F] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#F1F5F9]">{paymentMethod} Scan</span>
                  <p className="text-[11px] text-[#94A3B8] font-mono">
                    Account: 09 792 108 421 ({tenant.displayName})
                  </p>
                </div>
                <label className="px-2.5 py-1 rounded bg-[#38BDF8]/20 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isOcrVerifying ? 'Verifying...' : 'Audit Slip'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {ocrResult && (
              <div className="p-2 rounded-lg bg-[#34D399]/10 border border-[#34D399]/30 text-xs text-[#34D399] flex items-center space-x-1.5 font-mono">
                <FileCheck className="w-4 h-4 shrink-0" />
                <span>AI Verified: Trx {ocrResult.transaction_id || 'Valid'} · MMK {ocrResult.amount_mmk?.toLocaleString()}</span>
              </div>
            )}

            {/* Big Complete Button */}
            <button
              type="button"
              onClick={handleCompleteCheckout}
              disabled={cartItems.length === 0}
              className="w-full py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] disabled:bg-[#1E3A4F] disabled:text-[#64748B] text-[#071423] font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#38BDF8]/20 flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Receipt className="w-4 h-4" />
              <span>Complete &amp; Print Receipt</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. THERMAL 80MM RECEIPT MODAL (ESC/POS SIMULATION)
      ====================================================================== */}
      {isReceiptModalOpen && completedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-white text-black font-mono rounded-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 select-text">
            {/* Printable Receipt Area */}
            <div id="thermal-receipt-print-area" className="text-center space-y-2 text-xs">
              <div className="font-bold text-base tracking-wider">{tenant.legalName}</div>
              <div className="text-[11px] text-gray-600">{tenant.address}</div>
              <div className="text-[11px] text-gray-600">Tel: {tenant.phone}</div>
              <div className="text-[10px] text-gray-500">Tax ID: {tenant.taxIdentifier || 'REG-MM-2026'}</div>

              <div className="border-t border-b border-dashed border-gray-400 py-1.5 text-[11px] text-left">
                <div>Receipt No: <strong>{completedTransaction.receiptNumber}</strong></div>
                <div>Date: {new Date(completedTransaction.timestamp).toLocaleString()}</div>
                <div>Cashier: {completedTransaction.cashierName} · {completedTransaction.terminalId}</div>
                <div>Client: {completedTransaction.customerName} ({completedTransaction.customerPhone})</div>
                {completedTransaction.bayAllocation && (
                  <div>Bay: {completedTransaction.bayAllocation}</div>
                )}
              </div>

              {/* Items */}
              <div className="text-left space-y-1 py-2">
                {completedTransaction.items.map((item, idx) => (
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
                  <span>{completedTransaction.subtotalMMK.toLocaleString()} MMK</span>
                </div>
                {completedTransaction.depositCreditedMMK > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Deposit Credited:</span>
                    <span>-{completedTransaction.depositCreditedMMK.toLocaleString()} MMK</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1">
                  <span>TOTAL DUE:</span>
                  <span>{completedTransaction.totalDueMMK.toLocaleString()} MMK</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Tendered ({completedTransaction.paymentMethod}):</span>
                  <span>{(completedTransaction.tenderedCashMMK || completedTransaction.totalDueMMK).toLocaleString()} MMK</span>
                </div>
                {completedTransaction.changeDueMMK !== undefined && completedTransaction.changeDueMMK > 0 && (
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Change:</span>
                    <span>{completedTransaction.changeDueMMK.toLocaleString()} MMK</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 pt-3 text-center space-y-1">
                <div className="font-bold text-[11px]">THANK YOU FOR CHOOSING OUR ATELIER</div>
                <div className="text-[10px] text-gray-500">Master raw images preserved for 14 days</div>
                <div className="text-[9px] text-gray-400 font-mono">AJ AI STUDIO POS PLATFORM v2.4</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-lg bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print 80mm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  handleClearCart();
                }}
                className="flex-1 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Register Sale</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
