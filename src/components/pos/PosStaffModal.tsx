import React, { useState, useEffect } from 'react';
import { PosStaffMember, PosStaffRole } from '../../types';
import { posStaffService } from '../../services/posStaffService';
import { playScannerBeep } from '../../hooks/useBarcodeScanner';
import {
  Lock,
  Unlock,
  ShieldAlert,
  UserCheck,
  X,
  Delete,
  ScanLine,
  CheckCircle2,
  Crown,
  Sparkles,
} from 'lucide-react';

interface PosStaffModalProps {
  isOpen: boolean;
  isLocked?: boolean;
  onClose?: () => void;
  activeStaff: PosStaffMember;
  onStaffAuthenticated: (staff: PosStaffMember) => void;
}

export const PosStaffModal: React.FC<PosStaffModalProps> = ({
  isOpen,
  isLocked = false,
  onClose,
  activeStaff,
  onStaffAuthenticated,
}) => {
  const staffList = posStaffService.getAllStaff();
  const [selectedStaff, setSelectedStaff] = useState<PosStaffMember>(activeStaff);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Sync active staff on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedStaff(activeStaff);
      setPinInput('');
      setErrorMessage(null);
      setIsSuccess(false);
    }
  }, [isOpen, activeStaff]);

  // Handle Keypad digit press
  const handleDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMessage(null);

      // Auto-validate upon reaching 4 digits
      if (nextPin.length === 4) {
        verifyPin(nextPin, selectedStaff);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMessage(null);
  };

  const verifyPin = (pin: string, staff: PosStaffMember) => {
    const authenticated = posStaffService.authenticateByPin(pin, staff.id);
    if (authenticated) {
      playScannerBeep('success');
      setIsSuccess(true);
      setTimeout(() => {
        onStaffAuthenticated(authenticated);
        if (onClose) onClose();
      }, 350);
    } else {
      playScannerBeep('error');
      setErrorMessage('Incorrect PIN. Please try again.');
      setPinInput('');
    }
  };

  // Keyboard shortcut listener for digits
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' && !isLocked && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pinInput, selectedStaff, isLocked]);

  if (!isOpen) return null;

  const getRoleBadgeStyle = (role: PosStaffRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'STUDIO_MANAGER':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'LEAD_CASHIER':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      default:
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 select-none">
      <div className="relative w-full max-w-md bg-[#071423] border border-[#1E3A4F] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-[#0A1A2E] border-b border-[#1E3A4F] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isLocked
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                  : 'bg-[#38BDF8]/20 border border-[#38BDF8]/40 text-[#38BDF8]'
              }`}
            >
              {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-1.5">
                {isLocked ? 'Terminal Locked' : 'Switch Staff Cashier'}
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                {isLocked
                  ? 'Enter 4-digit PIN or scan badge to unlock'
                  : 'Select staff profile & verify security PIN'}
              </p>
            </div>
          </div>

          {!isLocked && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Staff Roster Carousel / Buttons */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Select Staff Member:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {staffList.map((st) => {
                const isSelected = selectedStaff.id === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaff(st);
                      setPinInput('');
                      setErrorMessage(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#102538] border-[#38BDF8] ring-1 ring-[#38BDF8]/50 shadow-md shadow-[#38BDF8]/10'
                        : 'bg-[#030F1E] border-[#1E3A4F] hover:bg-[#0A1A2E]'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                      style={{
                        backgroundColor: `${st.avatarColor}20`,
                        color: st.avatarColor,
                        border: `1px solid ${st.avatarColor}40`,
                      }}
                    >
                      {st.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#F1F5F9] truncate">{st.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded border ${getRoleBadgeStyle(
                            st.role
                          )}`}
                        >
                          {st.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Staff Badge & PIN Display */}
          <div className="bg-[#030F1E] p-3.5 rounded-xl border border-[#1E3A4F] text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xs font-medium text-[#94A3B8]">Authenticating:</span>
              <span className="text-xs font-bold text-[#F1F5F9]">{selectedStaff.name}</span>
              {selectedStaff.myanmarName && (
                <span className="text-[10px] text-[#38BDF8]">({selectedStaff.myanmarName})</span>
              )}
            </div>

            {/* PIN Dots Display */}
            <div className="flex items-center justify-center space-x-3 py-1">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      isSuccess
                        ? 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-400/50'
                        : filled
                        ? 'bg-[#38BDF8] scale-110 shadow-lg shadow-[#38BDF8]/40'
                        : 'bg-[#1E3A4F] border border-[#334E68]'
                    }`}
                  />
                );
              })}
            </div>

            {errorMessage && (
              <p className="text-[11px] font-semibold text-rose-400 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {errorMessage}
              </p>
            )}

            {isSuccess && (
              <p className="text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PIN Verified! Switching staff...
              </p>
            )}
          </div>

          {/* Touch-Friendly Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="h-12 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] active:bg-[#38BDF8]/20 border border-[#1E3A4F] text-[#F1F5F9] font-mono font-bold text-base transition-colors flex items-center justify-center cursor-pointer shadow-sm"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className="h-12 rounded-xl bg-[#030F1E] hover:bg-rose-500/10 active:bg-rose-500/20 border border-[#1E3A4F] hover:border-rose-500/30 text-[#94A3B8] hover:text-rose-400 text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-12 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] active:bg-[#38BDF8]/20 border border-[#1E3A4F] text-[#F1F5F9] font-mono font-bold text-base transition-colors flex items-center justify-center cursor-pointer shadow-sm"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-xl bg-[#030F1E] hover:bg-[#1E3A4F] active:bg-[#38BDF8]/10 border border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors flex items-center justify-center cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Barcode Badge Instant Scan Callout */}
          <div className="bg-[#030F1E] border border-dashed border-[#1E3A4F] rounded-xl p-2.5 flex items-center space-x-2 text-[11px] text-[#94A3B8]">
            <ScanLine className="w-4 h-4 text-[#38BDF8] shrink-0" />
            <span>
              Barcode Tip: Scan physical badge (<code className="text-[#38BDF8]">{selectedStaff.badgeBarcode}</code>) to switch instantly without typing PIN.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
