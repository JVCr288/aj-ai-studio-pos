import React, { useState, useRef, useEffect } from 'react';
import {
  BookingState,
  PhotographyPackage,
  StudioBayTelemetry,
  RealtimeSlotTelemetry,
  PaymentGateway,
  WorkspaceView,
} from '../types';
import { PHOTOGRAPHY_PACKAGES, GATEWAY_CONFIGS } from '../data/mockData';
import { SUPPORTED_PAYMENT_GATEWAYS, getPaymentBrand } from '../utils/paymentBrands';
import {
  INITIAL_BAY_TELEMETRY,
  INITIAL_SLOT_TELEMETRY,
  fetchBayOccupancyTelemetry,
} from '../data/occupancyData';
import { StudioBayOccupancyIndicator } from './StudioBayOccupancyIndicator';
import { InteractiveFloorPlan } from './InteractiveFloorPlan';
import { MonthCalendarPicker } from './MonthCalendarPicker';
import { TelegramIntegrationModule } from './TelegramIntegrationModule';
import { sendTelegramBookingWebhook } from '../utils/telegramWebhook';
import {
  Lock,
  UploadCloud,
  ChevronRight,
  Check,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  FileCheck,
  Sliders,
  ShoppingBag,
  FileText,
  AlertTriangle,
  Radio,
  Send,
  Compass,
  MapPin,
  QrCode,
  User,
  Crosshair,
  Shield,
  Info,
  Copy,
  CheckCircle2,
  Camera,
} from 'lucide-react';

interface BookingScreenProps {
  bookingState: BookingState;
  onUpdateBooking: (updates: Partial<BookingState>) => void;
  onOpenPaymentModal: () => void;
  onProceedToVerification: () => void;
  onOpenEquipment?: () => void;
  workspaceView?: WorkspaceView;
}

