import React, { useState, useRef, useEffect } from 'react';
import { getHelpTip, HelpTipItem } from '../../content/helpTips';
import { Zap, AlertTriangle, X } from 'lucide-react';

export interface HelpTipProps {
  tipId: string;
  children?: React.ReactNode;
  className?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  badgePosition?: 'top-right' | 'top-left' | 'inline';
  customTitle?: string;
  customMm?: string;
  customWarning?: string;
}

export const HelpTip: React.FC<HelpTipProps> = ({
  tipId,
  children,
  className = '',
  placement = 'top',
  badgePosition = children ? 'top-right' : 'inline',
  customTitle,
  customMm,
  customWarning,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const tipData: HelpTipItem | undefined = getHelpTip(tipId);
  const title = customTitle || tipData?.title || tipId;
  const mm = customMm || tipData?.mm || '';
  const warning = customWarning || tipData?.warning;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!tipData && !customMm) {
    return <>{children}</>;
  }

  const isWarning = Boolean(warning);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center group/helptip ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Target Wrapped Child if present */}
      {children}

      {/* Accessible Help Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }}
        aria-label={`လမ်းညွှန်ချက်: ${title}`}
        aria-expanded={isOpen}
        title={`လမ်းညွှန်ချက်: ${title}`}
        className={`flex items-center justify-center rounded-full transition-all cursor-pointer shadow-md font-bold font-mono text-[10px] select-none ${
          children
            ? `absolute z-30 ${
                badgePosition === 'top-right'
                  ? '-top-2 -right-2 w-5 h-5'
                  : badgePosition === 'top-left'
                  ? '-top-2 -left-2 w-5 h-5'
                  : 'ml-1.5 w-4 h-4'
              }`
            : 'w-4 h-4 text-[9px] mx-1 inline-flex align-middle'
        } ${
          isWarning
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300'
            : 'bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 ring-1.5 ring-emerald-300'
        }`}
      >
        ?
      </button>

      {/* Floating Popover / Tooltip */}
      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-50 w-72 md:w-80 p-3.5 bg-slate-950/95 border text-slate-200 rounded-2xl shadow-2xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150 ${
            isWarning
              ? 'border-amber-500/70 shadow-amber-500/10'
              : 'border-emerald-500/60 shadow-emerald-500/10'
          } ${
            placement === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : placement === 'bottom'
              ? 'top-full mt-2 left-1/2 -translate-x-1/2'
              : placement === 'left'
              ? 'right-full mr-2 top-1/2 -translate-y-1/2'
              : 'left-full ml-2 top-1/2 -translate-y-1/2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>လမ်းညွှန်ချက် (Guide)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg transition-colors"
              aria-label="Close guide"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <h4 className="text-xs font-bold text-slate-100 mb-1.5 tracking-wide leading-tight">
            {title}
          </h4>

          {/* Burmese Explanation Body */}
          <div className="space-y-2 text-[11px] leading-relaxed">
            <p className="text-slate-300 font-normal">
              {mm}
            </p>

            {warning && (
              <div className="p-2 bg-amber-950/60 border border-amber-700/60 rounded-xl text-amber-200 text-[10.5px] flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[9px] text-slate-400 flex justify-between font-mono">
            <span>AJ Studio Desk</span>
            <span>ESC သို့မဟုတ် အပြင်ကို နှိပ်ပါ</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpTip;
