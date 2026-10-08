import React, { useState, useEffect, useMemo } from 'react';
import {
  BookingState,
  WorkspaceView,
  PosCartLineItem,
  PosTransaction,
  PosPaymentMethod,
  PosShiftRecord,
  PosZReport,
  PosStaffMember,
  PosStaffRole,
} from '../types';
import { getTenantConfig } from '../config/tenantConfig';
import { posService } from '../services/posService';
import { posStaffService } from '../services/posStaffService';
import { CustomerBookingRecord } from '../services/serverBookingService';
import { verifySlip } from '../services/slipVerificationService';
import {
  printDirectWebUsb,
  kickCashDrawerDirect,
  buildEscPosReceipt,
  buildEscPosZReport,
} from '../utils/escPosPrinter';
import { PosReceiptModal } from './pos/PosReceiptModal';
import { PosShiftModal } from './pos/PosShiftModal';
import { PosStaffModal } from './pos/PosStaffModal';
import { PosManagerOverrideModal } from './pos/PosManagerOverrideModal';
import { StudioUserGuideModal } from './StudioUserGuideModal';
import { PosCatalogTabs, PosActiveTab } from './pos/PosCatalogTabs';
import { PosCartCheckout } from './pos/PosCartCheckout';
import {
  ShoppingBag,
  Clock,
  Printer,
  X,
  Maximize2,
  Minimize2,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Barcode,
  Scan,
  AlertCircle,
  CheckCircle,
  Zap,
  Wifi,
  WifiOff,
  CloudOff,
  RefreshCw,
  Lock,
  UserCheck,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { useBarcodeScanner, playScannerBeep } from '../hooks/useBarcodeScanner';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { INITIAL_CLIENT_PRODUCTS } from '../data/clientProductsData';
import { INITIAL_EQUIPMENT_LIST } from '../data/equipmentData';
import { PHOTOGRAPHY_PACKAGES } from '../data/mockData';

interface StudioPosDeskProps {
  bookingState: BookingState;
  onCloseDesk: () => void;
  workspaceView?: WorkspaceView;
  onToggleWorkspaceView?: () => void;
  onSyncBookingToGlobal?: (updatedBooking: Partial<BookingState>) => void;
}

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

  // Mobile View Toggle: 'catalog' vs 'cart'
  const [mobileActiveView, setMobileActiveView] = useState<'catalog' | 'cart'>('catalog');

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

  // Tender / Payment calculation
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('CASH');
  const [tenderedCashInput, setTenderedCashInput] = useState<string>('210000');
  const [splitCashInput, setSplitCashInput] = useState<string>('100000');
  const [splitDigitalInput, setSplitDigitalInput] = useState<string>('110000');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<PosTransaction | null>(null);

  // Direct Hardware Printing status state
  const [isDirectPrinting, setIsDirectPrinting] = useState<boolean>(false);
  const [printerStatusMessage, setPrinterStatusMessage] = useState<string | null>(null);

  // Slip AI OCR state inside POS
  const [isOcrVerifying, setIsOcrVerifying] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    transaction_id?: string | null;
    amount_mmk?: number | null;
  } | null>(null);

  // Staff Authentication & PIN Switch State (Option D)
  const [activeStaff, setActiveStaff] = useState<PosStaffMember>(() => posStaffService.getActiveStaff());
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(() => posStaffService.isTerminalLocked());
  const [managerOverrideReq, setManagerOverrideReq] = useState<{
    isOpen: boolean;
    actionTitle: string;
    actionDescription: string;
    onAuthorized: (manager: PosStaffMember) => void;
  } | null>(null);
  const [isPosGuideOpen, setIsPosGuideOpen] = useState<boolean>(false);

  // POS Register Shift & Z-Report State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftRecord, setShiftRecord] = useState<PosShiftRecord>(() =>
    posService.getActiveShift('TERM-01', activeStaff.name)
  );
  const [countedCashInput, setCountedCashInput] = useState<string>(() =>
    (shiftRecord.startingCashMMK + shiftRecord.totalCashSalesMMK).toString()
  );
  const [shiftClosureNotes, setShiftClosureNotes] = useState<string>('');
  const [activeZReport, setActiveZReport] = useState<PosZReport | null>(null);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [startingFloatInput, setStartingFloatInput] = useState<string>('150000');

  // Barcode Scanner & Hardware UX State
  const [scannerToast, setScannerToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [drawerStatusMessage, setDrawerStatusMessage] = useState<string | null>(null);
  const [showScannerSimulator, setShowScannerSimulator] = useState<boolean>(false);
  const [simulatorInput, setSimulatorInput] = useState<string>('');

  // Offline-First Network & Local Queue State
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync((syncedCount) => {
    setScannerToast({
      message: `⚡ Network connection restored! ${syncedCount} offline transaction(s) synced to server successfully.`,
      type: 'success',
    });
    setTimeout(() => setScannerToast(null), 5000);
  });

  // Subtotal & Financial Ledger Calculation
  const subtotalMMK = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.unitPriceMMK * item.quantity, 0);
  }, [cartItems]);

  const depositCreditedMMK = useMemo(() => {
    const hasBookingBal = cartItems.some((it) => it.category === 'BOOKING_BALANCE');
    return hasBookingBal ? (bookingState.depositAmount || 105000) : 0;
  }, [cartItems, bookingState.depositAmount]);

  const totalDueMMK = useMemo(() => {
    return Math.max(0, subtotalMMK);
  }, [subtotalMMK]);

  // Keep tendered cash synchronized with total balance due
  useEffect(() => {
    setTenderedCashInput(totalDueMMK.toString());
  }, [totalDueMMK]);

  const changeDueMMK = useMemo(() => {
    const tendered = parseInt(tenderedCashInput.replace(/,/g, ''), 10) || 0;
    return Math.max(0, tendered - totalDueMMK);
  }, [tenderedCashInput, totalDueMMK]);

  // Handle Cart Operations
  const handleAddToCart = (item: Omit<PosCartLineItem, 'id'>) => {
    const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setCartItems((prev) => [...prev, { ...item, id }]);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const nextQty = it.quantity + delta;
            return nextQty > 0 ? { ...it, quantity: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as PosCartLineItem[]
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Staff Switch & Terminal Lock Handlers
  const handleStaffSwitch = (staff: PosStaffMember) => {
    setActiveStaff(staff);
    posStaffService.unlockTerminal(staff);
    setIsTerminalLocked(false);
    setIsStaffModalOpen(false);
    setShiftRecord((prev) => ({
      ...prev,
      staffName: staff.name,
      staffId: staff.id,
      staffRole: staff.role,
    }));
    setScannerToast({
      message: `👤 Switched Staff: ${staff.name} (${staff.role.replace('_', ' ')})`,
      type: 'success',
    });
    setTimeout(() => setScannerToast(null), 4000);
  };

  const handleLockTerminal = () => {
    posStaffService.lockTerminal();
    setIsTerminalLocked(true);
  };

  const handleClearCart = () => {
    if (cartItems.length > 0 && !posStaffService.canVoidCart(activeStaff.role)) {
      setManagerOverrideReq({
        isOpen: true,
        actionTitle: 'Authorize Void Cart',
        actionDescription: `${activeStaff.name} (${activeStaff.role.replace('_', ' ')}) requested to void the active shopping cart with ${cartItems.length} items. Manager authorization required.`,
        onAuthorized: (manager) => {
          setCartItems([]);
          setOcrResult(null);
          setScannerToast({
            message: `🛒 Cart voided with manager authorization (${manager.name})`,
            type: 'success',
          });
          setTimeout(() => setScannerToast(null), 4000);
        },
      });
      return;
    }
    setCartItems([]);
    setOcrResult(null);
  };

  // Search bookings for Check-In
  const handleSearchCheckIn = async () => {
    if (!checkInSearch.trim()) return;
    setIsSearchingBookings(true);
    try {
      const results = await posService.lookupBookingForDesk(
        checkInSearch.trim(),
        bookingState.tenantId
      );
      setFoundBookings(results);
    } catch (e) {
      console.error('Desk booking lookup error:', e);
    } finally {
      setIsSearchingBookings(false);
    }
  };

  const handleSelectBookingForCheckin = (bk: CustomerBookingRecord) => {
    setGuestName(bk.customerName);
    setClientPhone(bk.customerPhone);
    setBayAllocation(bk.spaceSnapshot?.name || 'BAY ALPHA-01');
    setLinkedBookingRef(bk.bookingReference);

    const rem = bk.outstandingBalance || 0;
    setCartItems([
      {
        id: `bk-${bk.id}`,
        category: 'BOOKING_BALANCE',
        title: `${bk.packageSnapshot?.name || 'Session'} (Final Balance Settlement)`,
        myanmarTitle: 'Advance Booking Balance Settlement',
        unitPriceMMK: rem,
        quantity: 1,
        referenceId: bk.bookingReference,
        bayAllocation: bk.spaceSnapshot?.name,
        notes: `Paid deposit ${bk.verifiedPaidAmount.toLocaleString()} MMK credited.`,
      },
    ]);
  };

  // High-Speed Barcode & QR Code Processing
  const handleBarcodeScan = (scannedRaw: string) => {
    const code = scannedRaw.trim();
    if (!code) return;

    // 0. Match Staff Badge (e.g. "STAFF-AK-01")
    const matchedStaff = posStaffService.authenticateByBadge(code);
    if (matchedStaff) {
      handleStaffSwitch(matchedStaff);
      playScannerBeep('success');
      return;
    }

    // 1. Match Retail Products (by SKU or ID, case-insensitive)
    const product = INITIAL_CLIENT_PRODUCTS.find(
      (p) => p.sku?.toLowerCase() === code.toLowerCase() || p.id.toLowerCase() === code.toLowerCase()
    );
    if (product) {
      const existing = cartItems.find((it) => it.referenceId === product.id || it.referenceId === product.sku);
      if (existing) {
        handleUpdateQuantity(existing.id, 1);
      } else {
        handleAddToCart({
          category: 'RETAIL_PRODUCT',
          title: product.name,
          myanmarTitle: product.myanmarName || product.name,
          unitPriceMMK: product.priceMMK,
          quantity: 1,
          referenceId: product.id,
          notes: `SKU: ${product.sku || 'N/A'}`,
        });
      }
      playScannerBeep('success');
      setScannerToast({
        message: `🛒 Scanned: ${product.name} (${product.sku || product.id}) added to cart!`,
        type: 'success',
      });
      setTimeout(() => setScannerToast(null), 4000);
      return;
    }

    // 2. Match Equipment Rental (by ID, assetCode, or name)
    const gear = INITIAL_EQUIPMENT_LIST.find(
      (g) =>
        g.id.toLowerCase() === code.toLowerCase() ||
        g.assetCode?.toLowerCase() === code.toLowerCase() ||
        g.name.toLowerCase() === code.toLowerCase()
    );
    if (gear) {
      const existing = cartItems.find((it) => it.referenceId === gear.id);
      if (existing) {
        handleUpdateQuantity(existing.id, 1);
      } else {
        handleAddToCart({
          category: 'GEAR_RENTAL',
          title: gear.name,
          myanmarTitle: gear.myanmarName || gear.name,
          unitPriceMMK: 25000,
          quantity: 1,
          referenceId: gear.id,
          notes: `Asset: ${gear.assetCode || gear.id}`,
        });
      }
      playScannerBeep('success');
      setScannerToast({
        message: `📸 Scanned Gear: ${gear.name} added to cart!`,
        type: 'success',
      });
      setTimeout(() => setScannerToast(null), 4000);
      return;
    }

    // 3. Match Photography Packages (by ID or name)
    const pkg = PHOTOGRAPHY_PACKAGES.find(
      (p) => p.id.toLowerCase() === code.toLowerCase() || p.name.toLowerCase() === code.toLowerCase()
    );
    if (pkg) {
      handleAddToCart({
        category: 'WALK_IN_PACKAGE',
        title: pkg.name,
        myanmarTitle: pkg.name,
        unitPriceMMK: pkg.price,
        quantity: 1,
        referenceId: pkg.id,
      });
      playScannerBeep('success');
      setScannerToast({
        message: `🎨 Scanned Package: ${pkg.name} added to cart!`,
        type: 'success',
      });
      setTimeout(() => setScannerToast(null), 4000);
      return;
    }

    // 4. Match Linked Booking Reference (#AJ-BK... or BK-...)
    if (code.startsWith('#') || code.toUpperCase().startsWith('BK-') || code.toUpperCase().startsWith('AJ-BK-')) {
      posService.lookupBookingForDesk(code, bookingState.tenantId).then((found) => {
        if (found.length > 0) {
          handleSelectBookingForCheckin(found[0]);
          playScannerBeep('success');
          setScannerToast({
            message: `📋 Linked Booking Scanned: ${found[0].bookingReference} (${found[0].customerName}) checked in!`,
            type: 'success',
          });
        } else {
          playScannerBeep('error');
          setScannerToast({
            message: `⚠️ Booking Reference "${code}" not found in system.`,
            type: 'warning',
          });
        }
        setTimeout(() => setScannerToast(null), 4500);
      }).catch(() => {
        playScannerBeep('error');
        setScannerToast({
          message: `⚠️ Booking lookup failed for "${code}".`,
          type: 'warning',
        });
        setTimeout(() => setScannerToast(null), 4000);
      });
      return;
    }

    // 5. Unrecognized barcode
    playScannerBeep('error');
    setScannerToast({
      message: `⚠️ Unrecognized Barcode / SKU: "${code}"`,
      type: 'warning',
    });
    setTimeout(() => setScannerToast(null), 4000);
  };

  // Register Global Barcode Scanner Listener
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !isReceiptModalOpen && !isShiftModalOpen,
  });

  // Manual Cash Drawer Kick Trigger
  const handleManualKickDrawer = async () => {
    setDrawerStatusMessage('Triggering cash drawer pulse...');
    try {
      const res = await kickCashDrawerDirect();
      setDrawerStatusMessage(res.message);
    } catch (err: any) {
      setDrawerStatusMessage(err.message || 'Failed to trigger cash drawer pulse');
    }
    setTimeout(() => setDrawerStatusMessage(null), 4000);
  };

  // Mobile Slip AI Verification
  const handleSlipFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrVerifying(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Data = ev.target?.result as string;
        const res = await verifySlip({
          image: base64Data,
          mime_type: file.type,
          expected_amount_mmk: totalDueMMK,
          manifest_id: linkedBookingRef || bookingState.manifestId,
          gateway: paymentMethod,
        });

        if (res.success) {
          setOcrResult({
            transaction_id: res.transaction_id,
            amount_mmk: res.amount_mmk,
          });
        }
        setIsOcrVerifying(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsOcrVerifying(false);
    }
  };

  // Complete Checkout & Print Receipt
  const handleCompleteCheckout = async () => {
    if (cartItems.length === 0) return;

    const tenderedVal =
      paymentMethod === 'CASH'
        ? parseInt(tenderedCashInput.replace(/,/g, ''), 10) || totalDueMMK
        : undefined;

    const splitBreakdown =
      paymentMethod === 'SPLIT'
        ? {
            cashAmountMMK: parseInt(splitCashInput.replace(/,/g, ''), 10) || 0,
            digitalAmountMMK: parseInt(splitDigitalInput.replace(/,/g, ''), 10) || 0,
            digitalGateway: 'KBZPay' as const,
          }
        : undefined;

    const trx = await posService.recordTransaction({
      orderReference: `ORD-${Date.now().toString().slice(-6)}`,
      customerName: guestName,
      customerPhone: clientPhone,
      bayAllocation,
      bookingReference: linkedBookingRef,
      items: cartItems,
      subtotalMMK,
      depositCreditedMMK,
      discountMMK: 0,
      taxMMK: 0,
      totalDueMMK,
      paymentMethod,
      tenderedCashMMK: tenderedVal,
      changeDueMMK: paymentMethod === 'CASH' ? changeDueMMK : 0,
      splitDetails: splitBreakdown,
      tenantId: bookingState.tenantId,
      cashierName: activeStaff.name,
      cashierId: activeStaff.id,
      cashierRole: activeStaff.role,
      terminalId: 'TERM-01',
    });

    setCompletedTransaction(trx);
    setShiftRecord(posService.getActiveShift('TERM-01', activeStaff.name));

    // Auto-kick physical cash drawer on Cash or Split transactions
    if (paymentMethod === 'CASH' || paymentMethod === 'SPLIT') {
      kickCashDrawerDirect().then((res) => {
        if (res.success) {
          setDrawerStatusMessage('Cash drawer opened automatically');
        }
      }).catch((e) => {
        console.warn('Cash drawer auto-kick error:', e);
      });
    }

    setIsReceiptModalOpen(true);

    if (linkedBookingRef && onSyncBookingToGlobal) {
      onSyncBookingToGlobal({
        depositPaid: true,
        manifestId: linkedBookingRef,
      });
    }
  };

  // Direct ESC/POS Hardware Printing
  const handleDirectThermalPrint = async () => {
    if (!completedTransaction) return;
    setIsDirectPrinting(true);
    setPrinterStatusMessage('Connecting to ESC/POS thermal printer via WebUSB...');
    try {
      const receiptBinary = buildEscPosReceipt(completedTransaction, {
        cutPaper: true,
        openDrawer: completedTransaction.paymentMethod === 'CASH' || completedTransaction.paymentMethod === 'SPLIT',
        studioName: tenant.legalName,
        studioAddress: tenant.address,
        studioPhone: tenant.phone,
      });
      const success = await printDirectWebUsb(receiptBinary);
      if (success) {
        setPrinterStatusMessage('Direct ESC/POS receipt printed successfully & drawer pulse kicked!');
      } else {
        setPrinterStatusMessage('Direct WebUSB printing failed. Falling back to browser system print.');
        window.print();
      }
    } catch (e: any) {
      setPrinterStatusMessage(`USB Error: ${e.message || 'No compatible USB printer paired'}`);
      window.print();
    } finally {
      setIsDirectPrinting(false);
      setTimeout(() => setPrinterStatusMessage(null), 5000);
    }
  };

  // Mid-Shift X-Report Handler
  const handlePrintXReport = async () => {
    try {
      const xRep = posService.generateXReport('TERM-01', activeStaff.name, undefined, bookingState.tenantId);
      const binary = buildEscPosZReport(xRep, {
        studioName: tenant.legalName,
        studioAddress: tenant.address,
        studioPhone: tenant.phone,
        openDrawer: false,
      });
      const ok = await printDirectWebUsb(binary);
      if (!ok) window.print();
    } catch {
      window.print();
    }
  };

  // Shift Counted Cash Change Handler
  const handleCountedCashChange = (val: string) => {
    setCountedCashInput(val);
    const parsed = parseInt(val.replace(/,/g, ''), 10) || 0;
    const rep = posService.generateXReport('TERM-01', activeStaff.name, parsed, bookingState.tenantId);
    setActiveZReport(rep);
  };

  // Finalize Z-Report & Close Shift
  const handleFinalizeZReport = async () => {
    setIsClosingShift(true);
    try {
      const parsed = parseInt(countedCashInput.replace(/,/g, ''), 10) || 0;
      const { shift: closed, zReport: zRep } = posService.closeShiftAndGenerateZReport({
        terminalId: 'TERM-01',
        staffName: activeStaff.name,
        actualCashInDrawerMMK: parsed,
        closureNotes: shiftClosureNotes,
        tenantId: bookingState.tenantId,
      });

      setShiftRecord(closed);
      setActiveZReport(zRep);

      const binary = buildEscPosZReport(zRep, {
        studioName: tenant.legalName,
        studioAddress: tenant.address,
        studioPhone: tenant.phone,
        openDrawer: true,
      });
      const ok = await printDirectWebUsb(binary);
      if (!ok) window.print();
    } catch (e) {
      console.error('Error closing shift:', e);
    } finally {
      setIsClosingShift(false);
    }
  };

  const doRecordCashMovement = (
    type: 'CASH_DROP' | 'CASH_IN',
    amountMMK: number,
    reason: string,
    authorizedBy?: string
  ) => {
    const { shift: updated } = posService.recordCashMovement({
      type,
      amountMMK,
      reason,
      performedBy: activeStaff.name,
      staffId: activeStaff.id,
      staffRole: activeStaff.role,
      authorizedBy,
      terminalId: shiftRecord.terminalId || 'TERM-01',
    });
    setShiftRecord({ ...updated });

    // Update active report live discrepancy if user was previewing
    const parsed = parseInt(countedCashInput.replace(/,/g, ''), 10) || 0;
    if (parsed > 0) {
      const rep = posService.generateXReport(
        shiftRecord.terminalId,
        activeStaff.name,
        parsed,
        bookingState.tenantId
      );
      setActiveZReport(rep);
    }
  };

  // Cash Drop / Cash In handler
  const handleRecordCashMovement = ({
    type,
    amountMMK,
    reason,
  }: {
    type: 'CASH_DROP' | 'CASH_IN';
    amountMMK: number;
    reason: string;
  }) => {
    if (
      type === 'CASH_DROP' &&
      amountMMK > 50000 &&
      !posStaffService.canPerformLargeCashDrop(activeStaff.role, amountMMK)
    ) {
      setManagerOverrideReq({
        isOpen: true,
        actionTitle: 'Authorize Large Cash Drop',
        actionDescription: `Cash drop of ${amountMMK.toLocaleString()} MMK exceeds the 50,000 MMK threshold. Manager authorization required.`,
        onAuthorized: (manager) => {
          doRecordCashMovement(
            type,
            amountMMK,
            `${reason} (Approved by ${manager.name})`,
            manager.name
          );
        },
      });
      return;
    }
    doRecordCashMovement(type, amountMMK, reason);
  };

  // Historical Shift Z-Report Reprint handler
  const handleReprintHistoricalShift = async (historicalShift: PosShiftRecord) => {
    try {
      const report = posService.generateXReport(
        historicalShift.terminalId,
        historicalShift.staffName,
        historicalShift.actualCashInDrawerMMK ?? (historicalShift.startingCashMMK + historicalShift.totalCashSalesMMK),
        bookingState.tenantId
      );
      const zRep: PosZReport = {
        ...report,
        reportType: 'Z_REPORT',
        shiftId: historicalShift.shiftId,
        closedAt: historicalShift.closedAt || new Date().toISOString(),
        closureNotes: historicalShift.closureNotes || 'Historical shift re-print',
      };

      const binary = buildEscPosZReport(zRep, {
        studioName: tenant.legalName,
        studioAddress: tenant.address,
        studioPhone: tenant.phone,
        openDrawer: false,
      });
      const ok = await printDirectWebUsb(binary);
      if (!ok) window.print();
    } catch {
      window.print();
    }
  };

  // Start New Shift
  const handleStartNewShift = () => {
    const float = parseInt(startingFloatInput.replace(/,/g, ''), 10) || 150000;
    const newShift = posService.openNewShift('TERM-01', activeStaff.name, float);
    setShiftRecord({
      ...newShift,
      staffId: activeStaff.id,
      staffRole: activeStaff.role,
    });
    setCountedCashInput(float.toString());
    setActiveZReport(null);
    setShiftClosureNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#030F1E] flex flex-col overflow-hidden text-[#F1F5F9] font-sans">
      {/* ---------------------------------------------------------------------
          TOP NAVIGATION BAR (DESK HEADER & SHIFT RECONCILIATION BAR)
      --------------------------------------------------------------------- */}
      <header className="h-14 bg-[#071423] border-b border-[#1E3A4F] px-3 sm:px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h1 className="text-sm font-bold tracking-tight text-[#F1F5F9] truncate">
              {tenant.displayName} • POS Terminal
            </h1>
            <p className="text-[10px] text-[#94A3B8] font-mono truncate">
              {shiftRecord.terminalId} • {activeStaff.name} ({activeStaff.role.replace('_', ' ')})
            </p>
          </div>
        </div>

        {/* Center: Shift & Drawer Float Widget */}
        <div className="hidden lg:flex items-center space-x-3 bg-[#030F1E] px-3 py-1.5 rounded-xl border border-[#1E3A4F] font-mono text-xs">
          <div className="flex items-center space-x-1.5 text-[#94A3B8]">
            <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Shift:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                shiftRecord.status === 'OPEN'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {shiftRecord.status}
            </span>
          </div>

          <div className="h-4 w-px bg-[#1E3A4F]" />

          <div className="flex items-center space-x-1 text-[#94A3B8]">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Drawer:</span>
            <span className="font-bold text-[#F1F5F9]">
              {(
                shiftRecord.startingCashMMK +
                shiftRecord.totalCashSalesMMK +
                (shiftRecord.totalCashInMMK || 0) -
                (shiftRecord.totalCashDropsMMK || 0)
              ).toLocaleString()}{' '}
              MMK
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="px-2 py-0.5 rounded bg-[#102538] hover:bg-[#1E3A4F] text-[#38BDF8] text-[11px] font-semibold transition-colors cursor-pointer border border-[#1E3A4F]"
          >
            Reconcile / Z-Report
          </button>
        </div>

        {/* Center-Right: Scanner Active Badge & Network/Queue Status */}
        <div className="hidden md:flex items-center space-x-2">
          {/* Network & Offline Queue Status */}
          {isOnline && pendingCount === 0 ? (
            <div
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400"
              title="Connected to POS Cloud API"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Online</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => syncNow()}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[11px] font-mono text-amber-300 transition-colors cursor-pointer disabled:opacity-60"
              title="Click to sync offline transactions with server"
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : !isOnline ? (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {!isOnline ? 'Offline' : 'Sync'}: {pendingCount} queued
              </span>
            </button>
          )}

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Barcode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">Scanner Active</span>
          </div>

          <button
            type="button"
            onClick={() => setShowScannerSimulator((v) => !v)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              showScannerSimulator
                ? 'bg-[#38BDF8] text-[#071423] border-[#38BDF8] font-bold'
                : 'bg-[#030F1E] hover:bg-[#102538] text-[#38BDF8] border-[#1E3A4F]'
            }`}
            title="Open Barcode & QR Scanner Hardware Simulator"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Scan Sim</span>
          </button>
        </div>

        {/* Right: Controls & Responsive Views */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Staff Switch & Lock Widget */}
          <div className="flex items-center space-x-1 bg-[#030F1E] px-2 py-1 rounded-xl border border-[#1E3A4F]">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(true)}
              className="flex items-center space-x-1.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
              title="Switch Staff Cashier (PIN or Badge)"
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0"
                style={{
                  backgroundColor: `${activeStaff.avatarColor}20`,
                  color: activeStaff.avatarColor,
                  border: `1px solid ${activeStaff.avatarColor}40`,
                }}
              >
                {activeStaff.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-xs font-bold text-[#F1F5F9] truncate leading-tight">
                  {activeStaff.name}
                </div>
                <div className="text-[9px] text-[#94A3B8] font-mono leading-tight">
                  {activeStaff.role.replace('_', ' ')}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleLockTerminal}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-amber-400 hover:bg-[#102538] transition-colors cursor-pointer"
              title="Lock POS Terminal"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* System User Guide Button */}
          <button
            type="button"
            onClick={() => setIsPosGuideOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold transition-colors cursor-pointer"
            title="Open Interactive System User Guide (EN / MM)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Guide</span>
          </button>

          {/* Mobile Shift Button */}
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="lg:hidden p-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-[#38BDF8] text-xs font-semibold cursor-pointer"
            title="Shift & Drawer"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Direct Cash Drawer Kick */}
          <button
            type="button"
            onClick={handleManualKickDrawer}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#030F1E] hover:bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] text-xs font-medium transition-colors cursor-pointer"
            title="Send ESC/POS drawer kick pulse via USB"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Kick Drawer</span>
          </button>

          {onToggleWorkspaceView && (
            <button
              type="button"
              onClick={onToggleWorkspaceView}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#102538] transition-colors cursor-pointer"
              title="Toggle View Mode"
            >
              {workspaceView === 'compact' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onCloseDesk}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#102538] transition-colors cursor-pointer"
            title="Exit POS Desk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ---------------------------------------------------------------------
          BARCODE SCANNER SIMULATOR (DEV & PHYSICAL-SCANNER ALTERNATIVE)
      --------------------------------------------------------------------- */}
      {showScannerSimulator && (
        <div className="bg-[#0b1c2e] border-b border-[#38BDF8]/40 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono z-30">
          <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
            <Barcode className="w-4 h-4 text-[#38BDF8] shrink-0" />
            <span className="text-[#94A3B8] text-[11px] shrink-0">Simulate Scan:</span>
            <input
              type="text"
              value={simulatorInput}
              onChange={(e) => setSimulatorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && simulatorInput.trim()) {
                  handleBarcodeScan(simulatorInput);
                  setSimulatorInput('');
                }
              }}
              placeholder="Enter SKU, Serial, or Booking Code..."
              className="bg-[#030F1E] border border-[#1E3A4F] rounded px-2.5 py-1 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] flex-1 max-w-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (simulatorInput.trim()) {
                  handleBarcodeScan(simulatorInput);
                  setSimulatorInput('');
                }
              }}
              className="px-2.5 py-1 rounded bg-[#38BDF8] text-[#071423] font-bold hover:bg-[#0284C7] cursor-pointer shrink-0"
            >
              Scan
            </button>
          </div>

          {/* Quick presets for rapid click-testing */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px]">
            <span className="text-[#64748B] text-[10px]">Presets:</span>
            {[
              { code: 'AJ-CAN-1624', label: 'Floating Canvas' },
              { code: 'AJ-ACR-1218', label: 'Acrylic Frame' },
              { code: 'AJ-FLM-KP400', label: 'Portra 400' },
              { code: 'AJ-USB-WN128', label: 'Walnut USB' },
              { code: '#AJ-BK-2026-8801', label: 'Booking QR' },
            ].map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => handleBarcodeScan(p.code)}
                className="px-2 py-0.5 rounded bg-[#102538] hover:bg-[#1E3A4F] text-[#38BDF8] border border-[#1E3A4F] hover:border-[#38BDF8]/50 cursor-pointer shrink-0 transition-colors"
                title={`Scan ${p.label} (${p.code})`}
              >
                {p.code}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowScannerSimulator(false)}
            className="text-[#94A3B8] hover:text-[#F1F5F9] p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barcode Scanner Feedback Toast Banner */}
      {scannerToast && (
        <div
          className={`px-4 py-2 text-xs font-mono flex items-center justify-between z-30 transition-all ${
            scannerToast.type === 'success'
              ? 'bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/90 border-b border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {scannerToast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="font-semibold">{scannerToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setScannerToast(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer ml-4"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          MAIN TWO-COLUMN WORKSTATION VIEW (DESKTOP: 2 COLUMNS, MOBILE: ADAPTIVE)
      --------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        {/* Left: Catalog & Search Tabs (Hidden on mobile if user toggled to cart view) */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileActiveView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
          <PosCatalogTabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            checkInSearch={checkInSearch}
            onCheckInSearchChange={setCheckInSearch}
            onSearchCheckIn={handleSearchCheckIn}
            isSearchingBookings={isSearchingBookings}
            foundBookings={foundBookings}
            onSelectBookingForCheckin={handleSelectBookingForCheckin}
            gearCategoryFilter={gearCategoryFilter}
            onGearCategoryFilterChange={setGearCategoryFilter}
            retailCategoryFilter={retailCategoryFilter}
            onRetailCategoryFilterChange={setRetailCategoryFilter}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Right: Cart & Checkout Register (Hidden on mobile if user is looking at catalog) */}
        <div className={`w-full md:w-auto ${mobileActiveView === 'catalog' ? 'hidden md:flex' : 'flex'}`}>
          <PosCartCheckout
            tenant={tenant}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            clientPhone={clientPhone}
            onClientPhoneChange={setClientPhone}
            linkedBookingRef={linkedBookingRef}
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
            subtotalMMK={subtotalMMK}
            depositCreditedMMK={depositCreditedMMK}
            totalDueMMK={totalDueMMK}
            paymentMethod={paymentMethod}
            onSelectPaymentMethod={setPaymentMethod}
            tenderedCashInput={tenderedCashInput}
            onTenderedCashInputChange={setTenderedCashInput}
            changeDueMMK={changeDueMMK}
            splitCashInput={splitCashInput}
            onSplitCashInputChange={setSplitCashInput}
            splitDigitalInput={splitDigitalInput}
            onSplitDigitalInputChange={setSplitDigitalInput}
            isOcrVerifying={isOcrVerifying}
            ocrResult={ocrResult}
            onSlipFileUpload={handleSlipFileUpload}
            onCompleteCheckout={handleCompleteCheckout}
            onKickDrawer={handleManualKickDrawer}
            drawerStatusMessage={drawerStatusMessage}
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          MOBILE FLOATING VIEW SWITCHER (Phase 2 Ergonomic Adaptation)
      --------------------------------------------------------------------- */}
      <div className="md:hidden bg-[#071423] border-t border-[#1E3A4F] px-4 py-2.5 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        <div className="flex items-center space-x-2">
          <span className="text-[#94A3B8]">Ticket Total:</span>
          <span className="font-bold text-[#38BDF8] text-sm">{totalDueMMK.toLocaleString()} MMK</span>
          <span className="text-[10px] text-[#64748B]">({cartItems.length} items)</span>
        </div>

        <button
          type="button"
          onClick={() => setMobileActiveView(mobileActiveView === 'catalog' ? 'cart' : 'catalog')}
          className="px-3 py-1.5 rounded-lg bg-[#38BDF8] text-[#071423] font-bold text-xs flex items-center space-x-1 cursor-pointer"
        >
          {mobileActiveView === 'catalog' ? (
            <>
              <span>View Cart / Pay</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>+ Add Items</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* ---------------------------------------------------------------------
          MODALS: THERMAL RECEIPT & SHIFT RECONCILIATION
      --------------------------------------------------------------------- */}
      <PosReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        transaction={completedTransaction}
        tenant={tenant}
        printerStatusMessage={printerStatusMessage}
        isDirectPrinting={isDirectPrinting}
        onDirectThermalPrint={handleDirectThermalPrint}
        onKickDrawer={handleManualKickDrawer}
        onNewSale={handleClearCart}
      />

      <PosShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        shiftRecord={shiftRecord}
        tenant={tenant}
        countedCashInput={countedCashInput}
        onCountedCashChange={handleCountedCashChange}
        activeZReport={activeZReport}
        shiftClosureNotes={shiftClosureNotes}
        onShiftClosureNotesChange={setShiftClosureNotes}
        startingFloatInput={startingFloatInput}
        onStartingFloatInputChange={setStartingFloatInput}
        onStartNewShift={handleStartNewShift}
        onPrintXReport={handlePrintXReport}
        onFinalizeZReport={handleFinalizeZReport}
        onRecordCashMovement={handleRecordCashMovement}
        onReprintHistoricalShift={handleReprintHistoricalShift}
        isClosingShift={isClosingShift}
      />

      {/* Staff Fast PIN Switch & Lock Screen Modal */}
      <PosStaffModal
        isOpen={isStaffModalOpen || isTerminalLocked}
        isLocked={isTerminalLocked}
        activeStaff={activeStaff}
        onStaffAuthenticated={handleStaffSwitch}
        onClose={() => setIsStaffModalOpen(false)}
      />

      {/* Manager Override Authorization Modal */}
      {managerOverrideReq && (
        <PosManagerOverrideModal
          isOpen={managerOverrideReq.isOpen}
          actionTitle={managerOverrideReq.actionTitle}
          actionDescription={managerOverrideReq.actionDescription}
          onAuthorized={(mgr) => {
            managerOverrideReq.onAuthorized(mgr);
            setManagerOverrideReq(null);
          }}
          onClose={() => setManagerOverrideReq(null)}
        />
      )}

      {/* System Interactive User Guide Modal */}
      <StudioUserGuideModal
        isOpen={isPosGuideOpen}
        onClose={() => setIsPosGuideOpen(false)}
        defaultModule="pos_desk"
      />
    </div>
  );
};
