import React from 'react';
import { ScreenStep, AtmosphereTheme, WorkspaceView } from '../types';
import { ShieldCheck, Settings } from 'lucide-react';
import { AtmosphereSelector } from './AtmosphereSelector';

interface FooterProps {
  atmosphere: AtmosphereTheme;
  onSelectAtmosphere: (atmosphere: AtmosphereTheme) => void;
  currentScreen: ScreenStep;
  manifestId?: string;
  clientPhone?: string;
  workspaceView?: WorkspaceView;
  onOpenSettings?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  atmosphere,
  onSelectAtmosphere,
  currentScreen,
  manifestId = '#NOCT-2026-09',
  clientPhone,
  workspaceView = 'compact',
  onOpenSettings,
}) => {
  return (
    <footer className="w-full border-t border-[#1E3A4F] bg-[#030F1E]/90 backdrop-blur-md py-1.5 sm:py-2 px-4 sm:px-6 mt-auto transition-colors duration-300 select-none relative z-20">
      <div
        className={`w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-ui text-[#7E8F9F] transition-[max-width] duration-300 ${
          workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
        }`}
      >
        {/* Left Studio System Status */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#F1F5F9] tracking-tight">
              AJ AI Studio Platform
            </span>
            <span className="text-[#1E3A4F]">•</span>
            <span className="text-xs text-[#94A3B8]">
              {currentScreen === 1 && 'Atelier Reservation & Bay Schematic'}
              {currentScreen === 2 && 'Payment Gateway Pipeline'}
              {currentScreen === 3 && 'Optical Slip Audit & Reconciliation'}
              {currentScreen === 4 && (clientPhone ? `Dispatched to ${clientPhone}` : 'Bay Access Pass')}
              {currentScreen === 5 && 'Archive Vault & Deliverables'}
              {currentScreen === 6 && 'Studio Gear & Client Retail Boutique'}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#0B1B2B] border border-[#1E3A4F] text-xs text-[#94A3B8]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Session <span className="font-mono-code text-[#CBD5E1] font-semibold">{manifestId}</span></span>
          </div>
        </div>

        {/* Right Settings & Atmosphere Preset Selector */}
        <div className="flex items-center space-x-2">
          {onOpenSettings && (
            <button
              type="button"
              id="footer-open-settings-btn"
              onClick={onOpenSettings}
              className="px-2.5 py-1 rounded-lg bg-[#0B1B2B] hover:bg-[#102538] border border-[#1E3A4F] hover:border-[#38BDF8]/60 text-[#94A3B8] hover:text-[#F1F5F9] font-ui text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 workstation-focus"
              title="Studio Settings (Appearance & System)"
              aria-label="Studio Settings"
            >
              <Settings className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="hidden xs:inline">Settings</span>
            </button>
          )}

          <AtmosphereSelector
            atmosphere={atmosphere}
            onSelectAtmosphere={onSelectAtmosphere}
            direction="up"
          />
        </div>
      </div>
    </footer>
  );
};
