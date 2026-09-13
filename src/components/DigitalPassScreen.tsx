import React, { useState, useEffect, useRef } from 'react';
import { BookingState } from '../types';
import { getTenantConfig } from '../config/tenantConfig';
import {
  Calendar,
  Download,
  Check,
  Info,
  ArrowRight,
  Share2,
  Copy,
  Maximize2,
  X,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
  HardDrive,
  FileText,
} from 'lucide-react';
import { generateTurnstileQRCode } from '../utils/qrGenerator';

interface DigitalPassScreenProps {
  bookingState: BookingState;
  onProceedToVault: () => void;
}

const OFFLINE_PASS_CACHE_KEY = 'akk_offline_pass_cache';
const OFFLINE_MODE_PREF_KEY = 'akk_offline_mode_active';

export const DigitalPassScreen: React.FC<DigitalPassScreenProps> = ({
  bookingState,
  onProceedToVault,
}) => {
  const tenant = getTenantConfig(bookingState.tenantId);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [qrDownloaded, setQrDownloaded] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [scanSimulation, setScanSimulation] = useState<'idle' | 'scanning' | 'granted'>('idle');
  const [scanSecondsLeft, setScanSecondsLeft] = useState<number>(3);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real Scannable QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(true);
  const [qrError, setQrError] = useState<string | null>(null);

  // Offline Mode & Local Storage Cache State
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(OFFLINE_MODE_PREF_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [cachedTimestamp, setCachedTimestamp] = useState<string | null>(() => {
    try {
      const cached = localStorage.getItem(OFFLINE_PASS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.cachedAt || null;
      }
    } catch {
      // Ignore storage read error
    }
    return null;
  });

  const [isLocallyCached, setIsLocallyCached] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem(OFFLINE_PASS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return Boolean(parsed.qrDataUrl);
      }
    } catch {
      // Ignore
    }
    return false;
  });

  const [offlineToast, setOfflineToast] = useState<string | null>(null);

  // Local storage caching helper
  const cachePassLocally = (dataUrl: string) => {
    if (!dataUrl) return;
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const cachePayload = {
        turnstileCode: bookingState.turnstileCode,
        qrDataUrl: dataUrl,
        cachedAt: nowStr,
        cachedDate: new Date().toLocaleDateString(),
        token: bookingState.token,
        bayAllocation: bookingState.bayAllocation,
        guestName: bookingState.guestName,
        dateStr: bookingState.dateStr,
        timeSlot: bookingState.timeSlot,
        briefingNotes: bookingState.briefingNotes,
      };
      localStorage.setItem(OFFLINE_PASS_CACHE_KEY, JSON.stringify(cachePayload));
      setCachedTimestamp(nowStr);
      setIsLocallyCached(true);
    } catch (e) {
      console.warn('Could not write to localStorage cache', e);
    }
  };

  // Toggle Offline Mode handler
  const handleToggleOfflineMode = () => {
    const nextState = !isOfflineMode;
    setIsOfflineMode(nextState);
    try {
      localStorage.setItem(OFFLINE_MODE_PREF_KEY, String(nextState));
    } catch (e) {
      console.warn(e);
    }

    if (nextState) {
      // If we already have the QR code generated, ensure it's saved in offline storage
      if (qrDataUrl) {
        cachePassLocally(qrDataUrl);
      }
      setOfflineToast(
        'Offline Mode Active: QR code & turnstile pass are cached in local browser storage. Ready for gate access without internet.'
      );
    } else {
      setOfflineToast('Live Connected Mode: Connected to studio live network.');
    }

    setTimeout(() => {
      setOfflineToast(null);
    }, 4500);
  };

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOffline = () => {
      setIsOfflineMode(true);
      setOfflineToast('Network Disconnected: Switched to offline cached pass mode.');
      setTimeout(() => setOfflineToast(null), 4500);
    };

    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Generate or retrieve QR code
  useEffect(() => {
    let isCurrent = true;
    setQrLoading(true);
    setQrError(null);

    // Check offline cache first if in offline mode or if cached version exists
    try {
      const cached = localStorage.getItem(OFFLINE_PASS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.turnstileCode === bookingState.turnstileCode && parsed.qrDataUrl) {
          if (isCurrent) {
            setQrDataUrl(parsed.qrDataUrl);
            setCachedTimestamp(parsed.cachedAt || null);
            setIsLocallyCached(true);
            setQrLoading(false);
          }
          // If offline mode is enabled, serve directly from cache without regenerating
          if (isOfflineMode) {
            return () => {
              isCurrent = false;
            };
          }
        }
      }
    } catch (e) {
      console.warn('Error reading from offline cache', e);
    }

    const fallbackQrCode = tenant.qrFallbackCodePrefix ? `${tenant.qrFallbackCodePrefix}-PASS` : 'STUDIO-BAY-PASS';

    generateTurnstileQRCode(bookingState.turnstileCode || fallbackQrCode, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
      darkColor: '#09090b',
      lightColor: '#ffffff',
    })
      .then((url) => {
        if (isCurrent) {
          setQrDataUrl(url);
          setQrLoading(false);
          // Always keep local cache synced so offline mode is instantly ready
          cachePassLocally(url);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          // Fallback to offline cache if generation failed
          try {
            const cached = localStorage.getItem(OFFLINE_PASS_CACHE_KEY);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.qrDataUrl) {
                setQrDataUrl(parsed.qrDataUrl);
                setCachedTimestamp(parsed.cachedAt || null);
                setIsLocallyCached(true);
                setQrLoading(false);
                return;
              }
            }
          } catch {}
          console.error('Failed to generate turnstile QR code', err);
          setQrError('Failed to generate QR code');
          setQrLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [bookingState.turnstileCode, isOfflineMode, tenant.qrFallbackCodePrefix]);

  // Copy Turnstile Code
  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(bookingState.turnstileCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // Download Standalone High-Res QR Code PNG
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    const prefix = tenant.passDownloadFilename || tenant.displayName.replace(/\s+/g, '_');
    link.download = `${prefix}_Turnstile_QR_${bookingState.turnstileCode || 'PASS'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setQrDownloaded(true);
    setTimeout(() => setQrDownloaded(false), 3000);
  };

  // Turnstile Scan Simulation test (3-second optical scan duration)
  const handleSimulateScan = () => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    setScanSimulation('scanning');
    setScanSecondsLeft(3);

    let seconds = 3;
    scanIntervalRef.current = setInterval(() => {
      seconds -= 1;
      if (seconds > 0) {
        setScanSecondsLeft(seconds);
      } else {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      }
    }, 1000);

    // After simulated 3-second scan completion, update to 'granted' ('Verified' / 'Access Granted')
    scanTimerRef.current = setTimeout(() => {
      setScanSimulation('granted');
      setScanSecondsLeft(0);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

      // Keep verified / granted state active for review
      resetTimerRef.current = setTimeout(() => {
        setScanSimulation('idle');
      }, 7000);
    }, 3000);
  };

  // Timer cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Generate .ics calendar download
  const handleAddToCalendar = () => {
    const prodId = tenant.calendarProdId || `-//${tenant.displayName}//EN`;
    const domain = tenant.calendarUidDomain || tenant.websiteUrl.replace(/^https?:\/\//, '');
    const summary = tenant.calendarSummary
      ? `${tenant.calendarSummary} - ${bookingState.selectedPackage.name}`
      : `${tenant.displayName} - ${bookingState.selectedPackage.name}`;
    const description = tenant.calendarDescription
      ? `${tenant.calendarDescription}. Bay: ${bookingState.bayAllocation}. Balance due: ${(bookingState.totalAmount - bookingState.depositAmount).toLocaleString()} ${tenant.currency || 'MMK'}`
      : `Session at ${tenant.displayName}. Bay: ${bookingState.bayAllocation}. Balance due: ${(bookingState.totalAmount - bookingState.depositAmount).toLocaleString()} ${tenant.currency || 'MMK'}`;
    const location = tenant.calendarLocation || tenant.address;
    const downloadFilename = tenant.passDownloadFilename
      ? `${tenant.passDownloadFilename}_${bookingState.token}.ics`
      : `${tenant.displayName.replace(/\s+/g, '_')}_Pass_${bookingState.token}.ics`;

    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:${prodId}`,
      'BEGIN:VEVENT',
      `UID:${bookingState.token}@${domain}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'DTSTART:20261118T043000Z',
      'DTEND:20261118T053000Z',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', downloadFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCalendarAdded(true);
    setTimeout(() => setCalendarAdded(false), 3000);
  };

  const handleDownloadPDF = () => {
    setPdfDownloaded(true);
    window.print();
    setTimeout(() => setPdfDownloaded(false), 3000);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between items-center px-4 sm:px-6 py-6 selection:bg-[#38BDF8] selection:text-[#030F1E] w-full">
      {/* Top Minimal Header with Toggle Offline Mode Switch */}
      <header className="w-full max-w-xl flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 mb-2 gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-[#0B1B2B] border border-[#1E3A4F] flex items-center justify-center">
            <svg
              className="w-4 h-4 text-[#38BDF8]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v18M3 12h18" />
            </svg>
          </div>
          <span className="font-ui font-bold text-sm tracking-tight text-[#F1F5F9] uppercase">
            {tenant.displayName} CORE
          </span>
        </div>

        <div className="flex items-center space-x-2.5 self-end sm:self-auto flex-wrap">
          {/* Toggle Offline Mode Switch */}
          <button
            type="button"
            id="toggle-offline-mode-btn"
            role="switch"
            aria-checked={isOfflineMode}
            onClick={handleToggleOfflineMode}
            className={`group flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-ui transition-all cursor-pointer select-none ${
              isOfflineMode
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-[#101C2C] hover:bg-[#102538] border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
            title={
              isOfflineMode
                ? 'Offline Mode Active: Pass is cached locally in browser storage'
                : 'Toggle Offline Mode to cache QR pass for usage without internet connection'
            }
          >
            <div className="flex items-center space-x-1.5">
              {isOfflineMode ? (
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              )}
              <span className="font-semibold text-[11px]">
                {isOfflineMode ? 'Offline Mode' : 'Toggle Offline Mode'}
              </span>
            </div>

            {/* Custom Interactive Toggle Switch Track & Thumb */}
            <div
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                isOfflineMode ? 'bg-amber-400' : 'bg-[#1E3A4F] group-hover:bg-[#38BDF8]/50'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-[#071423] shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                  isOfflineMode ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>

          {/* Reservation / Offline Status Pill */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border font-ui text-[11px] ${
              isOfflineMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOfflineMode ? 'bg-amber-400' : 'bg-[#34D399] animate-pulse'
              }`}
            />
            <span className="hidden xs:inline sm:inline">
              {isOfflineMode ? 'Local Offline Cache' : 'Reservation Authenticated'}
            </span>
            <span className="xs:hidden sm:hidden">
              {isOfflineMode ? 'Offline' : 'Auth'}
            </span>
          </div>
        </div>
      </header>

      {/* Offline Mode Info Banner */}
      {isOfflineMode && (
        <div
          id="offline-cache-banner"
          className="w-full max-w-xl mb-3 px-3.5 py-2.5 rounded-xl bg-amber-950/35 border border-amber-500/40 text-amber-300 text-xs font-ui flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fadeIn shadow-[0_0_16px_rgba(245,158,11,0.12)]"
        >
          <div className="flex items-center space-x-2.5">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-200">Offline Pass Cached:</span>{' '}
              <span className="text-amber-300/90">
                QR code & gate credentials are stored locally. Turnstile scanners can verify your pass without Wi-Fi or cellular service.
              </span>
            </div>
          </div>
          {cachedTimestamp && (
            <div className="flex items-center space-x-1 text-[11px] text-amber-400 font-ui bg-amber-900/50 px-2 py-0.5 rounded border border-amber-500/30 shrink-0 self-end sm:self-auto">
              <HardDrive className="w-2.5 h-2.5" />
              <span>Cached {cachedTimestamp}</span>
            </div>
          )}
        </div>
      )}

      {/* Floating Offline Status Toast Notification */}
      {offlineToast && (
        <div
          id="offline-toast"
          className="fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-xl bg-[#0B1B2B] border border-amber-400/70 shadow-2xl text-amber-200 text-xs font-ui flex items-start space-x-2.5 animate-fadeIn"
        >
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="leading-snug">{offlineToast}</p>
          </div>
          <button
            onClick={() => setOfflineToast(null)}
            className="text-[#7E8F9F] hover:text-white p-0.5 cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Digital Studio Pass */}
      <main className="w-full max-w-xl my-auto">
        <div className="relative glass-plate hairline-copper-top border border-[rgba(120,165,190,0.22)] rounded-2xl overflow-hidden shadow-2xl">
          {/* Top Cyber Ribbon / Status */}
          <div className="bg-[#071423] border-b border-[#1E3A4F] px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2 font-ui text-xs">
              <span className="text-[#38BDF8] font-semibold">Slot Granted</span>
              <span className="text-[#1E3A4F]">/</span>
              <span className="text-[#94A3B8]">{bookingState.bayAllocation}</span>
            </div>
            <div className="font-mono text-[10px] text-[#7E8F9F] tracking-wide">
              TOKEN: {bookingState.token}
            </div>
          </div>

          {/* Ticket Main Upper Section */}
          <div className="p-6 sm:p-7 space-y-6">
            {/* Headline & Client Name */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <span className="block font-ui text-[11px] text-[#7E8F9F] tracking-normal">
                  Session charter manifest
                </span>
                <h1 className="font-ui font-bold text-2xl text-[#F1F5F9] tracking-tight">
                  {bookingState.selectedPackage.name}
                </h1>
              </div>
              <div className="sm:text-right">
                <span className="block font-ui text-[11px] text-[#7E8F9F]">
                  Reserved guest
                </span>
                <span className="font-ui font-semibold text-base text-[#38BDF8]">
                  {bookingState.guestName}
                </span>
              </div>
            </div>

            {/* 4-Grid Session Specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#071423] border border-[#1E3A4F] rounded-xl p-4 font-ui">
              <div>
                <span className="block text-[11px] text-[#7E8F9F]">
                  Date
                </span>
                <span className="text-xs font-semibold text-[#F1F5F9]">
                  {bookingState.dateStr}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#7E8F9F]">
                  Time Slot
                </span>
                <span className="text-xs font-semibold text-[#38BDF8]">
                  {bookingState.timeSlot}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#7E8F9F]">
                  Duration
                </span>
                <span className="text-xs font-semibold text-[#F1F5F9]">60 Mins</span>
              </div>
              <div>
                <span className="block text-[11px] text-[#7E8F9F]">
                  Deposit Status
                </span>
                <span className="text-xs font-semibold text-[#FBBF24] tabular-nums">
                  {bookingState.depositAmount.toLocaleString()} MMK (Review Pending)
                </span>
              </div>
            </div>

            {/* Atelier Operational Details */}
            <div className="space-y-2 text-xs font-ui text-[#94A3B8] border-l-2 border-[#38BDF8] pl-3 py-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-[#F1F5F9] font-medium">
                  Lead Gaffer / Tech:
                </span>
                <span>Studio Atelier Crew 03</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[#F1F5F9] font-medium">
                  Lighting Rig:
                </span>
                <span>Profoto B10X + Softbox Octa 4'</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[#F1F5F9] font-medium">
                  Balance Due at Bay:
                </span>
                <span className="text-[#F1F5F9] font-bold tabular-nums">
                  {(bookingState.totalAmount - bookingState.depositAmount).toLocaleString()} MMK
                </span>
              </div>
              {bookingState.briefingNotes && (
                <div className="pt-2 mt-1 border-t border-[#1E3A4F]">
                  <div className="flex items-center space-x-1.5 text-[#F1F5F9] font-medium mb-1">
                    <FileText className="w-3 h-3 text-[#38BDF8]" />
                    <span className="text-[11px] tracking-normal">Setup Briefing Notes:</span>
                  </div>
                  <p className="text-[#F1F5F9] text-xs leading-relaxed bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 font-ui">
                    {bookingState.briefingNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Perforated Divider Bar */}
          <div className="relative w-full h-6 flex items-center justify-center">
            <div className="notch-left -top-0.5" />
            <div className="w-full border-b border-dashed border-[#1E3A4F]" />
            <div className="notch-right -top-0.5" />
          </div>

          {/* Ticket Stub Lower Section: Digital Door Access QR */}
          <div className="p-6 sm:p-7 pt-4 bg-[#071423] border-t border-[#1E3A4F]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-start sm:items-center space-x-4 w-full sm:w-auto">
                {/* Real Dynamic Scannable QR Box */}
                <div
                  onClick={() => setIsQrModalOpen(true)}
                  className="relative group cursor-pointer p-2 bg-white rounded-xl border-2 border-zinc-200 hover:border-[#38bdf8] flex-shrink-0 transition-all shadow-lg hover:shadow-[#38bdf8]/20 animate-qr-pulse"
                  title="Click to enlarge QR code for studio turnstile scanner"
                >
                  {qrLoading ? (
                    <div className="w-20 h-20 flex flex-col items-center justify-center bg-zinc-50 rounded">
                      <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                      <span className="text-[9px] font-mono-code text-zinc-500 mt-1">Generating</span>
                    </div>
                  ) : qrError ? (
                    <div className="w-20 h-20 flex items-center justify-center text-[10px] text-rose-500 text-center font-mono-code">
                      {qrError}
                    </div>
                  ) : qrDataUrl ? (
                    <div className="relative overflow-hidden rounded">
                      <img
                        src={qrDataUrl}
                        alt={`Turnstile Scannable QR Code for ${bookingState.turnstileCode}`}
                        className="w-20 h-20 object-contain select-none"
                        style={{ imageRendering: 'pixelated' }}
                      />

                      {/* Laser scanning line effect when test simulator is active */}
                      {scanSimulation === 'scanning' && (
                        <div className="absolute inset-x-0 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse top-1/2 -translate-y-1/2" />
                      )}

                      {/* Hover Overlay with Maximize Icon */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : null}

                  {/* Corner indicator badge */}
                  <span
                    className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full font-mono-code text-[8px] font-bold shadow-sm flex items-center gap-1 ${
                      isOfflineMode
                        ? 'bg-amber-400 text-[#09090b]'
                        : 'bg-[#38bdf8] text-[#09090b]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOfflineMode ? 'bg-[#09090b]' : 'bg-[#09090b] animate-ping'
                      }`}
                    />
                    <span>{isOfflineMode ? 'OFFLINE' : 'LIVE'}</span>
                  </span>
                </div>

                {/* Turnstile Code & Actions */}
                <div className="space-y-2 font-ui flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-[11px] text-[#7E8F9F] tracking-normal block font-medium">
                      Turnstile Access Code
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 text-[10px] font-semibold">
                      Optical Pass
                    </span>

                    {/* Offline cached badge if in offline mode or cached */}
                    {isOfflineMode && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center gap-1">
                        <WifiOff className="w-2.5 h-2.5" />
                        <span>Cached Offline</span>
                      </span>
                    )}

                    {/* Status Indicator Badge directly next to QR code header */}
                    <div
                      id="qr-scan-badge"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-normal transition-all duration-300 ${
                        scanSimulation === 'granted'
                          ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/50 shadow-[0_0_10px_rgba(52,211,153,0.35)] animate-fadeIn'
                          : scanSimulation === 'scanning'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse'
                          : 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30'
                      }`}
                    >
                      {scanSimulation === 'granted' ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-[#34D399] stroke-[2.5]" />
                          <span>Verified</span>
                        </>
                      ) : scanSimulation === 'scanning' ? (
                        <>
                          <div className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span>Scanning ({scanSecondsLeft}s)</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                          <span>Ready for Scan</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-sm sm:text-base font-bold text-[#F1F5F9] tracking-widest font-mono bg-[#0B1B2B] px-2.5 py-1 rounded-lg border border-[#1E3A4F] select-all">
                      {bookingState.turnstileCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="p-1.5 rounded-lg bg-[#101C2C] hover:bg-[#102538] border border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
                      title="Copy Turnstile Code"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-[#34D399]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Dedicated Status Text beside the QR code & turnstile credentials */}
                    <div
                      id="turnstile-status-text"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-300 ${
                        scanSimulation === 'granted'
                          ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/60 shadow-[0_0_12px_rgba(52,211,153,0.3)] animate-fadeIn'
                          : scanSimulation === 'scanning'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-400/40 animate-pulse'
                          : 'bg-[#101C2C] text-[#7E8F9F] border border-[#1E3A4F]'
                      }`}
                    >
                      {scanSimulation === 'granted' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#34D399] stroke-[2.5]" />
                          <span>Access Granted</span>
                        </>
                      ) : scanSimulation === 'scanning' ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span>Scanning Optical Pass ({scanSecondsLeft}s)...</span>
                        </>
                      ) : (
                        <>
                          <ScanLine className="w-3.5 h-3.5 text-[#38BDF8]" />
                          <span>Awaiting Scan</span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#94A3B8] leading-tight font-ui">
                    Scan this QR directly at the studio turnstile gate or concierge tablet to automatically unlock {bookingState.bayAllocation}.
                  </p>

                  {/* Quick QR Utilities */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-ui text-xs">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="text-xs text-[#38BDF8] hover:text-[#0EA5E9] hover:underline flex items-center space-x-1 cursor-pointer font-medium"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Enlarge Pass</span>
                    </button>
                    <span className="text-[#1E3A4F]">•</span>
                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      className="text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:underline flex items-center space-x-1 cursor-pointer font-medium"
                    >
                      <Download className="w-3 h-3 text-[#38BDF8]" />
                      <span>{qrDownloaded ? 'Downloaded PNG ✓' : 'Save QR PNG'}</span>
                    </button>
                    <span className="text-[#1E3A4F]">•</span>
                    <button
                      type="button"
                      onClick={handleSimulateScan}
                      disabled={scanSimulation === 'scanning'}
                      className={`text-xs flex items-center space-x-1 cursor-pointer transition-colors font-medium ${
                        scanSimulation === 'scanning'
                          ? 'text-amber-400 font-semibold'
                          : scanSimulation === 'granted'
                          ? 'text-[#34D399] hover:text-emerald-300 font-semibold'
                          : 'text-[#34D399] hover:text-emerald-300 hover:underline'
                      }`}
                    >
                      <ScanLine className="w-3 h-3" />
                      <span>
                        {scanSimulation === 'scanning'
                          ? `Simulating scan (${scanSecondsLeft}s)...`
                          : scanSimulation === 'granted'
                          ? 'Access Granted ✓ (Re-test 3s)'
                          : 'Test Scan Turnstile (3s)'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Indicator Icon & Status Label */}
              <div className="flex flex-col sm:items-end items-start space-y-1 sm:self-center shrink-0 font-ui">
                <div
                  className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 shadow-sm transition-all duration-300 ${
                    scanSimulation === 'granted'
                      ? 'border-[#34D399] bg-[#34D399]/20 text-[#34D399] shadow-[0_0_16px_rgba(52,211,153,0.35)] scale-105'
                      : scanSimulation === 'scanning'
                      ? 'border-amber-400/60 bg-amber-500/15 text-amber-300 animate-pulse'
                      : 'border-[#34D399]/40 bg-[#34D399]/10 text-[#34D399]'
                  }`}
                  title={
                    scanSimulation === 'granted'
                      ? 'Access Granted'
                      : scanSimulation === 'scanning'
                      ? 'Simulating 3s Turnstile Scan'
                      : 'Turnstile Credential Active'
                  }
                >
                  {scanSimulation === 'granted' ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#34D399] stroke-[2.5]" />
                      <span className="text-xs font-semibold text-[#34D399]">
                        Access Granted
                      </span>
                    </>
                  ) : scanSimulation === 'scanning' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold text-amber-300">
                        Scanning ({scanSecondsLeft}s)
                      </span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#34D399] stroke-[2.5]" />
                      <span className="text-xs font-semibold text-[#34D399]">
                        Turnstile Active
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[11px] font-ui text-[#7E8F9F]">
                  {scanSimulation === 'granted' ? (
                    <span className="text-[#34D399] font-medium">Verified ✓ Gate Open</span>
                  ) : scanSimulation === 'scanning' ? (
                    <span className="text-amber-400 font-medium">Simulated 3s Scan</span>
                  ) : (
                    <span>Studio Turnstile #01</span>
                  )}
                </span>
              </div>
            </div>

            {/* Scan Simulation Feedback Toast */}
            {scanSimulation === 'granted' && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/45 border border-[#34D399]/50 text-emerald-300 text-xs font-ui flex items-start sm:items-center justify-between gap-3 animate-fadeIn shadow-[0_0_16px_rgba(16,185,129,0.2)]">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#34D399] flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-200">Verified • Access Granted:</span>{' '}
                    <span>Optical scan confirmed for <strong className="font-mono">{bookingState.turnstileCode}</strong>. Turnstile gate unlatched for {bookingState.bayAllocation}!</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#34D399]/25 border border-[#34D399]/40 text-[10px] font-bold text-[#34D399] shrink-0">
                  VERIFIED
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pass Management Action Buttons */}
        {/* Primary Progression CTA: Proceed to Vault */}
        <div className="mt-5">
          <button
            type="button"
            id="proceed-to-vault-btn"
            onClick={onProceedToVault}
            className="btn-primary-action w-full !h-12 !text-sm font-ui font-semibold shadow-lg shadow-[#38BDF8]/20"
          >
            <span>Proceed to Client Deliverables Vault</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Secondary Export & Calendar Actions */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Secondary 1: Add to Calendar */}
          <button
            type="button"
            onClick={handleAddToCalendar}
            className="btn-secondary-action !h-11 font-ui font-medium !text-xs"
          >
            <Calendar className="w-4 h-4 text-[#38BDF8]" />
            <span>
              {calendarAdded ? 'Calendar Added ✓' : 'Add to Calendar (.ics)'}
            </span>
          </button>

          {/* Secondary 2: Download Pass (PDF) */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="btn-secondary-action !h-11 font-ui font-medium !text-xs"
          >
            <Download className="w-4 h-4 text-[#38BDF8]" />
            <span>
              {pdfDownloaded ? 'Printing Pass...' : 'Download Pass (PDF)'}
            </span>
          </button>

          {/* Secondary 3: Save Turnstile QR (PNG) */}
          <button
            type="button"
            onClick={handleDownloadQR}
            className="btn-secondary-action !h-11 font-ui font-medium !text-xs"
          >
            <QrCode className="w-4 h-4 text-[#34D399]" />
            <span>
              {qrDownloaded ? 'Saved QR PNG ✓' : 'Save Turnstile QR (PNG)'}
            </span>
          </button>
        </div>

        {/* Instructions / Directions Footer */}
        <div className="mt-4 p-4 rounded-xl bg-[#0B1B2B] border border-[#1E3A4F] flex items-start space-x-3 text-xs font-ui text-[#7E8F9F]">
          <Info className="w-4 h-4 text-[#38BDF8] flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[#F1F5F9] font-medium">
              Studio Arrival Notice:
            </span>{' '}
            Please arrive 15 minutes prior to {bookingState.timeSlot} for wardrobe prep.
            Wardrobe steamer and vanity suite are open from 10:45 AM.
          </div>
        </div>
      </main>

      {/* High-Resolution Turnstile QR Modal Overlay */}
      {isQrModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#030F1E]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#0B1B2B] border border-[#1E3A4F] rounded-2xl p-6 shadow-2xl relative text-center font-ui"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#101C2C] hover:bg-[#102538] text-[#7E8F9F] hover:text-white border border-[#1E3A4F] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div className="text-left">
                <span className="text-[11px] text-[#38BDF8] font-semibold block">
                  Studio Turnstile Access
                </span>
                <h3 className="text-base font-ui font-bold text-[#F1F5F9] mt-0.5">
                  Digital Bay Gate Pass
                </h3>
              </div>

              {isOfflineMode && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                  <WifiOff className="w-2.5 h-2.5" />
                  <span>Offline Cache</span>
                </span>
              )}
            </div>

            {/* High-Contrast Large QR Container */}
            <div className="relative mx-auto w-64 h-64 bg-white p-3.5 rounded-2xl border-4 border-zinc-300 shadow-xl flex items-center justify-center animate-qr-pulse">
              {qrLoading ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-8 h-8 border-3 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                  <span className="text-xs text-zinc-600 font-ui">Generating Optical Pass...</span>
                </div>
              ) : qrDataUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={qrDataUrl}
                    alt={`Scannable Turnstile QR Pass for ${bookingState.turnstileCode}`}
                    className="w-full h-full object-contain select-none"
                    style={{ imageRendering: 'pixelated' }}
                  />

                  {/* Laser effect during simulation */}
                  {scanSimulation === 'scanning' && (
                    <div className="absolute inset-x-0 h-1 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse top-1/2 -translate-y-1/2" />
                  )}
                </div>
              ) : (
                <div className="text-xs text-rose-600 font-mono">QR Error</div>
              )}
            </div>

            {/* Status Indicator Banner in Modal */}
            <div className="mt-3">
              <div
                className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-ui font-semibold transition-all duration-300 ${
                  scanSimulation === 'granted'
                    ? 'bg-[#34D399]/20 text-[#34D399] border-[#34D399]/60 shadow-[0_0_14px_rgba(52,211,153,0.3)] animate-fadeIn'
                    : scanSimulation === 'scanning'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 animate-pulse'
                    : 'bg-[#071423] text-[#94A3B8] border-[#1E3A4F]'
                }`}
              >
                {scanSimulation === 'granted' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                    <span>Verified • Access Granted</span>
                  </>
                ) : scanSimulation === 'scanning' ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span>Scanning Turnstile Reader ({scanSecondsLeft}s)...</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
                    <span>Optical Pass Ready for Scan</span>
                  </>
                )}
              </div>
            </div>

            {/* Turnstile Details */}
            <div className="mt-3 bg-[#071423] border border-[#1E3A4F] rounded-xl p-3 text-left space-y-1.5 font-ui">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#7E8F9F]">Gate Code:</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-[#38BDF8] tracking-wider font-mono">
                    {bookingState.turnstileCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="text-[#7E8F9F] hover:text-white p-0.5 cursor-pointer"
                    title="Copy Code"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#7E8F9F]">Bay Allocation:</span>
                <span className="font-semibold text-[#F1F5F9]">{bookingState.bayAllocation}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#7E8F9F]">Session Date/Time:</span>
                <span className="font-semibold text-[#F1F5F9]">{bookingState.dateStr} • {bookingState.timeSlot}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#7E8F9F]">Turnstile Status:</span>
                <span className={`font-semibold ${scanSimulation === 'granted' ? 'text-[#34D399]' : scanSimulation === 'scanning' ? 'text-amber-400' : 'text-[#7E8F9F]'}`}>
                  {scanSimulation === 'granted' ? 'Access Granted ✓' : scanSimulation === 'scanning' ? 'Scanning (3s)...' : 'Standby'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#7E8F9F]">Cache / Link:</span>
                <span className={`font-semibold flex items-center gap-1 ${isOfflineMode ? 'text-amber-400' : 'text-[#34D399]'}`}>
                  {isOfflineMode ? (
                    <>
                      <WifiOff className="w-3 h-3 text-amber-400" />
                      <span>Offline (Cached {cachedTimestamp || 'Local'})</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                      <span>Live Synced</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Instructions */}
            <p className="mt-3 text-[11px] text-[#7E8F9F] font-ui">
              Hold your screen up to the laser / optical camera scanner at the turnstile gate.
            </p>

            {/* Modal Actions */}
            <div className="mt-4 grid grid-cols-2 gap-2 font-ui">
              <button
                type="button"
                onClick={handleDownloadQR}
                className="py-2.5 px-3 rounded-xl bg-[#101C2C] hover:bg-[#102538] border border-[#1E3A4F] text-[#F1F5F9] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>{qrDownloaded ? 'Saved PNG ✓' : 'Save Image'}</span>
              </button>
              <button
                type="button"
                onClick={handleSimulateScan}
                disabled={scanSimulation === 'scanning'}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                  scanSimulation === 'granted'
                    ? 'bg-[#34D399]/25 hover:bg-[#34D399]/35 border-[#34D399]/50 text-[#34D399]'
                    : scanSimulation === 'scanning'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-[#34D399]/20 hover:bg-[#34D399]/30 border-[#34D399]/40 text-[#34D399]'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>
                  {scanSimulation === 'scanning'
                    ? `Scanning (${scanSecondsLeft}s)...`
                    : scanSimulation === 'granted'
                    ? 'Access Granted ✓'
                    : 'Simulate 3s Scan'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
