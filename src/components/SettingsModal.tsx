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
  BookOpen,
  Users,
  Plus,
  Key,
  Printer,
  DollarSign,
  Barcode,
  Send,
  RefreshCw,
  Image,
} from 'lucide-react';
import { HelpTip } from './ui/HelpTip';
import { SUPPORTED_PAYMENT_GATEWAYS, getPaymentBrand } from '../utils/paymentBrands';
import { StudioUserGuideModal } from './StudioUserGuideModal';

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
  onLaunchPosDesk?: () => void;
}

type SettingsTab = 'appearance' | 'workstation' | 'security' | 'payment' | 'guide' | 'staff';

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
  onLaunchPosDesk,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Staff management state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffMyanmarName, setNewStaffMyanmarName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('CASHIER');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [staffActionMsg, setStaffActionMsg] = useState<string | null>(null);
  const [resetPinId, setResetPinId] = useState<string | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');

  // Hardware & Telegram state
  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>(() => {
    return (localStorage.getItem('aj_printer_width') as '58mm' | '80mm') || '80mm';
  });
  const [cashDrawerAutoKick, setCashDrawerAutoKick] = useState<boolean>(() => {
    return localStorage.getItem('aj_cash_drawer_kick') !== 'false';
  });
  const [telegramChatId, setTelegramChatId] = useState<string>(() => {
    return localStorage.getItem('aj_telegram_chat_id') || '';
  });
  const [isDemoResetting, setIsDemoResetting] = useState(false);
  const [demoResetMessage, setDemoResetMessage] = useState<string | null>(null);

  const handlePrinterWidthChange = (val: '58mm' | '80mm') => {
    setPrinterWidth(val);
    localStorage.setItem('aj_printer_width', val);
  };

  const handleCashDrawerToggle = () => {
    const nextVal = !cashDrawerAutoKick;
    setCashDrawerAutoKick(nextVal);
    localStorage.setItem('aj_cash_drawer_kick', String(nextVal));
  };

  const handleSaveTelegram = () => {
    localStorage.setItem('aj_telegram_chat_id', telegramChatId);
    alert('Telegram Chat ID saved.');
  };

  const handleResetDemoSandbox = async () => {
    if (!window.confirm('Reset this demo studio back to fresh seed data? All custom transactions will be reseeded.')) return;
    setIsDemoResetting(true);
    setDemoResetMessage(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        setDemoResetMessage('Studio sandbox successfully reset! Reloading...');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setDemoResetMessage('Failed to reset sandbox.');
      }
    } catch {
      setDemoResetMessage('Network error during reset.');
    } finally {
      setIsDemoResetting(false);
    }
  };

  const loadStaff = async () => {
    setIsLoadingStaff(true);
    try {
      const res = await fetch('/api/pos/staff', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.staff)) {
          setStaffList(data.staff);
        }
      }
    } catch (err) {
      console.warn('Failed to load staff list:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'staff') {
      loadStaff();
    }
  }, [isOpen, activeTab]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPin.trim()) return;
    try {
      const res = await fetch('/api/pos/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStaffName.trim(),
          myanmarName: newStaffMyanmarName.trim(),
          role: newStaffRole,
          pin: newStaffPin.trim(),
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStaffActionMsg('Staff added successfully.');
        setNewStaffName('');
        setNewStaffMyanmarName('');
        setNewStaffPin('');
        loadStaff();
      } else {
        setStaffActionMsg(data.error || 'Failed to add staff.');
      }
    } catch {
      setStaffActionMsg('Error creating staff member.');
    }
  };

  const handleToggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/pos/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
        credentials: 'include',
      });
      if (res.ok) {
        setStaffActionMsg('Status updated.');
        loadStaff();
      }
    } catch {
      setStaffActionMsg('Error updating status.');
    }
  };

  const handleResetPin = async (staffId: string) => {
    if (!resetPinValue.trim() || resetPinValue.trim().length !== 4) {
      setStaffActionMsg('PIN must be 4 digits.');
      return;
    }
    try {
      const res = await fetch(`/api/pos/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: resetPinValue.trim() }),
        credentials: 'include',
      });
      if (res.ok) {
        setStaffActionMsg('PIN reset successfully.');
        setResetPinId(null);
        setResetPinValue('');
      } else {
        setStaffActionMsg('Failed to reset PIN.');
      }
    } catch {
      setStaffActionMsg('Error resetting PIN.');
    }
  };

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

          <button
            type="button"
            id="settings-tab-guide-btn"
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3 flex items-center space-x-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'guide'
                ? 'border-[#38BDF8] text-[#38BDF8]'
                : 'border-transparent text-[#7E8F9F] hover:text-[#F1F5F9]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1.5">
              <span>User Guide</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-mono">
                EN/MM
              </span>
            </span>
          </button>

          <button
            type="button"
            id="settings-tab-staff-btn"
            onClick={() => setActiveTab('staff')}
            className={`py-3 px-3 flex items-center space-x-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'staff'
                ? 'border-[#38BDF8] text-[#38BDF8]'
                : 'border-transparent text-[#7E8F9F] hover:text-[#F1F5F9]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>POS Staff</span>
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

                      {onLaunchPosDesk && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLaunchPosDesk();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Studio POS Desk Terminal
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
                    AJ Studio Desk • Flagship Edition
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

              {/* Hardware & Peripherals Configuration */}
              <div className="p-3.5 rounded-xl bg-[#0B1B2B] border border-[#1E3A4F] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#1E3A4F]">
                  <span className="font-bold text-[#F1F5F9] flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-[#38BDF8]" />
                    <span>POS Hardware &amp; Peripherals</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">WebUSB / Serial</span>
                </div>

                {/* Printer Width */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#94A3B8]">Receipt Roll Width</span>
                    <HelpTip tipId="settings-printer-width" />
                  </div>
                  <div className="flex items-center space-x-1.5 bg-[#030F1E] p-1 rounded-lg border border-[#1E3A4F]">
                    <button
                      type="button"
                      onClick={() => handlePrinterWidthChange('58mm')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        printerWidth === '58mm'
                          ? 'bg-[#38BDF8] text-[#071423]'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      58mm
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrinterWidthChange('80mm')}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        printerWidth === '80mm'
                          ? 'bg-[#38BDF8] text-[#071423]'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      80mm
                    </button>
                  </div>
                </div>

                {/* Cash Drawer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#94A3B8]">Cash Drawer Auto-Kick</span>
                    <HelpTip tipId="settings-cash-drawer" />
                  </div>
                  <button
                    type="button"
                    onClick={handleCashDrawerToggle}
                    className={`px-3 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                      cashDrawerAutoKick
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-700/30 text-slate-400 border-slate-600/40'
                    }`}
                  >
                    {cashDrawerAutoKick ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* Barcode Scanner */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#94A3B8]">Barcode Scanner (USB/Wedge)</span>
                    <HelpTip tipId="settings-barcode-scanner" />
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Listening
                  </span>
                </div>
              </div>

              {/* Studio Identity & Branding */}
              <div className="p-3.5 rounded-xl bg-[#0B1B2B] border border-[#1E3A4F] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#1E3A4F]">
                  <span className="font-bold text-[#F1F5F9] flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-[#38BDF8]" />
                    <span>Studio Identity &amp; Branding</span>
                    <HelpTip tipId="settings-studio-branding" />
                  </span>
                </div>
                <p className="text-[#94A3B8] text-[11px] leading-relaxed">
                  Studio display name and branding logo configured during onboarding are automatically reflected across customer booking links, receipts, and daily Z-Reports.
                </p>
              </div>

              {/* Telegram Notifications */}
              <div className="p-3.5 rounded-xl bg-[#0B1B2B] border border-[#1E3A4F] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#1E3A4F]">
                  <span className="font-bold text-[#F1F5F9] flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-[#38BDF8]" />
                    <span>Telegram Notifications</span>
                    <HelpTip tipId="settings-telegram-notifications" />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Enter Telegram Chat ID (e.g. -100...)"
                    className="flex-1 px-3 py-1.5 bg-[#030F1E] border border-[#1E3A4F] rounded-lg text-[#F1F5F9] text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTelegram}
                    className="px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Demo Sandbox Reset Section */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-300 text-xs">Demo Sandbox Reset</span>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      Reseeds this demo studio back to pristine 30-day realistic sample data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDemoSandbox}
                    disabled={isDemoResetting}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDemoResetting ? 'animate-spin' : ''}`} />
                    <span>{isDemoResetting ? 'Resetting...' : 'Reset Sandbox'}</span>
                  </button>
                </div>
                {demoResetMessage && (
                  <p className="text-[11px] text-amber-300 font-mono">{demoResetMessage}</p>
                )}
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
                  • Brand logos are bundled and owned by the AJ Studio Desk application core.
                  <br />
                  • Studio owners are not required to upload or configure brand logos.
                  <br />
                  • Dynamic account details, beneficiary names, and custom payment limits will be managed in future studio administration controls.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM USER GUIDE & OPERATIONS MANUAL */}
          {activeTab === 'guide' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Banner with mascot characters */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-purple-500/15 border border-[#38BDF8]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#030F1E] border border-sky-400/40 flex items-center justify-center text-3xl shadow-lg shrink-0">
                    📖
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-ui text-sm font-bold text-[#F1F5F9]">
                        AJ Studio Desk Operations Manual
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                        Bilingual EN / MM
                      </span>
                    </div>
                    <p className="font-ui text-xs text-slate-300/80 mt-1 max-w-lg">
                      Illustrated visual guide cards with studio characters covering POS desk, hardware, offline queue, shift handover, and staff security.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGuideModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-[#071423] font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0"
                >
                  <span>Open Full User Guide ↗</span>
                </button>
              </div>

              {/* Module Cards Roster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setIsGuideModalOpen(true)}
                  className="p-3.5 rounded-xl bg-[#0B1B2B] hover:bg-[#102538] border border-[#1E3A4F] hover:border-[#38BDF8]/40 transition-all cursor-pointer flex items-start space-x-3"
                >
                  <span className="text-2xl shrink-0">🧑‍💼</span>
                  <div>
                    <div className="text-xs font-bold text-[#F1F5F9] flex items-center justify-between">
                      <span>POS Desk &amp; Barcode</span>
                      <span className="text-[10px] text-sky-400 font-mono">Aung Kyaw</span>
                    </div>
                    <p className="text-[11px] text-[#7E8F9F] mt-0.5">
                      Fast checkout, retail SKU barcode scans, photography packages, split payments.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setIsGuideModalOpen(true)}
                  className="p-3.5 rounded-xl bg-[#0B1B2B] hover:bg-[#102538] border border-[#1E3A4F] hover:border-[#38BDF8]/40 transition-all cursor-pointer flex items-start space-x-3"
                >
                  <span className="text-2xl shrink-0">🖨️</span>
                  <div>
                    <div className="text-xs font-bold text-[#F1F5F9] flex items-center justify-between">
                      <span>Hardware &amp; Printing</span>
                      <span className="text-[10px] text-amber-400 font-mono">Ko Zin</span>
                    </div>
                    <p className="text-[11px] text-[#7E8F9F] mt-0.5">
                      Direct WebUSB ESC/POS thermal receipts and dual-pin automatic cash drawer kicks.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setIsGuideModalOpen(true)}
                  className="p-3.5 rounded-xl bg-[#0B1B2B] hover:bg-[#102538] border border-[#1E3A4F] hover:border-[#38BDF8]/40 transition-all cursor-pointer flex items-start space-x-3"
                >
                  <span className="text-2xl shrink-0">👩‍💼</span>
                  <div>
                    <div className="text-xs font-bold text-[#F1F5F9] flex items-center justify-between">
                      <span>Shift &amp; Cash Reconciliation</span>
                      <span className="text-[10px] text-rose-400 font-mono">Daw Khin</span>
                    </div>
                    <p className="text-[11px] text-[#7E8F9F] mt-0.5">
                      Cash drops, float top-up, live drawer discrepancy detection, and official Z-Reports.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setIsGuideModalOpen(true)}
                  className="p-3.5 rounded-xl bg-[#0B1B2B] hover:bg-[#102538] border border-[#1E3A4F] hover:border-[#38BDF8]/40 transition-all cursor-pointer flex items-start space-x-3"
                >
                  <span className="text-2xl shrink-0">👩‍💻</span>
                  <div>
                    <div className="text-xs font-bold text-[#F1F5F9] flex items-center justify-between">
                      <span>Staff PIN &amp; Override</span>
                      <span className="text-[10px] text-purple-400 font-mono">Su Myat</span>
                    </div>
                    <p className="text-[11px] text-[#7E8F9F] mt-0.5">
                      Fast 4-digit PIN numeric keypad, staff badge scan, and manager override popups.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-ui font-bold text-sm text-[#F1F5F9]">
                    POS Staff &amp; Terminal Access
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Manage active staff rosters, configure permission roles, and reset 4-digit PINs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadStaff}
                  className="text-xs text-[#38BDF8] hover:underline"
                >
                  Refresh
                </button>
              </div>

              {staffActionMsg && (
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300">
                  {staffActionMsg}
                </div>
              )}

              {/* Add New Staff Member Form */}
              <form onSubmit={handleCreateStaff} className="p-4 rounded-xl bg-[#0B1B2B] border border-[#1E3A4F] space-y-3">
                <div className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Add New Staff Member</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[#94A3B8] mb-1">Name (English)</label>
                    <input
                      type="text"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="e.g. Aung Kyaw"
                      required
                      className="w-full px-3 py-1.5 bg-[#030F1E] border border-[#1E3A4F] rounded-lg text-[#F1F5F9]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] mb-1">Name (Myanmar)</label>
                    <input
                      type="text"
                      value={newStaffMyanmarName}
                      onChange={(e) => setNewStaffMyanmarName(e.target.value)}
                      placeholder="e.g. အောင်ကျော်"
                      className="w-full px-3 py-1.5 bg-[#030F1E] border border-[#1E3A4F] rounded-lg text-[#F1F5F9]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] mb-1">Role</label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#030F1E] border border-[#1E3A4F] rounded-lg text-[#F1F5F9]"
                    >
                      <option value="CASHIER">Cashier</option>
                      <option value="LEAD_CASHIER">Lead Cashier</option>
                      <option value="STUDIO_MANAGER">Studio Manager</option>
                      <option value="OWNER">Owner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] mb-1">4-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]{4}"
                      value={newStaffPin}
                      onChange={(e) => setNewStaffPin(e.target.value)}
                      placeholder="4 digits"
                      required
                      className="w-full px-3 py-1.5 bg-[#030F1E] border border-[#1E3A4F] rounded-lg text-[#F1F5F9]"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#38BDF8] text-[#030F1E] font-bold text-xs rounded-lg hover:bg-[#38BDF8]/90 transition-colors"
                  >
                    Add Staff
                  </button>
                </div>
              </form>

              {/* Staff List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#94A3B8]">Current Staff Roster</div>
                {isLoadingStaff ? (
                  <div className="text-xs text-[#7E8F9F] py-2">Loading staff roster...</div>
                ) : staffList.length === 0 ? (
                  <div className="text-xs text-[#7E8F9F] py-2">No staff members configured.</div>
                ) : (
                  <div className="space-y-2">
                    {staffList.map((stf) => (
                      <div
                        key={stf.id}
                        className="p-3 rounded-xl bg-[#0B1B2B] border border-[#1E3A4F] flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ backgroundColor: stf.avatarColor || '#38BDF8' }}
                          >
                            {stf.name?.[0] || 'S'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#F1F5F9] flex items-center gap-2">
                              <span>{stf.name}</span>
                              {stf.myanmarName && (
                                <span className="text-[11px] text-[#94A3B8] font-normal">
                                  ({stf.myanmarName})
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E3A4F] text-[#38BDF8] font-mono">
                                {stf.role}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#7E8F9F]">
                              ID: {stf.id} {stf.isActive ? '• Active' : '• Deactivated'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {resetPinId === stf.id ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="password"
                                maxLength={4}
                                placeholder="New PIN"
                                value={resetPinValue}
                                onChange={(e) => setResetPinValue(e.target.value)}
                                className="w-20 px-2 py-1 bg-[#030F1E] border border-[#1E3A4F] rounded text-xs text-[#F1F5F9]"
                              />
                              <button
                                type="button"
                                onClick={() => handleResetPin(stf.id)}
                                className="px-2 py-1 bg-sky-500 text-white rounded text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetPinId(null);
                                  setResetPinValue('');
                                }}
                                className="px-1 text-xs text-gray-400"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setResetPinId(stf.id)}
                              className="px-2 py-1 text-xs rounded border border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-sky-500/40 flex items-center gap-1"
                            >
                              <Key className="w-3 h-3" />
                              <span>Reset PIN</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleStaffStatus(stf.id, stf.isActive)}
                            className={`px-2 py-1 text-xs rounded border ${
                              stf.isActive
                                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            {stf.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* System Interactive User Guide Modal */}
      <StudioUserGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        defaultModule="overview"
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};
