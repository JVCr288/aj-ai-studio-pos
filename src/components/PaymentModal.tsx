import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookingState, PaymentGateway } from '../types';
import { GATEWAY_CONFIGS } from '../data/mockData';
import { SUPPORTED_PAYMENT_GATEWAYS, getPaymentBrand } from '../utils/paymentBrands';
import { X, Shield, Copy, Check, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface PaymentModalProps {
  bookingState: BookingState;
  onClose: () => void;
  onCompleteTransfer: () => void;
  onSelectGateway: (gw: PaymentGateway) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  bookingState,
  onClose,
  onCompleteTransfer,
  onSelectGateway,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [isMounted, setIsMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const currentGateway = bookingState.gateway;
  const config = GATEWAY_CONFIGS[currentGateway] || GATEWAY_CONFIGS['KBZPay'];
  const currentBrand = getPaymentBrand(currentGateway);

  // SSR / Portal safe mount check
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock background scrolling while modal is open, without altering scroll position
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift from scrollbar disappearing
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // Focus close button on open for accessibility
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      clearTimeout(timer);
    };
  }, []);

  // Keyboard accessibility: Escape closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(config.accountNumber);
    setCopied(true);
    if (currentStep === 1) setCurrentStep(2);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = () => {
    setCurrentStep(3);
    setTimeout(() => {
      onCompleteTransfer();
    }, 350);
  };

  const gateways: PaymentGateway[] = SUPPORTED_PAYMENT_GATEWAYS;

  if (!isMounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-[#030F1E]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Dialog Window */}
      <div
        className="w-full max-w-lg glass-level-3 copper-reflection rounded-2xl overflow-hidden relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[calc(100dvh-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-[#1E3A4F] flex items-center justify-between bg-[#071423] flex-shrink-0 font-ui">
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-pulse" />
            <div>
              <h3 id="payment-modal-title" className="font-ui font-bold text-base text-[#F1F5F9] tracking-wide">
                Secure Settlement
              </h3>
              <p className="font-ui text-xs text-[#7E8F9F]">
                Manifest ID: <span className="font-mono-code text-[#CBD5E1] font-semibold">{bookingState.manifestId}</span>
              </p>
            </div>
          </div>
          {/* Close / Dismiss Button */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#1E3A4F] bg-[#0B1B2B] hover:bg-[#102538] text-[#7E8F9F] hover:text-white flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
            aria-label="Close Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Container for Modal Content on small viewports */}
        <div className="overflow-y-auto flex-1 overscroll-contain font-ui">
          {/* Linear Payment Verification Progress Bar Section */}
          <div className="px-6 py-3.5 bg-[#071423] border-b border-[#1E3A4F] sticky top-0 z-10">
            <div className="flex items-center justify-between font-ui text-xs mb-2">
              <span className="text-[#7E8F9F] flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                <span>Verification Pipeline:</span>
                <span className="text-[#38BDF8] font-bold">
                  {currentStep === 1
                    ? 'Stage 1/3 (Gateway)'
                    : currentStep === 2
                    ? 'Stage 2/3 (Transfer)'
                    : 'Stage 3/3 (Verify)'}
                </span>
              </span>
              <span className="font-ui font-bold text-[#34D399] tabular-nums">
                {currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%'}
              </span>
            </div>

            {/* Linear Progress Bar Track */}
            <div className="relative w-full h-2 bg-[#030F1E] rounded-full overflow-hidden border border-[#1E3A4F]">
              <div
                className="h-full bg-gradient-to-r from-[#102538] via-[#38BDF8] to-[#34D399] rounded-full transition-all duration-500 ease-out relative"
                style={{
                  width:
                    currentStep === 1
                      ? '33.3%'
                      : currentStep === 2
                      ? '66.6%'
                      : '100%',
                }}
              >
                {/* Scan Shimmer Highlight */}
                <div className="absolute inset-0 bg-white/25 animate-pulse" />
              </div>
            </div>

            {/* Linear Step Indicators & Badges */}
            <div className="grid grid-cols-3 gap-2 mt-2.5 font-ui text-xs">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-1 text-left transition-colors cursor-pointer ${
                  currentStep >= 1 ? 'text-[#38BDF8] font-medium' : 'text-[#7E8F9F]'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-[#34D399] flex-shrink-0" />
                <span className="truncate">1. Select Channel</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`flex items-center gap-1 text-center justify-center transition-colors cursor-pointer ${
                  currentStep === 2
                    ? 'text-white font-bold'
                    : currentStep > 2
                    ? 'text-[#38BDF8] font-medium'
                    : 'text-[#7E8F9F]'
                }`}
              >
                {currentStep > 2 ? (
                  <CheckCircle2 className="w-3 h-3 text-[#34D399] flex-shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping flex-shrink-0" />
                )}
                <span className="truncate">2. Scan &amp; Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`flex items-center gap-1 text-right justify-end transition-colors cursor-pointer ${
                  currentStep === 3 ? 'text-[#34D399] font-bold' : 'text-[#7E8F9F]'
                }`}
              >
                {currentStep === 3 ? (
                  <CheckCircle2 className="w-3 h-3 text-[#34D399] flex-shrink-0" />
                ) : (
                  <Clock className="w-3 h-3 text-[#7E8F9F] flex-shrink-0" />
                )}
                <span className="truncate">3. OCR Audit</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Amount Required Badge Box */}
            <div className="bg-[#071423] border border-[#1E3A4F] rounded-xl p-3.5 flex items-center justify-between font-ui">
              <div>
                <span className="block text-xs text-[#94A3B8] font-medium uppercase tracking-wider">
                  Deposit Obligation (50%)
                </span>
                <span className="font-ui font-bold text-lg text-[#F1F5F9]">
                  {bookingState.selectedPackage.name}
                </span>
              </div>
              <div className="text-right">
                <span className="type-price text-xl font-bold text-[#38BDF8]">
                  {bookingState.depositAmount.toLocaleString()} MMK
                </span>
                <span className="block font-ui text-xs text-[#7E8F9F]">
                  {config.currencyRate}
                </span>
              </div>
            </div>

            {/* Payment Channel Tabs (KBZPay / WavePay / AYA Pay) */}
            <div>
              <label className="block font-ui text-xs text-[#94A3B8] uppercase tracking-wider mb-2 font-semibold">
                Select Transfer Gateway
              </label>
              <div className="grid grid-cols-3 gap-2 font-ui text-xs">
                {gateways.map((gw) => {
                  const isActive =
                    currentGateway === gw ||
                    (gw === 'AYA Pay' && currentGateway === 'CB / AYA');
                  const brand = getPaymentBrand(gw);
                  return (
                    <button
                      key={gw}
                      type="button"
                      id={`modal-gateway-tab-${gw.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      onClick={() => onSelectGateway(gw)}
                      className={`py-2 px-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer card-action-interactive ${
                        isActive
                          ? 'border border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                          : 'border border-[#1E3A4F] bg-[#101C2C] hover:border-[#38BDF8]/50 text-[#7E8F9F] hover:text-[#F1F5F9]'
                      }`}
                    >
                      <div className="bg-white px-1.5 py-0.5 rounded-[4px] border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
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
            </div>

            {/* QR Code Matrix Display Card */}
            <div className="bg-[#101C2C] border border-[#1E3A4F] rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center relative font-ui">
              {/* Selected Payment Brand Identity Badge */}
              <div className="flex items-center gap-2 mb-3 bg-[#071423] border border-[#1E3A4F] rounded-lg px-3 py-1.5 shadow-sm">
                <div className="bg-white px-2 py-0.5 rounded-[4px] border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
                  <img
                    src={currentBrand.logo}
                    alt={currentBrand.displayName}
                    className={`${
                      currentBrand.aspectRatio === 'square'
                        ? 'h-4 w-4'
                        : 'h-3 max-w-[65px]'
                    } object-contain`}
                  />
                </div>
                <div className="text-left min-w-0">
                  <span className="block font-ui text-xs font-bold text-[#F1F5F9] truncate">
                    {currentBrand.displayName}
                  </span>
                  <span className="block font-ui text-[10px] text-[#7E8F9F]">
                    Studio Settlement Destination
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-zinc-300 relative shadow-md">
                {/* Stylized QR Display Mockup */}
                <svg
                  className="w-40 h-40 text-[#071423]"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  {/* Corner Finder Pattern TL */}
                  <rect x="5" y="5" width="26" height="26" fill="black" rx="4" />
                  <rect x="9" y="9" width="18" height="18" fill="white" rx="2" />
                  <rect x="13" y="13" width="10" height="10" fill="black" rx="1" />
                  {/* Corner Finder Pattern TR */}
                  <rect x="69" y="5" width="26" height="26" fill="black" rx="4" />
                  <rect x="73" y="9" width="18" height="18" fill="white" rx="2" />
                  <rect x="77" y="13" width="10" height="10" fill="black" rx="1" />
                  {/* Corner Finder Pattern BL */}
                  <rect x="5" y="69" width="26" height="26" fill="black" rx="4" />
                  <rect x="9" y="73" width="18" height="18" fill="white" rx="2" />
                  <rect x="13" y="77" width="10" height="10" fill="black" rx="1" />
                  {/* Mock Cyber Matrix Data Bits */}
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
                {/* Center Branding Stamp */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-2 py-0.5 rounded bg-[#071423] text-[#38BDF8] font-ui font-bold text-[9px] border border-[#38BDF8]/40 shadow">
                    {currentBrand.displayName}
                  </div>
                </div>
              </div>

              <p className="font-ui text-xs text-[#94A3B8] mt-3 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
                {config.appInstruction}
              </p>
            </div>

            {/* Account Number & Direct Copy Box */}
            <div className="space-y-2.5 font-ui">
              <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="block font-ui text-[10px] text-[#7E8F9F] uppercase">
                    Beneficiary Name
                  </span>
                  <span className="font-ui text-xs font-semibold text-[#F1F5F9]">
                    {config.accountName}
                  </span>
                </div>
                <span className="font-ui text-[10px] text-[#38BDF8] px-2 py-0.5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 font-semibold tracking-wider uppercase">
                  Studio Account
                </span>
              </div>

              <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-3 flex items-center justify-between group hover:border-[#38BDF8]/50 transition-colors">
                <div>
                  <span className="block font-ui text-[10px] text-[#7E8F9F] uppercase">
                    {currentBrand.accountTypeLabel}
                  </span>
                  <span className="font-mono-code text-sm font-bold text-[#38BDF8] tracking-wider">
                    {config.accountNumber}
                  </span>
                </div>
                {/* Copy Button */}
                <button
                  type="button"
                  id="copy-modal-account-btn"
                  onClick={handleCopy}
                  className="btn-secondary-action !min-h-[34px] !py-1.5 !px-3 !text-xs font-ui"
                  title="Copy beneficiary account number"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#34D399]" />
                      <span className="text-[#34D399]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span>Copy Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Action Confirmation */}
            <div className="pt-1 font-ui">
              <button
                type="button"
                id="confirm-transfer-btn"
                onClick={handleComplete}
                className="btn-primary-action w-full !h-12 !text-sm font-ui font-bold tracking-wide"
              >
                <span>I Have Completed Transfer</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              <p className="font-ui text-xs text-center text-[#7E8F9F] mt-2">
                Save transfer screenshot to attach in next step (Slip OCR).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