export const BookingScreen: React.FC<BookingScreenProps> = ({
  bookingState,
  onUpdateBooking,
  onOpenPaymentModal,
  onProceedToVerification,
  onOpenEquipment,
  workspaceView = 'compact',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Real-time Bay Occupancy Telemetry State
  const [baysTelemetry, setBaysTelemetry] = useState<StudioBayTelemetry[]>(INITIAL_BAY_TELEMETRY);
  const [slotsTelemetry, setSlotsTelemetry] = useState<RealtimeSlotTelemetry[]>(INITIAL_SLOT_TELEMETRY);
  const [overallOccupancy, setOverallOccupancy] = useState<number>(66);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [isFetchingTelemetry, setIsFetchingTelemetry] = useState<boolean>(false);
  const [soldOutAlert, setSoldOutAlert] = useState<string | null>(null);
  const [filterAvailableOnly, setFilterAvailableOnly] = useState<boolean>(false);
  const [studioLayoutTab, setStudioLayoutTab] = useState<'floorplan' | 'occupancy'>('floorplan');

  // Bay selection handler from SVG Floor Plan
  const handleSelectBayFromFloorPlan = (bayName: string) => {
    const matchedPkg = PHOTOGRAPHY_PACKAGES.find(
      (p) => p.suiteAllocation.toLowerCase() === bayName.toLowerCase()
    );
    if (matchedPkg) {
      onUpdateBooking({
        packageId: matchedPkg.id,
        selectedPackage: matchedPkg,
        totalAmount: matchedPkg.price,
        depositAmount: matchedPkg.deposit,
        bayAllocation: matchedPkg.suiteAllocation,
      });
    } else {
      onUpdateBooking({
        bayAllocation: bayName,
      });
    }
  };

  // Fetch telemetry helper
  const handleFetchTelemetry = (date: string = bookingState.dateStr) => {
    setIsFetchingTelemetry(true);
    fetchBayOccupancyTelemetry(date)
      .then((res) => {
        setBaysTelemetry(res.bays);
        setSlotsTelemetry(res.slots);
        setOverallOccupancy(res.overallOccupancyPercent);
        setLastSyncTime(res.lastSyncTimestamp);
        setIsFetchingTelemetry(false);
      })
      .catch((err) => {
        console.error('Failed to fetch bay occupancy telemetry', err);
        setIsFetchingTelemetry(false);
      });
  };

  // Re-fetch telemetry whenever target booking date changes
  useEffect(() => {
    handleFetchTelemetry(bookingState.dateStr);
  }, [bookingState.dateStr]);

  // November 2026 Days
  const days = [
    { num: 16, day: 'MON', available: true },
    { num: 17, day: 'TUE', available: true },
    { num: 18, day: 'WED', available: true, active: true },
    { num: 19, day: 'THU', available: true },
    { num: 20, day: 'FRI', available: true },
    { num: 21, day: 'SAT', available: false, booked: true },
    { num: 22, day: 'SUN', available: true },
  ];

  const handleSelectPackage = (pkg: PhotographyPackage) => {
    onUpdateBooking({
      packageId: pkg.id,
      selectedPackage: pkg,
      totalAmount: pkg.price,
      depositAmount: pkg.deposit,
      bayAllocation: pkg.suiteAllocation,
    });
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateBooking({
        uploadedSlipName: file.name,
        uploadedSlipSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadedSlipData: typeof reader.result === 'string' ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUseDemoSlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateBooking({
      uploadedSlipName: `${bookingState.gateway}_Slip_TRX88219.png`,
      uploadedSlipSize: '2.1 MB',
      uploadedSlipData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });
  };

  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex-1 transition-[max-width] duration-300 ${
        workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
      }`}
    >
      {/* Top Banner / Pipeline ID */}
      <div className="mb-4 sm:mb-5 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-ui font-semibold bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
              Reservation Pipeline
            </span>
            <span className="text-[#7E8F9F] text-xs font-ui">
              ID: <span className="font-mono-code text-[#CBD5E1] font-semibold">{bookingState.manifestId}</span>
            </span>
          </div>
          <h1 className="font-ui font-bold text-2xl md:text-3xl tracking-tight text-[#F1F5F9]">
            Reserve Your Studio Session
          </h1>
          <p className="text-xs text-[#94A3B8] font-light mt-1">
            Professional spaces. Creative freedom. Unforgettable results.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden xl:flex flex-col text-right font-space font-bold text-[10px] tracking-[0.25em] text-[#A87452]/70 uppercase select-none pointer-events-none leading-tight">
            <span>CAPTURE</span>
            <span>CREATE</span>
            <span>BELONG</span>
          </div>
          <div className="flex items-center space-x-2 bg-[#0B1B2B] border border-[#1E3A4F] px-3.5 py-1.5 rounded-lg text-xs font-ui self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
            <span className="text-[#7E8F9F]">Timezone:</span>
            <span className="text-[#38BDF8] font-mono-code font-semibold">UTC+06:30 (YGN)</span>
          </div>
        </div>
      </div>

      {/* TIER 1: Upper 3-Column Booking Workstation (Packages | Date & Briefing | Deposit Settlement) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Column 1: Packages & Manifest Identity */}
        <section className="lg:col-span-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-[#A87452]" />
              <span className="font-ui font-bold text-sm tracking-wide text-[#F1F5F9]">
                1. Select Photography Package
              </span>
            </div>
            <span className="font-ui text-xs text-[#7E8F9F]">
              {PHOTOGRAPHY_PACKAGES.length} Options
            </span>
          </div>

          <div className="space-y-2.5">
            {PHOTOGRAPHY_PACKAGES.map((pkg) => {
              const isSelected = bookingState.packageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  className={`relative p-3.5 sm:p-4 transition-all cursor-pointer card-action-interactive ${
                    isSelected
                      ? 'glass-selected'
                      : 'glass-level-2 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    {pkg.recommended ? (
                      <span className="badge-copper">
                        RECOMMENDED
                      </span>
                    ) : (
                      <span className="font-ui text-[10px] font-medium text-[#7E8F9F] uppercase tracking-wide">
                        Atelier Tier
                      </span>
                    )}

                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-[#38BDF8] bg-[#38BDF8]/20 shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                          : 'border-[#1E3A4F] bg-transparent'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-ui font-bold text-lg text-[#F1F5F9]">
                      {pkg.name}
                    </h3>
                    <span className="type-price text-base sm:text-lg font-bold text-[#38BDF8]">
                      {pkg.price.toLocaleString()} MMK
                    </span>
                  </div>

                  <p className="text-[#94A3B8] text-xs leading-relaxed mb-2 font-ui">
                    {pkg.description}
                  </p>

                  {/* Shared Optical Features Row (1:1 Reference Match) */}
                  <div className="flex items-center gap-3 text-xs font-ui text-[#94A3B8] mb-2.5 flex-wrap">
                    {pkg.id === 'indoor-portrait-master' && (
                      <>
                        <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-[#38BDF8]" /> 5 Retouched</span>
                        <span className="flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-[#38BDF8]" /> Raw Files</span>
                        <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-[#38BDF8]" /> Tether Monitor</span>
                      </>
                    )}
                    {pkg.id === 'commercial-branding' && (
                      <>
                        <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-[#38BDF8]" /> 12 Retouched</span>
                        <span className="flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-[#38BDF8]" /> Commercial Use</span>
                        <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-[#38BDF8]" /> Studio Support</span>
                      </>
                    )}
                    {pkg.id === 'editorial-fashion-atelier' && (
                      <>
                        <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-[#38BDF8]" /> 8 Retouched</span>
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" /> Dual Softboxes</span>
                        <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-[#38BDF8]" /> Styling Support</span>
                      </>
                    )}
                  </div>

                  {/* Explicit Action Button within Card */}
                  {isSelected ? (
                    <button
                      type="button"
                      className="btn-primary-action w-full !min-h-[36px] !py-1.5 !text-xs font-ui font-semibold tracking-wide"
                    >
                      <span>Select Package</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary-action w-full !min-h-[36px] !py-1.5 !text-xs font-ui font-medium"
                    >
                      <span>Select Package</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              );
            })}

            {/* Side-by-Side Shortcuts: Gear & Retail */}
            {onOpenEquipment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={onOpenEquipment}
                  className="p-2.5 sm:p-3 rounded-xl glass-level-2 card-action-interactive hover:border-[#38BDF8]/50 text-xs font-ui text-[#94A3B8] hover:text-[#F1F5F9] flex flex-col justify-between transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2.5 mb-1.5">
                    <div className="p-1 rounded-md glass-recessed text-[#38BDF8] group-hover:bg-[#38BDF8]/10 transition-colors">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <div className="font-ui font-semibold text-xs text-[#F1F5F9] group-hover:text-[#38BDF8] transition-colors leading-tight">
                      Studio Gear &amp; Equipment
                    </div>
                  </div>
                  <div className="text-[10px] font-ui text-[#38BDF8] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1 mt-auto">
                    <span>View Gear</span>
                    <span>→</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onOpenEquipment}
                  className="p-2.5 sm:p-3 rounded-xl glass-level-2 card-action-interactive hover:border-[#A87452]/50 text-xs font-ui text-[#94A3B8] hover:text-[#F1F5F9] flex flex-col justify-between transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2.5 mb-1.5">
                    <div className="p-1 rounded-md glass-recessed text-[#A87452] group-hover:bg-[#A87452]/10 transition-colors">
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                    <div className="font-ui font-semibold text-xs text-[#F1F5F9] group-hover:text-[#38BDF8] transition-colors leading-tight">
                      Client Products &amp; Boutique
                    </div>
                  </div>
                  <div className="text-[10px] font-ui text-[#38BDF8] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1 mt-auto">
                    <span>Visit Shop</span>
                    <span>→</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Client Identity Information Field / Manifest Badge */}
          <div className="glass-level-2 rounded-xl p-3 space-y-2.5 font-ui">
            <div className="flex items-center justify-between">
              <span className="font-ui font-semibold text-xs tracking-wider text-[#F1F5F9] uppercase block">
                Guest identity
              </span>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('guest-name-input');
                  input?.focus();
                }}
                className="btn-tertiary-action !text-xs !p-0"
              >
                <span>Edit</span>
                <span>→</span>
              </button>
            </div>
            <div className="flex items-center space-x-2.5 glass-recessed p-2.5 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-[#34D399]/10 border border-[#34D399]/30 flex items-center justify-center text-[#34D399] shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-ui font-semibold text-xs sm:text-sm text-[#F1F5F9] truncate">
                  {bookingState.guestName || 'Elena Rostova'}
                </div>
                <div className="font-ui text-xs text-[#7E8F9F] truncate">
                  {bookingState.clientPhone || '+95 9 792 108 421'}
                </div>
              </div>
            </div>
            <div className="space-y-1.5 pt-1 border-t border-[#1E3A4F]/60">
              <div>
                <label className="block font-ui text-xs text-[#94A3B8] font-medium mb-1">
                  Reserved guest name
                </label>
                <input
                  id="guest-name-input"
                  type="text"
                  value={bookingState.guestName}
                  onChange={(e) =>
                    onUpdateBooking({ guestName: e.target.value })
                  }
                  className="w-full glass-recessed border border-[rgba(90,150,180,0.14)] rounded-lg px-2.5 py-1.5 font-ui text-xs text-[#F1F5F9] focus:border-[#38BDF8] outline-none transition-colors"
                  placeholder="e.g. Elena Rostova"
                />
              </div>
              <div>
                <label className="block font-ui text-xs text-[#94A3B8] font-medium mb-1">
                  Client phone contact
                </label>
                <input
                  type="text"
                  value={bookingState.clientPhone}
                  onChange={(e) =>
                    onUpdateBooking({ clientPhone: e.target.value })
                  }
                  className="w-full glass-recessed border border-[rgba(90,150,180,0.14)] rounded-lg px-2.5 py-1.5 font-ui text-xs text-[#F1F5F9] focus:border-[#38BDF8] outline-none transition-colors"
                  placeholder="+95 9 792 108 421"
                />
              </div>
            </div>
          </div>

          {/* Telegram Confirmation Webhook Integration Module */}
          <TelegramIntegrationModule
            bookingState={bookingState}
            onUpdateBooking={onUpdateBooking}
          />
        </section>

        {/* Column 2: Date Engine & Briefing */}
        <section className="lg:col-span-4 flex flex-col space-y-3 font-ui">
          <div className="flex items-center justify-between px-1">
            <span className="font-ui font-bold text-sm tracking-wide text-[#F1F5F9]">
              2. Date &amp; Studio Calendar
            </span>
            <span className="font-ui text-xs text-[#34D399] flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
              Live Calendar
            </span>
          </div>

          {/* Month-View Calendar Component */}
          <MonthCalendarPicker
            currentDateStr={bookingState.dateStr}
            currentMonthStr={bookingState.monthStr}
            onSelectDate={(dateStr, monthStr) => {
              onUpdateBooking({ dateStr, monthStr });
            }}
          />

          {/* Active Target Reservation Summary Card (Current Selection) */}
          <div className="glass-level-2 copper-reflection rounded-xl p-3 space-y-2 font-ui text-xs">
            <div className="flex items-center justify-between border-b border-[#1E3A4F]/60 pb-1.5">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-3.5 h-3.5 text-[#A87452]" />
                <span className="text-xs text-[#F1F5F9] font-ui font-semibold">
                  Current Selection
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('tab-floorplan');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-tertiary-action !text-xs !p-0"
              >
                <span>View all slots</span>
                <span>→</span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between pr-2">
                  <span className="text-[#94A3B8]">Date:</span>
                  <span className="text-[#F1F5F9] font-bold tabular-nums">{bookingState.dateStr}</span>
                </div>
                <div className="flex items-center justify-between pr-2">
                  <span className="text-[#94A3B8]">Time Slot:</span>
                  <span className="text-[#38BDF8] font-bold tabular-nums">{bookingState.timeSlot}</span>
                </div>
                <div className="flex items-center justify-between pr-2">
                  <span className="text-[#94A3B8]">Allocated Bay:</span>
                  <span className="text-[#34D399] font-bold truncate">{bookingState.bayAllocation}</span>
                </div>
              </div>
              <div className="pl-3 border-l border-[#1E3A4F]/60 flex flex-col items-center justify-center shrink-0">
                <span className="px-2 py-1 rounded-lg bg-[#064E3B]/40 border border-[#10B981]/40 text-[#34D399] font-ui font-semibold text-xs flex items-center gap-1 shadow-[0_0_12px_rgba(52,211,153,0.15)]">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Available</span>
                </span>
              </div>
            </div>
          </div>

          {/* Briefing Notes: Session Setup Requirements */}
          <div className="glass-level-2 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="font-ui font-semibold text-xs text-[#F1F5F9]">
                  Briefing Notes
                </span>
              </div>
              <span className="font-ui text-xs text-[#7E8F9F]">
                Setup requirements
              </span>
            </div>

            <p className="text-[#94A3B8] text-xs leading-relaxed font-ui">
              {bookingState.briefingNotes || 'High-key fashion setup with seamless white backdrop; tethered capture monitor on Bay Alpha-01.'}
            </p>

            {/* Quick Requirement Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                'Seamless White Backdrop',
                'Profoto Octa 4ft',
                'Tethered Monitor',
                'Wardrobe Steamer',
                'Warm Rim Light',
              ].map((tag) => {
                const isIncluded = (bookingState.briefingNotes || '').includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const current = (bookingState.briefingNotes || '').trim();
                      if (isIncluded) {
                        const updated = current
                          .replace(tag, '')
                          .replace(/;\s*;\s*/g, '; ')
                          .replace(/^;\s*/, '')
                          .replace(/;\s*$/, '')
                          .trim();
                        onUpdateBooking({ briefingNotes: updated });
                      } else {
                        const updated = current ? `${current}; ${tag}` : tag;
                        onUpdateBooking({ briefingNotes: updated });
                      }
                    }}
                    className={`text-xs font-ui px-2.5 py-1 rounded-md border transition-all cursor-pointer select-none ${
                      isIncluded
                        ? 'bg-[#38BDF8]/15 border-[#38BDF8]/50 text-[#38BDF8] font-medium'
                        : 'glass-recessed border-[rgba(90,150,180,0.12)] text-[#7E8F9F] hover:text-[#F1F5F9] hover:border-[#38BDF8]/50'
                    }`}
                  >
                    {isIncluded ? '✓ ' : '+ '}
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Text Area */}
            <div className="relative">
              <textarea
                id="session-briefing-notes"
                value={bookingState.briefingNotes || ''}
                onChange={(e) =>
                  onUpdateBooking({ briefingNotes: e.target.value })
                }
                rows={2}
                placeholder="e.g. Need high-key lighting setup with seamless white backdrop. Bringing 2 wardrobe changes; require steamer and tethered capture monitor on Bay Alpha-01..."
                className="w-full glass-recessed border border-[rgba(90,150,180,0.14)] rounded-lg p-2.5 font-ui text-xs text-[#F1F5F9] placeholder-[#7E8F9F] focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 outline-none resize-none transition-all leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-ui text-[#7E8F9F]">
              <span className="flex items-center gap-1 text-[#34D399]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                <span>Persisted in booking state</span>
              </span>
              <span>{(bookingState.briefingNotes || '').length} chars</span>
            </div>
          </div>
        </section>

        {/* Column 3: Deposit Settlement */}
        <section className="lg:col-span-4 flex flex-col space-y-3 font-ui">
          <div className="flex items-center justify-between px-1">
            <span className="font-ui font-bold text-sm tracking-wide text-[#F1F5F9]">
              3. Deposit Settlement
            </span>
            <span className="font-ui text-xs text-[#7E8F9F]">
              256-bit SSL
            </span>
          </div>

          <div className="glass-level-3 copper-reflection p-3.5 sm:p-4 space-y-3">
            {/* Amount calculation */}
            <div className="p-2.5 glass-recessed font-ui text-xs space-y-1.5">
              <div className="flex justify-between text-[#7E8F9F]">
                <span>Package Price:</span>
                <span className="type-price text-[#F1F5F9] font-medium">
                  {bookingState.totalAmount.toLocaleString()} MMK
                </span>
              </div>
              <div className="flex justify-between text-[#38BDF8] font-bold text-sm">
                <span>Deposit Required (50%):</span>
                <span className="type-price text-[#38BDF8] font-bold">
                  {bookingState.depositAmount.toLocaleString()} MMK
                </span>
              </div>
              <div className="flex justify-between text-[#7E8F9F] border-t border-[rgba(90,150,180,0.12)] pt-1">
                <span>Due at Session:</span>
                <span className="type-price text-[#94A3B8] font-medium">
                  {(bookingState.totalAmount - bookingState.depositAmount).toLocaleString()} MMK
                </span>
              </div>
            </div>

            {/* Step A: Pay via KPay / Bank */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-ui text-xs text-[#94A3B8] font-semibold">
                  Step A: Pay via KPay / Bank
                </label>
                <span className="font-ui text-[10px] text-[#38BDF8] px-2 py-0.5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 font-semibold uppercase tracking-wider">
                  Studio Account
                </span>
              </div>

              {/* Gateway Selection Tabs */}
              <div className="grid grid-cols-3 gap-1.5 font-ui text-xs">
                {SUPPORTED_PAYMENT_GATEWAYS.map((gw) => {
                  const isActive =
                    bookingState.gateway === gw ||
                    (gw === 'AYA Pay' && bookingState.gateway === 'CB / AYA');
                  const brand = getPaymentBrand(gw);
                  return (
                    <button
                      key={gw}
                      type="button"
                      id={`booking-gateway-tab-${gw.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      onClick={() => onUpdateBooking({ gateway: gw })}
                      className={`py-2 px-1.5 rounded-lg font-semibold flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer text-xs card-action-interactive ${
                        isActive
                          ? 'border border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                          : 'border border-[#1E3A4F] bg-[#071423] hover:border-[#38BDF8]/50 text-[#7E8F9F] hover:text-[#F1F5F9]'
                      }`}
                    >
                      <div className="bg-white px-1 py-0.5 rounded-[4px] border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
                        <img
                          src={brand.logo}
                          alt={brand.displayName}
                          className={`${
                            brand.aspectRatio === 'square'
                              ? 'h-3.5 w-3.5'
                              : 'h-2.5 max-w-[36px] sm:max-w-[42px]'
                          } object-contain`}
                        />
                      </div>
                      <span className="truncate">{brand.displayName}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Inline QR / Transfer Card */}
              {(() => {
                const currentGw = bookingState.gateway;
                const brand = getPaymentBrand(currentGw);
                const config = GATEWAY_CONFIGS[currentGw] || GATEWAY_CONFIGS['KBZPay'];
                return (
                  <div className="p-2.5 glass-recessed rounded-xl flex items-center gap-3 font-ui">
                    {/* QR Code Plate */}
                    <div
                      onClick={onOpenPaymentModal}
                      className="p-1.5 bg-white rounded-lg border border-zinc-300 relative shadow cursor-pointer shrink-0 group hover:ring-2 hover:ring-[#38BDF8] transition-all"
                      title="Click to enlarge QR code in payment modal"
                    >
                      <svg
                        className="w-14 h-14 text-[#071423]"
                        viewBox="0 0 100 100"
                        fill="currentColor"
                      >
                        <rect x="5" y="5" width="26" height="26" fill="black" rx="3" />
                        <rect x="9" y="9" width="18" height="18" fill="white" rx="2" />
                        <rect x="13" y="13" width="10" height="10" fill="black" rx="1" />
                        <rect x="69" y="5" width="26" height="26" fill="black" rx="3" />
                        <rect x="73" y="9" width="18" height="18" fill="white" rx="2" />
                        <rect x="77" y="13" width="10" height="10" fill="black" rx="1" />
                        <rect x="5" y="69" width="26" height="26" fill="black" rx="3" />
                        <rect x="9" y="73" width="18" height="18" fill="white" rx="2" />
                        <rect x="13" y="77" width="10" height="10" fill="black" rx="1" />
                        <rect x="36" y="8" width="5" height="5" />
                        <rect x="46" y="8" width="8" height="5" />
                        <rect x="36" y="18" width="9" height="5" />
                        <rect x="52" y="18" width="5" height="8" />
                        <rect x="8" y="38" width="6" height="6" />
                        <rect x="18" y="44" width="7" height="6" />
                        <rect x="35" y="35" width="8" height="8" rx="1" />
                        <rect x="47" y="40" width="6" height="6" />
                        <rect x="58" y="35" width="7" height="12" />
                        <rect x="72" y="40" width="10" height="5" />
                        <rect x="85" y="45" width="8" height="8" />
                        <rect x="38" y="58" width="6" height="6" />
                        <rect x="50" y="55" width="12" height="6" />
                        <rect x="36" y="72" width="8" height="8" />
                        <rect x="48" y="78" width="6" height="12" />
                        <rect x="60" y="70" width="10" height="6" />
                        <rect x="75" y="65" width="12" height="7" />
                        <rect x="75" y="80" width="8" height="10" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[7px] font-bold font-ui bg-[#071423] text-[#38BDF8] px-1 rounded shadow">
                          {brand.displayName}
                        </span>
                      </div>
                    </div>

                    {/* Scan Text & Actions */}
                    <div className="flex-1 min-w-0 space-y-0.5 font-ui">
                      {/* Brand Logo & Name Identity */}
                      <div className="flex items-center gap-1.5">
                        <div className="bg-white px-1.5 py-0.5 rounded-[4px] border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
                          <img
                            src={brand.logo}
                            alt={brand.displayName}
                            className={`${
                              brand.aspectRatio === 'square'
                                ? 'h-3.5 w-3.5'
                                : 'h-2.5 max-w-[48px]'
                            } object-contain`}
                          />
                        </div>
                        <span className="text-xs font-ui font-bold text-[#F1F5F9] truncate">
                          {brand.displayName}
                        </span>
                        <span className="text-[10px] font-ui text-[#7E8F9F]">
                          {brand.shortName}
                        </span>
                      </div>

                      <div className="text-xs font-ui text-[#94A3B8] truncate">
                        {config.accountName}
                      </div>
                      <div className="text-xs font-mono-code text-[#CBD5E1] font-semibold tracking-wide truncate">
                        {config.accountNumber}
                      </div>

                      <div className="type-price text-base sm:text-lg font-bold text-[#38BDF8] leading-tight truncate">
                        {bookingState.depositAmount.toLocaleString()} MMK
                      </div>

                      <div className="pt-0.5 flex items-center gap-2">
                        <button
                          type="button"
                          id="copy-booking-account-btn"
                          onClick={() => {
                            navigator.clipboard?.writeText(config.accountNumber);
                            setCopiedAccount(true);
                            setTimeout(() => setCopiedAccount(false), 2000);
                          }}
                          className="btn-secondary-action !min-h-[28px] !py-0.5 !px-2.5 !text-xs font-ui"
                          title="Copy studio beneficiary account number"
                        >
                          {copiedAccount ? (
                            <>
                              <Check className="w-3 h-3 text-[#34D399]" />
                              <span className="text-[#34D399]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#38BDF8]" />
                              <span>Copy Account</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          id="open-payment-modal-btn"
                          onClick={onOpenPaymentModal}
                          className="btn-tertiary-action !text-xs !p-1"
                          title="Open full payment modal with instructions"
                        >
                          <span>Modal ↗</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Step B: Upload Proof of Deposit */}
            <div>
              <div className="flex items-center justify-between mb-1 font-ui">
                <label className="block text-xs text-[#94A3B8] font-semibold">
                  Step B: Upload Proof of Deposit
                </label>
                {bookingState.uploadedSlipName && (
                  <span className="text-xs text-[#34D399] flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Slip Attached
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl p-2.5 transition-all cursor-pointer relative font-ui ${
                  isDragOver
                    ? 'glass-recessed border border-[#38BDF8] bg-[#38BDF8]/10'
                    : bookingState.uploadedSlipName
                    ? 'glass-recessed border border-emerald-500/50'
                    : 'glass-recessed border-2 border-dashed border-[rgba(90,150,180,0.20)] hover:border-[#38BDF8]/70 text-center'
                }`}
              >
                {bookingState.uploadedSlipName ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 truncate">
                      <div className="w-8 h-8 rounded-lg bg-[#34D399]/15 border border-[#34D399]/40 flex items-center justify-center text-[#34D399] shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-ui text-xs text-[#F1F5F9] font-semibold truncate">
                          {bookingState.uploadedSlipName}
                        </p>
                        <span className="font-ui text-[11px] text-[#7E8F9F] block">
                          {bookingState.uploadedSlipSize || '2.1 MB'} • Click to replace slip
                        </span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#34D399]/20 border border-[#34D399] flex items-center justify-center text-[#34D399] shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5 py-1">
                    <UploadCloud className="w-5 h-5 mx-auto text-[#38BDF8]" />
                    <p className="font-ui text-xs text-[#94A3B8] font-medium">
                      Attach Transfer Slip (PNG/JPG)
                    </p>
                    <span className="font-ui text-xs text-[#7E8F9F] block">
                      Click to browse or drop slip screenshot
                    </span>
                  </div>
                )}
              </div>

              {/* Instant Demo Helper */}
              {!bookingState.uploadedSlipName && (
                <div className="mt-1.5 text-center">
                  <button
                    type="button"
                    onClick={handleUseDemoSlip}
                    className="btn-tertiary-action mx-auto !text-xs"
                  >
                    <span>Attach Sample {bookingState.gateway} Slip</span>
                  </button>
                </div>
              )}
            </div>

            {/* AI Verification Notice */}
            <div className="flex items-start gap-2 p-2 rounded-lg glass-recessed border border-[rgba(90,150,180,0.10)] text-xs font-ui text-[#94A3B8]">
              <Info className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
              <span>
                AI verification will scan your slip and send Telegram notification automatically.
              </span>
            </div>

            {/* Primary Submit CTA */}
            <div className="pt-0.5 space-y-1.5 font-ui">
              {bookingState.telegramConnected && (bookingState.telegramAutoNotify ?? true) && (
                <div className="p-2 rounded-lg bg-[#2AABEE]/10 border border-[#2AABEE]/30 flex items-center justify-between text-xs font-ui text-[#2AABEE]">
                  <div className="flex items-center space-x-1.5 truncate">
                    <Send className="w-3 h-3 -rotate-12 flex-shrink-0" />
                    <span className="truncate">
                      Telegram armed for <strong>{bookingState.telegramHandle}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2AABEE]/20 font-bold flex-shrink-0">
                    DISPATCH
                  </span>
                </div>
              )}

              <button
                type="button"
                id="booking-proceed-btn"
                onClick={() => {
                  if (
                    bookingState.telegramConnected &&
                    (bookingState.telegramAutoNotify ?? true) &&
                    bookingState.telegramHandle
                  ) {
                    sendTelegramBookingWebhook(bookingState).catch((err) =>
                      console.warn('Telegram webhook simulation dispatch:', err)
                    );
                    onUpdateBooking({
                      telegramLastNotified: new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    });
                  }
                  onProceedToVerification();
                }}
                className="btn-primary-action w-full !h-11 !text-sm font-ui font-bold tracking-wide shadow-lg shadow-[#38BDF8]/20"
              >
                <div className="w-5 h-5 rounded-full bg-[#071423] text-[#38BDF8] flex items-center justify-center text-xs font-bold mr-1">
                  ✓
                </div>
                <span>Verify &amp; Confirm Booking</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex items-center justify-center gap-1.5 font-ui text-xs text-[#7E8F9F] pt-0.5">
                <Shield className="w-3 h-3 text-[#7E8F9F]" />
                <span>Secure booking. Instant verification. Studio concierge support.</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* TIER 2: Studio Spatial Architecture & Operational Slots Workstation */}
      <div className="mt-7 pt-5 border-t border-[#1E3A4F] hairline-copper-top space-y-6">
        {/* Workstation Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 font-ui">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-ui font-semibold tracking-wider uppercase bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
                Spatial Architecture &amp; Slots
              </span>
              <span className="text-[#7E8F9F] text-xs font-ui">FL-02 Schematic</span>
            </div>
            <h2 className="font-ui font-bold text-xl md:text-2xl tracking-tight text-[#F1F5F9]">
              Studio Floor Plan &amp; Available Atelier Slots
            </h2>
            <p className="text-xs font-ui text-[#94A3B8] mt-1">
              Interactive bay schematics, lighting pantograph grid specs, and real-time session availability across all soundstages.
            </p>
          </div>

          {/* Studio Layout Mode Switcher Tab (Floor Plan vs Live Occupancy) */}
          <div className="flex items-center bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-1 font-ui text-xs self-start sm:self-auto shrink-0">
            <button
              type="button"
              id="tab-floorplan"
              onClick={() => setStudioLayoutTab('floorplan')}
              className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                studioLayoutTab === 'floorplan'
                  ? 'bg-[#38BDF8] text-[#030F1E] font-bold shadow'
                  : 'text-[#7E8F9F] hover:text-[#F1F5F9]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Studio Floor Plan</span>
            </button>
            <button
              type="button"
              id="tab-occupancy"
              onClick={() => setStudioLayoutTab('occupancy')}
              className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                studioLayoutTab === 'occupancy'
                  ? 'bg-[#38BDF8] text-[#030F1E] font-bold shadow'
                  : 'text-[#7E8F9F] hover:text-[#F1F5F9]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Live Bay Telemetry</span>
            </button>
          </div>
        </div>

        {/* 12-Column Floor Plan & Slots Grid: 8 Cols Left (Floor Plan) + 4 Cols Right (Slots) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Area: Floor Plan or Occupancy (8 Columns) */}
          <div className="lg:col-span-8 w-full min-w-0">
            {studioLayoutTab === 'floorplan' ? (
              <InteractiveFloorPlan
                selectedBayAllocation={bookingState.bayAllocation}
                baysTelemetry={baysTelemetry}
                onSelectBayAllocation={handleSelectBayFromFloorPlan}
                dateStr={bookingState.dateStr}
                timeSlot={bookingState.timeSlot}
              />
            ) : (
              <StudioBayOccupancyIndicator
                bays={baysTelemetry}
                overallOccupancyPercent={overallOccupancy}
                lastSyncTimestamp={lastSyncTime}
                isFetching={isFetchingTelemetry}
                selectedBayAllocation={bookingState.bayAllocation}
                onRefresh={() => handleFetchTelemetry(bookingState.dateStr)}
                dateStr={bookingState.dateStr}
              />
            )}
          </div>

          {/* Supporting Area: Available Atelier Slots & Facility Telemetry (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col space-y-4 w-full min-w-0 font-ui">
            {/* Time Slots & Real-time Availability Engine */}
            <div className="glass-level-2 rounded-xl p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="font-ui font-semibold text-xs text-[#F1F5F9]">
                    Available Atelier Slots
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {slotsTelemetry.filter((s) => s.status === 'sold_out').length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 font-ui text-[10px] font-bold">
                      {slotsTelemetry.filter((s) => s.status === 'sold_out').length} Sold Out
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilterAvailableOnly(!filterAvailableOnly)}
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-ui transition-colors cursor-pointer select-none ${
                      filterAvailableOnly
                        ? 'bg-[#38BDF8]/15 border-[#38BDF8]/50 text-[#38BDF8] font-semibold'
                        : 'glass-recessed border-[rgba(90,150,180,0.14)] text-[#7E8F9F] hover:text-[#F1F5F9]'
                    }`}
                  >
                    {filterAvailableOnly
                      ? 'Show All (6)'
                      : `Hide Sold Out (${slotsTelemetry.filter((s) => s.status !== 'sold_out').length} Open)`}
                  </button>
                </div>
              </div>

              {/* Sold-out interactive alert toast */}
              {soldOutAlert && (
                <div
                  id="sold-out-alert-toast"
                  className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs font-ui flex items-center justify-between animate-fadeIn"
                >
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{soldOutAlert}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoldOutAlert(null)}
                    className="text-[#7E8F9F] hover:text-white px-1.5 py-0.5 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Time Slot Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-ui text-xs">
                {(filterAvailableOnly
                  ? slotsTelemetry.filter((s) => s.status !== 'sold_out')
                  : slotsTelemetry
                ).map((slot) => {
                  const isSelected = bookingState.timeSlot === slot.time;
                  const isSoldOut = slot.status === 'sold_out';
                  const isLimited = slot.status === 'limited';

                  if (isSoldOut) {
                    return (
                      <div
                        key={slot.time}
                        onClick={() => {
                          setSoldOutAlert(
                            `⚠️ ${slot.time} on ${bookingState.dateStr} is SOLD OUT across all soundstages (${slot.highlightNotice || 'Booked'}). Please pick an open slot.`
                          );
                          setTimeout(() => setSoldOutAlert(null), 4500);
                        }}
                        className="rounded-xl p-3 border border-rose-500/40 bg-rose-950/20 text-[#7E8F9F] flex flex-col justify-between cursor-not-allowed transition-all select-none relative overflow-hidden group shadow-sm"
                        title="Sold Out - All Bays In Session"
                      >
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(244,63,94,0.05)_6px,rgba(244,63,94,0.05)_12px)] pointer-events-none" />

                        <div className="flex items-center justify-between w-full z-10">
                          <span className="font-ui text-xs font-bold text-[#7E8F9F] line-through decoration-rose-500 tabular-nums">
                            {slot.time}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-400 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                            <Lock className="w-2.5 h-2.5" />
                            Sold Out
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[10px] font-ui z-10">
                          <span className="text-rose-400/90 font-medium truncate">
                            {slot.highlightNotice || 'All Soundstages Reserved'}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => onUpdateBooking({ timeSlot: slot.time })}
                      className={`rounded-xl p-3 border flex flex-col justify-between transition-all cursor-pointer text-left relative ${
                        isSelected
                          ? 'bg-[#38BDF8] border-[#38BDF8] text-[#030F1E] font-bold shadow-md'
                          : isLimited
                          ? 'card-action-interactive border-amber-500/50 bg-[#101C2C] hover:border-amber-400 text-[#F1F5F9]'
                          : 'glass-recessed card-action-interactive border-[rgba(90,150,180,0.12)] text-[#94A3B8] hover:border-[#38BDF8]/50 hover:text-[#F1F5F9]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`font-ui text-xs font-bold tabular-nums ${
                            isSelected ? 'text-[#030F1E]' : 'text-[#F1F5F9]'
                          }`}
                        >
                          {slot.time}
                        </span>

                        {isSelected ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#030F1E] text-[#38BDF8] text-[9px] font-bold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            Selected
                          </span>
                        ) : isLimited ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                            1 Bay Left
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-[#34D399] border border-emerald-500/30 text-[9px] font-semibold">
                            {slot.availableBays.length} Bays Free
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-ui">
                        <span className={isSelected ? 'text-[#030F1E]/90 font-medium' : 'text-[#7E8F9F]'}>
                          {isSelected
                            ? `${bookingState.bayAllocation} Reserved`
                            : slot.highlightNotice || 'Available for Reservation'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#1E3A4F] text-xs font-ui text-[#7E8F9F] space-y-1">
                <div className="flex justify-between">
                  <span>Session Duration:</span>
                  <span className="text-[#F1F5F9] font-medium">60 Minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Turnaround Guarantee:</span>
                  <span className="text-[#34D399] font-medium">Within 48 Hours</span>
                </div>
              </div>
            </div>

            {/* Facility Telemetry Card */}
            <div className="bg-[#0B1B2B] rounded-xl p-4 border border-[#1E3A4F] space-y-3 font-ui text-xs">
              <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-2">
                <span className="text-[#7E8F9F] font-medium text-xs">Facility Telemetry</span>
                <span className="text-[#34D399] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                  Online
                </span>
              </div>
              <div className="space-y-1.5 text-xs font-ui">
                <div className="flex justify-between">
                  <span className="text-[#7E8F9F]">Studio Flagship:</span>
                  <span className="text-[#F1F5F9] font-medium">Botahtaung, Yangon</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E8F9F]">Facility Occupancy:</span>
                  <span className="text-[#38BDF8] font-semibold tabular-nums">{overallOccupancy}% Allocated</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E8F9F]">Target Bay Setup:</span>
                  <span className="text-[#34D399] font-semibold">{bookingState.bayAllocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E8F9F]">Sync Timestamp:</span>
                  <span className="text-[#7E8F9F] font-mono text-[11px]">{lastSyncTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
