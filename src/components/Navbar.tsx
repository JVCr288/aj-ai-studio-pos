import React, { useState, useEffect } from 'react';
import { ScreenStep, WorkspaceView } from '../types';
import {
  RotateCcw,
  Clock,
  Maximize2,
  Minimize2,
  Settings,
  Shield,
} from 'lucide-react';

interface NavbarProps {
  currentScreen: ScreenStep;
  onSelectScreen: (screen: ScreenStep) => void;
  onReset: () => void;
  manifestId: string;
  workspaceView?: WorkspaceView;
  onToggleWorkspaceView?: () => void;
  onOpenSettings?: () => void;
  onOpenAdminBookings?: () => void;
  isAdminAuthenticated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onSelectScreen,
  onReset,
  manifestId,
  workspaceView = 'compact',
  onToggleWorkspaceView,
  onOpenSettings,
  onOpenAdminBookings,
  isAdminAuthenticated = false,
}) => {
  const [timecode, setTimecode] = useState<string>('');
  const [isConfirmingReset, setIsConfirmingReset] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTimecode(`${h}:${m}:${s} MMT`);
    };
    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Auto-dismiss reset confirmation after 4 seconds
  useEffect(() => {
    if (!isConfirmingReset) return;
    const timer = setTimeout(() => setIsConfirmingReset(false), 4000);
    return () => clearTimeout(timer);
  }, [isConfirmingReset]);

  const steps: { step: ScreenStep; label: string; subLabel: string }[] = [
    { step: 1, label: 'Booking', subLabel: 'ဘိုကင်' },
    { step: 2, label: 'Payment', subLabel: 'ငွေပေးချေမှု' },
    { step: 3, label: 'Verify', subLabel: 'စလစ်စစ်ဆေးမှု' },
    { step: 4, label: 'Pass', subLabel: 'ဝင်ခွင့်ကတ်' },
    { step: 5, label: 'Vault', subLabel: 'ဓာတ်ပုံများ' },
    { step: 6, label: 'Store & Gear', subLabel: 'ပစ္စည်းနှင့်အရောင်း' },
  ];

  return (
    <header className="w-full border-b border-[#1E3A4F] bg-[#030F1E] sticky top-0 z-50 select-none">
      <div
        className={`w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between transition-[max-width] duration-300 ${
          workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
        }`}
      >
        {/* Left Zone: Brand & Studio Identity */}
        <div
          className="flex items-center space-x-2.5 cursor-pointer group shrink-0 mr-2 lg:mr-4"
          onClick={() => onSelectScreen(0)}
          title="Return to Studio Landing Portal"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectScreen(0);
            }
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-[#102538] border border-[#1E3A4F] group-hover:border-[#38BDF8] flex items-center justify-center relative overflow-hidden transition-colors shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-space font-bold text-sm tracking-wide text-[#F1F5F9] group-hover:text-[#38BDF8] transition-colors">
                AJ AI STUDIO
              </span>
              <span className="h-3 w-px bg-[#1E3A4F] hidden sm:inline" />
              <span className="hidden sm:inline text-xs text-[#38BDF8] font-ui font-medium">
                Studio Operations Platform
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-[#64748B] font-ui">
              <span className="text-[#94A3B8]">Active Studio: <strong className="text-[#F1F5F9] font-medium">AKK Photo Studio</strong> · Pilot Tenant</span>
              <span className="text-[#1E3A4F]">•</span>
              <span className="text-[#34D399] font-medium text-[10px]">Online</span>
            </div>
          </div>
        </div>

        {/* Center Zone: Primary Workflow Navigation (Desktop & Tablet) */}
        {currentScreen > 0 ? (
          <nav
            className="hidden md:flex items-center space-x-1 font-ui text-xs bg-[#071423]/90 p-1 rounded-xl border border-[#1E3A4F]/80 backdrop-blur-md mx-auto"
            aria-label="Workflow Navigation"
          >
            {steps.map(({ step, label, subLabel }) => {
              const isActive = currentScreen === step;
              return (
                <button
                  key={step}
                  type="button"
                  id={`navbar-step-${step}`}
                  onClick={() => onSelectScreen(step)}
                  title={`${label} (${subLabel})`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`interactive-nav ${isActive ? 'interactive-nav-active' : ''}`}
                >
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden md:flex items-center space-x-2 font-ui text-xs text-[#94A3B8] bg-[#071423]/60 px-3.5 py-1.5 rounded-xl border border-[#1E3A4F]/60 mx-auto">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
            <span className="font-semibold text-slate-200">Public Studio Portal</span>
          </div>
        )}

        {/* Right Zone: Passive Status + Utility Actions + Guarded Reset */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {/* Group 1: Passive Status (Time & Node) */}
          <div className="flex items-center space-x-1.5">
            {timecode && (
              <div
                className="hidden xl:flex status-passive"
                title="Yangon Studio Local Timecode (UTC+06:30)"
              >
                <Clock className="w-3 h-3 text-[#38BDF8]" />
                <span className="font-mono tabular-nums">{timecode}</span>
              </div>
            )}

            <div
              className="hidden lg:flex status-passive"
              title="Workstation Node Status"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
              <span>Node 01</span>
            </div>
          </div>

          {/* Vertical Separator */}
          <div className="hidden lg:block h-4 w-px bg-[#1E3A4F]/80" />

          {/* Group 2: Utility Actions (Workspace Toggle & Settings) */}
          <div className="flex items-center space-x-1.5">
            {/* Quick Workspace View Toggle (Compact <-> Full) */}
            {onToggleWorkspaceView && (
              <button
                type="button"
                id="workspace-quick-toggle-btn"
                onClick={onToggleWorkspaceView}
                className="interactive-control p-1.5 workstation-focus"
                title={workspaceView === 'compact' ? 'Expand Workspace' : 'Compact Workspace'}
                aria-label={workspaceView === 'compact' ? 'Expand Workspace' : 'Compact Workspace'}
              >
                {workspaceView === 'compact' ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
                <span className="hidden 2xl:inline text-[11px] font-medium">
                  {workspaceView === 'compact' ? 'Compact' : 'Full'}
                </span>
              </button>
            )}

            {/* Studio Settings Trigger Button */}
            {onOpenSettings && (
              <button
                type="button"
                id="navbar-open-settings-btn"
                onClick={onOpenSettings}
                className="interactive-control px-2.5 py-1.5 workstation-focus"
                title="Studio Settings (Appearance & System)"
                aria-label="Studio Settings"
              >
                <Settings className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="hidden sm:inline text-xs font-medium">Settings</span>
              </button>
            )}

            {/* Role-Protected Booking Operations Entry (Visible only on workstation, NOT step 0 public landing or /setup) */}
            {currentScreen > 0 && onOpenAdminBookings && (
              <button
                type="button"
                id="navbar-booking-desk-btn"
                onClick={onOpenAdminBookings}
                className="interactive-control px-2.5 py-1.5 workstation-focus border border-[#38BDF8]/40 hover:border-[#38BDF8] bg-[#38BDF8]/10 text-[#38BDF8]"
                title="Studio Booking Operations Desk (Role Protected)"
                aria-label="Booking Desk"
              >
                <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="hidden sm:inline text-xs font-semibold">Booking Desk</span>
              </button>
            )}
          </div>

          {/* Vertical Separator */}
          <div className="h-4 w-px bg-[#1E3A4F]/80" />

          {/* Group 3: Destructive Action (Reset with Confirmation Guard) */}
          <div className="relative">
            {isConfirmingReset ? (
              <div className="flex items-center gap-1 bg-[#1A0D15] border border-rose-500/50 rounded-lg p-0.5 animate-in fade-in duration-150 shadow-lg shadow-rose-950/40">
                <span className="text-[11px] text-rose-300 font-ui px-1.5 font-medium">
                  Reset pipeline?
                </span>
                <button
                  type="button"
                  id="navbar-confirm-reset-btn"
                  onClick={() => {
                    setIsConfirmingReset(false);
                    onReset();
                  }}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-ui font-semibold text-[11px] transition-colors cursor-pointer"
                  title="Confirm reset"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(false)}
                  className="px-1.5 py-0.5 rounded hover:bg-white/10 text-[#94A3B8] font-ui text-[11px] transition-colors cursor-pointer"
                  title="Cancel reset"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="navbar-reset-pipeline-btn"
                onClick={() => setIsConfirmingReset(true)}
                className="control-destructive px-2.5 py-1.5 workstation-focus"
                title="Reset reservation pipeline back to Booking Screen"
                aria-label="Reset Pipeline"
              >
                <RotateCcw className="w-3 h-3 text-[#7E8F9F] group-hover:text-rose-400" />
                <span className="hidden sm:inline text-xs font-medium">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Workflow Navigation Strip (< md) */}
      <nav
        className="flex md:hidden w-full overflow-x-auto border-t border-[#1E3A4F]/60 bg-[#071423]/95 px-3 py-1.5 gap-1 scrollbar-none"
        aria-label="Mobile Workflow Navigation"
      >
        {steps.map(({ step, label, subLabel }) => {
          const isActive = currentScreen === step;
          return (
            <button
              key={step}
              type="button"
              id={`mobile-navbar-step-${step}`}
              onClick={() => onSelectScreen(step)}
              title={`${label} (${subLabel})`}
              aria-current={isActive ? 'page' : undefined}
              className={`interactive-nav text-xs shrink-0 py-1 px-2.5 ${
                isActive ? 'interactive-nav-active' : ''
              }`}
            >
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              )}
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
