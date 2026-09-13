import React, { useState, useRef, useEffect } from 'react';
import { AtmosphereTheme } from '../types';
import { ATMOSPHERE_OPTIONS } from '../data/atmosphereData';
import { ChevronUp, Check, Layers } from 'lucide-react';

interface AtmosphereSelectorProps {
  atmosphere: AtmosphereTheme;
  onSelectAtmosphere: (theme: AtmosphereTheme) => void;
  direction?: 'up' | 'down';
}

export const AtmosphereSelector: React.FC<AtmosphereSelectorProps> = ({
  atmosphere,
  onSelectAtmosphere,
  direction = 'up',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPlacement, setPopoverPlacement] = useState<'up' | 'down'>('up');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption =
    ATMOSPHERE_OPTIONS.find((opt) => opt.id === atmosphere) ||
    ATMOSPHERE_OPTIONS[0];

  // Viewport-aware direction check whenever opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      // Popover height is ~230px. If spaceAbove is >= 230px or greater than spaceBelow, open upward.
      if (direction === 'up') {
        if (spaceAbove >= 230 || spaceAbove >= spaceBelow) {
          setPopoverPlacement('up');
        } else {
          setPopoverPlacement('down');
        }
      } else {
        if (spaceBelow >= 230 || spaceBelow >= spaceAbove) {
          setPopoverPlacement('down');
        } else {
          setPopoverPlacement('up');
        }
      }
    }
  }, [isOpen, direction]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block select-none">
      {/* Compact Trigger Button */}
      <button
        type="button"
        id="atmosphere-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-2.5 py-1 rounded bg-[#0B1B2B] hover:bg-[#102538] border border-[#1E3A4F] hover:border-[#38BDF8]/50 text-[#F1F5F9] transition-all cursor-pointer font-ui text-xs focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
        aria-label="Toggle Atmosphere preset selector popover"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner flex-shrink-0"
          style={{ background: currentOption.swatchGradient }}
        />
        <span className="text-xs text-[#7E8F9F] font-medium hidden xs:inline">
          Atmosphere:
        </span>
        <span className="font-semibold text-xs text-[#38BDF8]">
          {currentOption.index} {currentOption.name.replace('ATELIER ', '')}
        </span>
        <ChevronUp
          className={`w-3.5 h-3.5 text-[#7E8F9F] transition-transform duration-200 ${
            isOpen
              ? popoverPlacement === 'up'
                ? 'rotate-180'
                : '-rotate-180'
              : ''
          }`}
        />
      </button>

      {/* Smoked-Glass Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            popoverPlacement === 'up'
              ? 'bottom-full mb-2 right-0'
              : 'top-full mt-2 right-0'
          } w-72 max-w-[calc(100vw-2rem)] glass-level-3 copper-reflection rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 border border-[#1E3A4F] bg-[#071423]/95 backdrop-blur-xl font-ui`}
          role="menu"
          aria-label="Atmosphere Presets"
        >
          <div className="px-2 py-1 border-b border-[#1E3A4F]/60 mb-1 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3 h-3 text-[#38BDF8]" />
              <span className="font-ui text-xs font-semibold text-[#7E8F9F]">
                Studio Atmosphere ({ATMOSPHERE_OPTIONS.length})
              </span>
            </div>
            <span className="font-ui text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/30 font-medium">
              Cross-Fade
            </span>
          </div>

          <div className="space-y-0.5">
            {ATMOSPHERE_OPTIONS.map((opt) => {
              const isSelected = atmosphere === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelectAtmosphere(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-[#102538] border border-[#38BDF8]/60 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                      : 'hover:bg-[#0E1E2E] border border-transparent hover:border-[#1E3A4F]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className="w-4 h-4 rounded border border-white/20 shadow-inner flex-shrink-0"
                      style={{ background: opt.swatchGradient }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[10px] text-[#7E8F9F]">
                          {opt.index}
                        </span>
                        <span
                          className={`font-ui text-xs font-semibold truncate leading-tight ${
                            isSelected ? 'text-[#38BDF8]' : 'text-[#F1F5F9]'
                          }`}
                        >
                          {opt.name}
                        </span>
                      </div>
                      <p className="font-ui text-[11px] text-[#7E8F9F] truncate leading-tight mt-0.5">
                        {opt.descriptor}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center space-x-1 text-[#38BDF8] flex-shrink-0 ml-2">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
