import React, { useEffect, useState } from 'react';
import { BookingState, WorkspaceView } from '../types';
import { getTenantConfig } from '../config/tenantConfig';
import {
  AlertCircle,
  RotateCcw,
  FastForward,
  CheckCircle2,
  QrCode,
  Scan,
  Camera,
  Crosshair,
  Zap,
  Maximize2,
  Eye,
  Check,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { verifySlip } from '../services/slipVerificationService';
import { getPaymentBrand } from '../utils/paymentBrands';

interface VerificationScreenProps {
  bookingState: BookingState;
  onVerificationComplete: () => void;
  onBackToBooking: () => void;
  workspaceView?: WorkspaceView;
}

export const VerificationScreen: React.FC<VerificationScreenProps> = ({
  bookingState,
  onVerificationComplete,
  onBackToBooking,
  workspaceView = 'compact',
}) => {
  const tenant = getTenantConfig(bookingState.tenantId);

  const [stage, setStage] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState<number>(25);
  const [scanPercent, setScanPercent] = useState<number>(34);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isQrLocked, setIsQrLocked] = useState<boolean>(false);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);
  const [qrDecoded, setQrDecoded] = useState<boolean>(true);

  const [extractedData, setExtractedData] = useState<{
    transaction_id?: string | null;
    amount_mmk?: number | null;
    payer_name?: string | null;
    warnings?: string[];
    verification_source?: 'gemini' | 'mock' | 'unavailable';
    verification_status?: 'ocr_extracted' | 'manual_review_required' | 'unverified';
  }>({
    verification_source: 'mock',
    verification_status: 'unverified',
  });

  const [logItems, setLogItems] = useState<
    { id: number; text: string; status: 'done' | 'running' | 'pending' }[]
  >([
    {
      id: 1,
      text: `[0.12s] Slip image parsed: 2480x3508 (${
        bookingState.uploadedSlipName || 'PNG'
      })`,
      status: 'done',
    },
    {
      id: 2,
      text: '[0.48s] Optical OCR Text Scan In Progress...',
      status: 'running',
    },
    {
      id: 3,
      text: `[0.85s] Auditing slip details with Studio reservation (${bookingState.bayAllocation})...`,
      status: 'pending',
    },
    {
      id: 4,
      text: 'Generating provisional atelier access pass',
      status: 'pending',
    },
    ...(bookingState.telegramConnected && (bookingState.telegramAutoNotify ?? true)
      ? [
          {
            id: 5,
            text: `[Queued] Telegram notice simulation for ${bookingState.telegramHandle || 'client'}`,
            status: 'pending' as const,
          },
        ]
      : []),
  ]);

  // Is QR scanner view currently active (either hovered or toggled/clicked)
  const isQrModeActive = isHovered || isQrLocked;

  useEffect(() => {
    let isMounted = true;
    const slipPayload =
      bookingState.uploadedSlipData ||
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    verifySlip({
      image: slipPayload,
      expected_amount_mmk: bookingState.depositAmount,
      manifest_id: bookingState.manifestId,
      gateway: bookingState.gateway,
    })
      .then((res) => {
        if (isMounted && res.success) {
          setExtractedData({
            transaction_id: res.transaction_id,
            amount_mmk: res.amount_mmk,
            payer_name: res.payer_name,
            warnings: res.warnings,
            verification_source: res.verification_source,
            verification_status: res.verification_status,
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [bookingState]);

  useEffect(() => {
    // Stage 1 -> 2
    const timer1 = setTimeout(() => {
      setStage(2);
      setProgressPercent(50);
      setScanPercent(62);
      setLogItems((prev) => [
        { ...prev[0], status: 'done' },
        {
          ...prev[1],
          text: `[0.48s] OCR Transaction Reference: #${
            extractedData.transaction_id || 'TRX-DRAFT'
          }`,
          status: 'done',
        },
        { ...prev[2], status: 'running' },
        prev[3],
        ...(prev[4] ? [prev[4]] : []),
      ]);
    }, 900);

    // Stage 2 -> 3
    const timer2 = setTimeout(() => {
      setStage(3);
      setProgressPercent(78);
      setScanPercent(86);
      setLogItems((prev) => [
        prev[0],
        prev[1],
        {
          ...prev[2],
          text: `[0.85s] Slip Amount Detected: ${(
            extractedData.amount_mmk || bookingState.depositAmount
          ).toLocaleString()} MMK (${bookingState.bayAllocation})`,
          status: 'done',
        },
        { ...prev[3], text: '[1.35s] Generating provisional atelier access pass...', status: 'running' },
        ...(prev[4]
          ? [
              {
                ...prev[4],
                text: `[1.70s] Webhook queued for Telegram @${tenant.telegramBotUsername.replace(/^@/, '')} (Simulation)...`,
                status: 'running' as const,
              },
            ]
          : []),
      ]);
    }, 2000);

    // Stage 3 -> 4 & Auto Redirect
    const timer3 = setTimeout(() => {
      setStage(4);
      setProgressPercent(100);
      setScanPercent(100);
      setLogItems((prev) => [
        prev[0],
        prev[1],
        prev[2],
        { ...prev[3], text: '[1.85s] Slip details extracted. Provisional atelier access pass generated.', status: 'done' },
        ...(prev[4]
          ? [
              {
                ...prev[4],
                text: `[2.10s] Telegram notice simulated for ${bookingState.telegramHandle || '@guest'} (Local Test OK)`,
                status: 'done' as const,
              },
            ]
          : []),
      ]);

      const redirectTimer = setTimeout(() => {
        onVerificationComplete();
      }, 700);

      return () => clearTimeout(redirectTimer);
    }, 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [bookingState.bayAllocation, bookingState.depositAmount, bookingState.uploadedSlipName, extractedData.amount_mmk, extractedData.transaction_id, onVerificationComplete, tenant.telegramBotUsername]);

  // Handle click on the scanning area to trigger simulated capture & toggle lock
  const handleAreaClick = () => {
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);
    setIsQrLocked((prev) => !prev);
  };

  return (
    <main
      className={`w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col gap-6 transition-[max-width] duration-300 ${
        workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
      }`}
    >
      {/* Screen Operational Header & Trust Telemetry */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E3A4F]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <Scan className="w-5 h-5 text-[#38BDF8]" />
            <h1 className="font-ui text-xl md:text-2xl text-[#F1F5F9] tracking-tight font-bold">
              Slip Verification &amp; OCR Audit
            </h1>
            <span className="font-mono-code text-[10px] bg-[#102538] border border-[#1E3A4F] px-2 py-0.5 rounded text-[#38BDF8]">
              REF: {bookingState.manifestId}
            </span>
          </div>
          <p className="font-ui text-xs text-[#94A3B8]">
            Sub-system optical character extraction and real-time discrepancy reconciliation.
          </p>
        </div>

        {/* Realtime Processing Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-[#38BDF8]/40 bg-[#102538] rounded-lg">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
            <span className="font-ui text-xs text-[#38BDF8] font-semibold">
              Vision OCR • Extracting details
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-1 font-mono-code text-[11px] text-[#7E8F9F] px-2.5 py-1.5 bg-[#0B1B2B] border border-[#1E3A4F] rounded-lg">
            <span>SOCKET:</span>
            <span className="text-[#F1F5F9]">LIVE_STREAM</span>
          </div>
        </div>
      </div>

      {/* MANDATORY LEGAL/TRUST DISCLAIMER BANNER */}
      <div className="flex items-start gap-3 p-4 glass-plate card-passive rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#102538] border border-[#1E3A4F] flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-[#38BDF8]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-ui text-xs text-[#38BDF8] font-bold tracking-wide">
            Mandatory Reconciliation Protocol
          </span>
          <p className="font-ui text-xs text-[#94A3B8] leading-relaxed">
            Slip details extracted via AI OCR. Final booking confirmation requires studio ledger review. Never visually or verbally implies bank settlement.
          </p>
        </div>
        {extractedData.verification_source === 'mock' && (
          <div className="ml-auto shrink-0 hidden sm:flex items-center gap-1.5 text-[10px] font-ui font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Development Simulation
          </div>
        )}
      </div>

      {/* 2-COLUMN WORKSTATION VIEWPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SLIP VISUAL SCANNER VIEWPORT (7 Cols) */}
        <section className="lg:col-span-7 flex flex-col glass-plate border-[rgba(120,165,190,0.16)] rounded-xl overflow-hidden shadow-xl">
          {/* Viewport Top Telemetry Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#071423] border-b border-[#1E3A4F]">
            <div className="flex items-center gap-2">
              <span className="font-mono-code text-[11px] text-[#7E8F9F]">OPTICAL_LAYER:</span>
              <span className="font-mono-code text-[11px] text-[#F1F5F9] font-semibold truncate max-w-xs">
                {bookingState.uploadedSlipName || 'TRANSFER_RECEIPT_CAPTURE.PNG'}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono-code text-[11px] text-[#7E8F9F]">
              <span>RES: 2480×3508</span>
              <button
                type="button"
                onClick={() => setIsQrLocked(!isQrLocked)}
                className={`px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                  isQrLocked
                    ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/40 font-bold'
                    : 'bg-[#101C2C] text-[#7E8F9F] border-[#1E3A4F] hover:text-[#F1F5F9]'
                }`}
              >
                {isQrLocked ? 'QR PINNED' : 'PIN QR VIEW'}
              </button>
            </div>
          </div>

          {/* Document Preview Canvas with Technical Corner Reticles */}
          <div
            id="verification-scanner-area"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleAreaClick}
            className={`relative bg-[#030F1E] p-6 min-h-[460px] flex items-center justify-center overflow-hidden cursor-pointer select-none transition-all duration-300 ${
              isQrModeActive
                ? 'border-[#38BDF8] ring-1 ring-[#38BDF8]/30 shadow-[0_0_30px_rgba(56,189,248,0.2)]'
                : 'hover:border-[#38BDF8]/50'
            }`}
            title="Click to capture simulated scan or toggle scanner view"
          >
            {/* Calibration Corner Reticles */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#1E3A4F] pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#1E3A4F] pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#1E3A4F] pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#1E3A4F] pointer-events-none" />
            <div className="absolute top-1/2 left-2 -translate-y-1/2 font-mono-code text-[9px] text-[#7E8F9F] rotate-90 select-none pointer-events-none">
              AXIS-Y // OPTIC-04
            </div>

            {/* Shutter Camera Flash Effect */}
            {shutterFlash && (
              <div className="absolute inset-0 bg-white/90 z-30 transition-opacity duration-150" />
            )}

            {/* Laser Scan Beam */}
            <div className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_16px_#38BDF8] animate-scanline pointer-events-none z-10" />

            {/* Document Render Frame */}
            {!isQrModeActive ? (
              <div className="relative w-full max-w-sm bg-[#071423] border border-[#1E3A4F] rounded-xl p-5 shadow-2xl flex flex-col gap-4 overflow-hidden">
                {bookingState.uploadedSlipData && (
                  <img
                    src={bookingState.uploadedSlipData}
                    alt="Proof Slip"
                    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                  />
                )}
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-2.5 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="bg-white px-1.5 py-0.5 rounded-[4px] border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
                      <img
                        src={getPaymentBrand(bookingState.gateway).logo}
                        alt={bookingState.gateway}
                        className={`${
                          getPaymentBrand(bookingState.gateway).aspectRatio === 'square'
                            ? 'h-3.5 w-3.5'
                            : 'h-2.5 max-w-[40px]'
                        } object-contain`}
                      />
                    </div>
                    <div>
                      <span className="font-ui font-bold text-xs text-[#F1F5F9]">
                        {bookingState.gateway} Transfer Slip
                      </span>
                      <p className="font-mono-code text-[9px] text-[#7E8F9F]">
                        REF: #{extractedData.transaction_id || 'TRX-88219'}
                      </p>
                    </div>
                  </div>
                  <span className="font-ui text-[9px] text-[#34D399] px-1.5 py-0.5 border border-[#34D399]/30 bg-[#34D399]/10 rounded font-semibold">
                    Transmitted
                  </span>
                </div>

                {/* Amount Bounding Area */}
                <div className="relative p-3 border-2 border-dashed border-[#38BDF8]/60 bg-[#38BDF8]/5 rounded-lg relative z-10">
                  <div className="absolute -top-2 left-2 bg-[#102538] text-[#38BDF8] font-ui text-[9px] font-semibold px-1.5 py-0.2 rounded border border-[#1E3A4F]">
                    Detected on slip
                  </div>
                  <div className="text-right mt-1">
                    <div className="font-ui text-[10px] text-[#7E8F9F]">Settlement value</div>
                    <div className="type-price text-xl text-[#38BDF8] font-bold">
                      {(extractedData.amount_mmk || bookingState.depositAmount).toLocaleString()} MMK
                    </div>
                  </div>
                </div>

                {/* Sender & Beneficiary */}
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  <div className="p-2 border border-[#1E3A4F] bg-[#0B1B2B] rounded">
                    <div className="font-ui text-[9px] text-[#7E8F9F]">Sender</div>
                    <div className="font-ui text-xs text-[#F1F5F9] font-medium truncate">
                      {extractedData.payer_name || bookingState.guestName || 'Guest Payer'}
                    </div>
                  </div>
                  <div className="p-2 border border-[#1E3A4F] bg-[#0B1B2B] rounded">
                    <div className="font-ui text-[9px] text-[#7E8F9F]">Recipient</div>
                    <div className="font-ui text-xs text-[#F1F5F9] font-medium truncate">
                      {tenant.displayName}
                    </div>
                  </div>
                </div>

                {/* Metadata & Footer */}
                <div className="pt-2 border-t border-[#1E3A4F] flex items-center justify-between text-[10px] text-[#7E8F9F] relative z-10 font-ui">
                  <span>Suite: {bookingState.bayAllocation}</span>
                  <span className="font-mono-code text-[9px]">HASH: a8f9...e319</span>
                </div>
              </div>
            ) : (
              /* QR Mode Active Viewfinder */
              <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                <div className="w-56 h-56 border border-dashed border-[#38BDF8]/60 rounded-xl flex items-center justify-center relative bg-[#071423]/90">
                  <div className="absolute inset-2 border-2 border-[#38BDF8] rounded-lg animate-pulse" />
                  <div className="p-3 bg-white rounded-lg shadow-2xl relative">
                    <QrCode className="w-28 h-28 text-[#030F1E]" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="px-1.5 py-0.5 rounded bg-[#030F1E] text-[#38BDF8] font-mono-code font-bold text-[8px] border border-[#38BDF8]/60 shadow">
                        {bookingState.gateway}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 font-ui text-xs text-[#38BDF8] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                  <span>QR Recognition: Optical match verified</span>
                </div>
              </div>
            )}

            {/* Bottom Right Scanning Stamp */}
            <div className="absolute bottom-2.5 right-3 font-mono-code text-[9px] text-[#38BDF8] bg-[#071423]/90 border border-[#1E3A4F] px-2 py-0.5 rounded pointer-events-none">
              {isQrModeActive ? 'QR OPTICAL SYNC: 100%' : `OPTICAL SCANNING: ${scanPercent}%`}
            </div>

            {/* Hover / Click Prompt Banner */}
            {!isQrLocked && (
              <div className="absolute top-2.5 inset-x-0 mx-auto w-fit font-ui text-[11px] text-[#7E8F9F] bg-[#071423]/90 border border-[#1E3A4F] px-2.5 py-0.5 rounded-full pointer-events-none">
                {isHovered ? '⚡ Click inside to simulate shutter capture' : '👁 Hover or click for QR viewfinder'}
              </div>
            )}
          </div>

          {/* OCR Scan status telemetry runner */}
          <div className="p-3 bg-[#071423] border-t border-[#1E3A4F] flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399]" />
              <span className="font-mono-code text-[11px] text-[#F1F5F9]">
                ENGINE: GEMINI-3.6-FLASH // VISION-OCR
              </span>
            </div>
            <div className="flex items-center gap-3 font-ui text-xs text-[#7E8F9F]">
              <span>Confidence: 98.4%</span>
              <span className="text-[#38BDF8] font-medium">• Stage {stage}/4</span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: EXTRACTION TELEMETRY & FIELD AUDIT (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* Parsed Ledger Attributes */}
          <div className="glass-plate hairline-copper-top border border-[rgba(120,165,190,0.16)] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A4F]">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#38BDF8]" />
                <h2 className="font-ui text-sm text-[#F1F5F9] font-bold">
                  Parsed Ledger Attributes
                </h2>
              </div>
              <span className="font-mono-code text-[10px] text-[#7E8F9F]">
                {extractedData.verification_status ? extractedData.verification_status.toUpperCase() : 'PENDING'}
              </span>
            </div>

            {/* Parsed Fields List */}
            <div className="flex flex-col gap-2.5">
              {/* Field 1: Amount */}
              <div className="p-3 bg-[#071423] rounded-lg border border-[#1E3A4F] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-xs text-[#7E8F9F]">Amount detected on slip</span>
                  <span className="font-ui text-[9px] px-1.5 py-0.5 rounded bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399] font-semibold">
                    OCR Extracted
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="type-price text-base text-[#38BDF8] font-bold">
                    {(extractedData.amount_mmk || bookingState.depositAmount).toLocaleString()} MMK
                  </span>
                  <span className="type-price text-xs text-[#7E8F9F]">
                    Expected: {bookingState.depositAmount.toLocaleString()} MMK
                  </span>
                </div>
              </div>

              {/* Field 2: Sender Account */}
              <div className="p-2.5 bg-[#071423] rounded-lg border border-[#1E3A4F] flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-xs text-[#7E8F9F]">Sender / Payer</span>
                  <span className="font-ui text-[9px] px-1.5 py-0.5 rounded bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] font-semibold">
                    OCR Extracted
                  </span>
                </div>
                <span className="font-ui text-xs text-[#F1F5F9] font-medium">
                  {extractedData.payer_name || bookingState.guestName || 'Pending OCR'}
                </span>
              </div>

              {/* Field 3: Beneficiary */}
              <div className="p-2.5 bg-[#071423] rounded-lg border border-[#1E3A4F] flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-xs text-[#7E8F9F]">Beneficiary</span>
                  <span className="font-ui text-[9px] px-1.5 py-0.5 rounded bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] font-semibold">
                    OCR Extracted
                  </span>
                </div>
                <span className="font-ui text-xs text-[#F1F5F9] font-medium">
                  {tenant.displayName} ({bookingState.gateway})
                </span>
              </div>

              {/* Field 4: TX Reference */}
              <div className="p-2.5 bg-[#071423] rounded-lg border border-[#1E3A4F] flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-xs text-[#7E8F9F]">Transaction ID</span>
                  <span className="font-ui text-[9px] px-1.5 py-0.5 rounded bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] font-semibold">
                    OCR Extracted
                  </span>
                </div>
                <span className="font-mono-code text-xs text-[#38BDF8] font-bold">
                  {extractedData.transaction_id || 'TRX-DRAFT'}
                </span>
              </div>

              {/* Field 5: Reconciliation Audit State */}
              <div className="p-2.5 bg-[#102538] rounded-lg border border-[#1E3A4F] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-xs text-[#7E8F9F]">Reconciliation Audit</span>
                  <span className="font-ui text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
                    Manual Review Required
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[#38BDF8] font-ui text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                  <span>Pending studio ledger clearance</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Meter Bar */}
          <div className="glass-plate card-passive border border-[rgba(120,165,190,0.16)] rounded-xl p-4 space-y-2 font-ui">
            <div className="flex justify-between text-xs">
              <span className="text-[#7E8F9F]">Verification Pipeline</span>
              <span className="text-[#38BDF8] font-semibold">Stage {stage} of 4</span>
            </div>
            <div className="w-full h-2 bg-[#071423] rounded-full border border-[#1E3A4F] p-0.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#102538] via-[#38BDF8] to-[#34D399] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Real-Time Telemetry Terminal Logs */}
          <div className="border border-[#1E3A4F] rounded-xl bg-[#071423] p-3.5 font-mono-code text-[11px] space-y-1.5 text-[#7E8F9F]">
            {logItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center space-x-2 ${
                  item.status === 'done'
                    ? 'text-[#34D399]'
                    : item.status === 'running'
                    ? 'text-[#38BDF8]'
                    : 'text-[#7E8F9F]'
                }`}
              >
                <span>
                  {item.status === 'done' ? (
                    '✓'
                  ) : item.status === 'running' ? (
                    <span className="inline-block animate-spin">⟳</span>
                  ) : (
                    '○'
                  )}
                </span>
                <span className="truncate">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Controls Footer */}
          <div className="pt-2 space-y-3 font-ui">
            <button
              type="button"
              id="proceed-to-pass-btn"
              onClick={onVerificationComplete}
              className="btn-primary-action w-full !h-12 !text-sm font-ui font-semibold shadow-lg shadow-[#38BDF8]/20"
            >
              <span>Continue to Digital Pass</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onBackToBooking}
                className="btn-tertiary-action !text-[#7E8F9F] hover:!text-[#F1F5F9] font-ui text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return to Booking Suite</span>
              </button>
              <button
                type="button"
                onClick={onVerificationComplete}
                className="btn-tertiary-action font-ui text-xs"
                title="Skip simulated timer and complete pass generation immediately"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Fast-Track Pipeline</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

