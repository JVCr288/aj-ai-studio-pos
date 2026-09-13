import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WorkspaceView, AtmosphereTheme } from '../types';
import { ATMOSPHERE_OPTIONS } from '../data/atmosphereData';
import {
  X,
  Settings as SettingsIcon,
  Monitor,
  Maximize2,
  Minimize2,
  Check,
  Palette,
  Shield,
  Layers,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { SUPPORTED_PAYMENT_GATEWAYS, getPaymentBrand } from '../utils/paymentBrands';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceView: WorkspaceView;
  onSelectWorkspaceView: (view: WorkspaceView) => void;
  atmosphere: AtmosphereTheme;
  onSelectAtmosphere: (theme: AtmosphereTheme) => void;
  onLaunchOnboardingSetup?: () => void;
  onLaunchDeveloperReview?: () => void;
  onLaunchMapperPreview?: () => void;
  onLaunchAdminBookings?: () => void;
}

type SettingsTab = 'appearance' | 'workstation' | 'security' | 'payment';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  workspaceView,
  onSelectWorkspaceView,
  atmosphere,
  onSelectAtmosphere,
  onLaunchOnboardingSetup,
  onLaunchDeveloperReview,
  onLaunchMapperPreview,
  onLaunchAdminBookings,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [isMounted, setIsMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Body scroll lock without layout shift
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isMounted || !isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      {/* Smoked Backdrop */}
      <div
        className="fixed inset-0 bg-[#02070E]/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="w-full max-w-2xl glass-level-3 copper-reflection rounded-2xl overflow-hidden relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[calc(100dvh-2rem)] flex flex-col border border-[#1E3A4F] bg-[#071423]/95 backdrop-blur-2xl">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E3A4F] bg-[#030F1E]/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2 text-[11px] font-ui text-[#7E8F9F]">
                <span>Studio Workstation</span>
                <span>•</span>
                <span className="text-[#38BDF8] font-medium">Pipeline Settings</span>
              </div>
              <h2
                id="settings-modal-title"
                className="font-ui font-bold text-base sm:text-lg text-[#F1F5F9] leading-tight mt-0.5"
              >
                Settings &amp; Preferences
              </h2>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0B1B2B] hover:bg-[#102538] border border-[#1E3A4F] hover:border-[#38BDF8]/60 text-[#7E8F9F] hover:text-[#F1F5F9] transition-all cursor-pointer workstation-focus"
            title="Close Settings (Escape)"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Breadcrumb / Tabs */}
        <div className="flex items-center border-b border-[#1E3A4F] bg-[#050E18] px-5 text-xs font-ui">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`py-3 px-3 flex items-center space-x-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-[#38BDF8] text-[#38BDF8]'
                : 'border-transparent text-[#7E8F9F] hover:text-[#F1F5F9]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workstation')}
            className={`py-3 px-3 flex items-center space-x-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'workstation'
                ? 'border-[#38BDF8] text-[#38BDF8]'
                : 'border-transparent text-[#7E8F9F] hover:text-[#F1F5F9]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Workstation &amp; Node</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 flex items-center space-x-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'border-[#38BDF8] text-[#38BDF8]'
                : 'border-transparent text-[#7E8F9F] hover:text-[#F1F5F9]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security &amp; Trust</span>
          </button>

          <button
            type="button"
            id="settings-tab-payment-btn"
            onClick={() => setActiveTab('payment')}
            className={`py-3 px-3 flex items-center space-x-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'payment'
                ? 'border-[#38BDF8] text-[#38BDF8]'
                : 'border-transparent text-[#7E8F9F] hover:text-[#F1F5F9]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Channels</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Breadcrumb Indicator */}
              <div className="flex items-center space-x-2 text-xs font-ui text-[#7E8F9F]">
                <span>Settings</span>
                <span>→</span>
                <span className="text-[#94A3B8]">Appearance</span>
                <span>→</span>
                <span className="text-[#38BDF8] font-medium">Workspace View</span>
              </div>

              {/* 1. WORKSPACE VIEW SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-ui font-bold text-sm text-[#F1F5F9]">
                      Workspace View
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Configure desktop presentation width and card concentration.
                    </p>
                  </div>
                  <span className="font-ui text-[10px] text-[#38BDF8] px-2 py-0.5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30">
                    Saved in browser
                  </span>
                </div>

                {/* 2 Selectable Options: Compact — Default vs Full */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Option 1: Compact — Default */}
                  <div
                    id="workspace-view-option-compact"
                    onClick={() => onSelectWorkspaceView('compact')}
                    className={`p-4 rounded-xl transition-all cursor-pointer card-action-interactive flex flex-col justify-between ${
                      workspaceView === 'compact'
                        ? 'glass-selected border-[#38BDF8]'
                        : 'glass-level-2 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Minimize2 className="w-4 h-4 text-[#38BDF8]" />
                          <span className="badge-copper !text-[9px]">
                            DEFAULT
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            workspaceView === 'compact'
                              ? 'border-[#38BDF8] bg-[#38BDF8] text-[#071423]'
                              : 'border-[#1E3A4F]'
                          }`}
                        >
                          {workspaceView === 'compact' && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>
                      </div>

                      <h4 className="font-ui font-bold text-sm text-[#F1F5F9] mb-1">
                        Compact — Default
                      </h4>
                      <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">
                        Represents the ~1/2-screen workstation view (~1240px max width). Concentrates card layout, calendar proportions, and reading density.
                      </p>
                    </div>

                    {/* Miniature Layout Diagram: Compact */}
                    <div className="p-2.5 rounded-lg glass-recessed border border-[rgba(90,150,180,0.12)] flex items-center justify-center gap-1.5">
                      <div className="w-12 h-8 rounded bg-[#102538] border border-[#38BDF8]/40 flex items-center justify-center text-[9px] font-ui text-[#38BDF8] font-semibold">
                        Col 1
                      </div>
                      <div className="w-12 h-8 rounded bg-[#102538] border border-[#38BDF8]/40 flex items-center justify-center text-[9px] font-ui text-[#38BDF8] font-semibold">
                        Col 2
                      </div>
                      <div className="w-12 h-8 rounded bg-[#102538] border border-[#38BDF8]/40 flex items-center justify-center text-[9px] font-ui text-[#38BDF8] font-semibold">
                        Col 3
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Full */}
                  <div
                    id="workspace-view-option-full"
                    onClick={() => onSelectWorkspaceView('full')}
                    className={`p-4 rounded-xl transition-all cursor-pointer card-action-interactive flex flex-col justify-between ${
                      workspaceView === 'full'
                        ? 'glass-selected border-[#38BDF8]'
                        : 'glass-level-2 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Maximize2 className="w-4 h-4 text-[#38BDF8]" />
                          <span className="font-ui text-[9px] px-1.5 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 font-semibold">
                            Widescreen
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            workspaceView === 'full'
                              ? 'border-[#38BDF8] bg-[#38BDF8] text-[#071423]'
                              : 'border-[#1E3A4F]'
                          }`}
                        >
                          {workspaceView === 'full' && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>
                      </div>

                      <h4 className="font-ui font-bold text-sm text-[#F1F5F9] mb-1">
                        Full
                      </h4>
                      <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">
                        Expands the workstation to use available widescreen viewport width (~1720px max width) with wider columns and extended breathing room.
                      </p>
                    </div>

                    {/* Miniature Layout Diagram: Full */}
                    <div className="p-2.5 rounded-lg glass-recessed border border-[rgba(90,150,180,0.12)] flex items-center justify-between gap-1">
                      <div className="flex-1 h-8 rounded bg-[#102538] border border-[#38BDF8]/40 flex items-center justify-center text-[9px] font-ui text-[#38BDF8] font-semibold">
                        Col 1 (Expanded)
                      </div>
                      <div className="flex-1 h-8 rounded bg-[#102538] border border-[#38BDF8]/40 flex items-center justify-center text-[9px] font-ui text-[#38BDF8] font-semibold">
                        Col 2
                      </div>
                      <div className="flex-1 h-8 rounded bg-[#102538] border border-[#38BDF8]/40 flex items-center justify-center text-[9px] font-ui text-[#38BDF8] font-semibold">
                        Col 3
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg glass-recessed text-xs font-ui text-[#7E8F9F] flex items-center justify-between">
                  <span className="font-medium">Responsive rule:</span>
                  <span className="text-[#94A3B8]">
                    Narrower laptop, tablet &amp; mobile viewports naturally adapt to full width.
                  </span>
                </div>

                {/* Controlled Development Entry Points: Studio Onboarding Setup, Developer Review & Mapper Preview */}
                {(onLaunchOnboardingSetup || onLaunchDeveloperReview || onLaunchMapperPreview) && (
                  <div className="p-3.5 rounded-xl bg-[#030F1E] border border-[#38BDF8]/30 flex flex-col gap-3">
                    <div>
                      <div className="font-ui font-bold text-xs text-[#F1F5F9] flex items-center space-x-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>Studio Onboarding Portal &amp; Admin Review Tools</span>
                      </div>
                      <p className="text-[11px] text-[#7E8F9F] mt-0.5">
                        Development utilities for studio onboarding setup (schema v1.0), immutable snapshot review console, and approved configuration mapper preview.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {onLaunchOnboardingSetup && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLaunchOnboardingSetup();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Launch Setup
                        </button>
                      )}

                      {onLaunchDeveloperReview && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLaunchDeveloperReview();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#FBBF24] hover:bg-[#F59E0B] text-[#071423] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Review Console
                        </button>
                      )}

                      {onLaunchMapperPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLaunchMapperPreview();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Config Mapper Preview
                        </button>
                      )}

                      {onLaunchAdminBookings && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLaunchAdminBookings();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Admin Booking Operations
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. ATMOSPHERE PRESETS SECTION */}
              <div className="space-y-3 pt-4 border-t border-[#1E3A4F]/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-ui font-bold text-sm text-[#F1F5F9]">
                      Studio Atmosphere Presets
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Volumetric background lighting &amp; optical mist environment.
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 font-ui text-xs text-[#7E8F9F]">
                    <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>5 Themes</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-ui">
                  {ATMOSPHERE_OPTIONS.map((opt) => {
                    const isSelected = atmosphere === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelectAtmosphere(opt.id)}
                        className={`p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#102538] border border-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                            : 'glass-recessed border border-[#1E3A4F]/60 hover:border-[#38BDF8]/40 text-[#94A3B8] hover:text-[#F1F5F9]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span
                            className="w-5 h-5 rounded-md border border-white/20 shadow-inner shrink-0"
                            style={{ background: opt.swatchGradient }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs text-[#7E8F9F] font-medium">
                                {opt.index}
                              </span>
                              <span
                                className={`font-ui text-xs font-semibold truncate ${
                                  isSelected ? 'text-[#38BDF8]' : 'text-[#F1F5F9]'
                                }`}
                              >
                                {opt.name}
                              </span>
                            </div>
                            <p className="text-[11px] font-ui text-[#7E8F9F] truncate">
                              {opt.descriptor}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workstation' && (
            <div className="space-y-4 font-ui text-xs">
              <div className="p-3.5 rounded-xl glass-recessed space-y-2">
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Studio Facility:</span>
                  <span className="text-[#F1F5F9] font-medium">
                    AKK Photo Studio • Yangon Flagship (Pilot Tenant)
                  </span>
                </div>
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Timezone Reference:</span>
                  <span className="text-[#38BDF8] font-medium">UTC+06:30 (MMT)</span>
                </div>
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Workstation View Active:</span>
                  <span className="text-[#34D399] font-semibold capitalize">
                    {workspaceView} mode
                  </span>
                </div>
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Atmosphere Active:</span>
                  <span className="text-[#F1F5F9] capitalize">
                    {atmosphere.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[#1E3A4F] text-xs text-[#7E8F9F] space-y-1">
                <div className="text-[#38BDF8] font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Reduced motion accessibility</span>
                </div>
                <p className="text-[#94A3B8]">
                  Atmospheric drift animations and moving edge reflections automatically obey operating system accessibility preferences.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 font-ui text-xs">
              <div className="p-3.5 rounded-xl glass-recessed space-y-2">
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Payment Trust Pipeline:</span>
                  <span className="text-[#34D399] font-medium">
                    OCR Extracted • Ledger Review Pending
                  </span>
                </div>
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Biometric Vault Gate:</span>
                  <span className="text-[#38BDF8]">
                    Client-Side Passkey (WebAuthn)
                  </span>
                </div>
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Encryption Standard:</span>
                  <span className="text-[#F1F5F9]">256-Bit SSL Pipeline</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-5 font-ui">
              {/* Breadcrumb Indicator */}
              <div className="flex items-center space-x-2 text-xs text-[#7E8F9F]">
                <span>Settings</span>
                <span>→</span>
                <span className="text-[#F1F5F9] font-medium">Payment Configuration</span>
              </div>

              <div>
                <h4 className="text-sm font-ui font-bold text-[#F1F5F9] mb-1">
                  Application-Owned Payment Brands
                </h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Pre-configured official brand identity assets for local Myanmar payment rails.
                  Studio accounts, QR codes, and routing parameters will be configured here by the studio owner.
                </p>
              </div>

              {/* Payment Brands List */}
              <div className="space-y-2.5">
                {SUPPORTED_PAYMENT_GATEWAYS.map((gw) => {
                  const brand = getPaymentBrand(gw);
                  return (
                    <div
                      key={gw}
                      id={`settings-payment-channel-${gw.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      className="p-3.5 rounded-xl border border-[#1E3A4F] bg-[#071423] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-white px-2.5 py-1 rounded-md border border-zinc-200/90 shadow-xs flex items-center justify-center shrink-0">
                          <img
                            src={brand.logo}
                            alt={brand.displayName}
                            className={`${
                              brand.aspectRatio === 'square'
                                ? 'h-5 w-5'
                                : 'h-3.5 max-w-[70px]'
                            } object-contain`}
                          />
                        </div>
                        <div>
                          <div className="font-ui text-xs font-bold text-[#F1F5F9]">
                            {brand.displayName}
                          </div>
                          <div className="font-ui text-[11px] text-[#7E8F9F]">
                            {brand.accountTypeLabel} • Application Asset
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-ui text-[10px] text-[#34D399] px-2 py-0.5 rounded bg-[#34D399]/10 border border-[#34D399]/30 font-medium">
                          Active Asset
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Architectural Architecture Notice */}
              <div className="p-3.5 bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl text-xs text-[#7E8F9F] space-y-1">
                <div className="text-[#38BDF8] font-semibold text-xs">
                  Payment Architecture Specification
                </div>
                <p className="text-xs leading-relaxed text-[#94A3B8]">
                  • Brand logos are bundled and owned by the AJ AI Studio application core.
                  <br />
                  • Studio owners are not required to upload or configure brand logos.
                  <br />
                  • Dynamic account details, beneficiary names, and custom payment limits will be managed in future studio administration controls.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#1E3A4F] bg-[#030F1E]/60 text-xs font-ui">
          <div className="flex items-center space-x-2 text-[#7E8F9F] text-xs">
            <span>Active view:</span>
            <span className="text-[#38BDF8] font-semibold">
              {workspaceView === 'compact' ? 'Compact (Default)' : 'Full (Widescreen)'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary-action !min-h-[34px] !py-1 !px-4 !text-xs font-ui font-semibold cursor-pointer"
          >
            <span>Done</span>
            <span>✓</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
