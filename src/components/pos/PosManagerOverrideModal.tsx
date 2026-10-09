import React, { useState, useEffect } from 'react';
import { PosStaffMember } from '../../types';
import { posStaffService } from '../../services/posStaffService';
import { playScannerBeep } from '../../hooks/useBarcodeScanner';
import { ShieldCheck, ShieldAlert, X, Delete, CheckCircle2, Lock } from 'lucide-react';

interface PosManagerOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle: string;
  actionDescription: string;
  onAuthorized: (manager: PosStaffMember, overrideToken?: string) => void;
}

export const PosManagerOverrideModal: React.FC<PosManagerOverrideModalProps> = ({
  isOpen,
  onClose,
  actionTitle,
  actionDescription,
  onAuthorized,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setErrorMessage(null);
      setIsSuccess(false);
      setIsValidating(false);
    }
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    if (isValidating || isSuccess) return;
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMessage(null);

      if (nextPin.length === 4) {
        verifyOverridePin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isValidating || isSuccess) return;
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    if (isValidating || isSuccess) return;
    setPinInput('');
    setErrorMessage(null);
  };

  const verifyOverridePin = async (pin: string) => {
    setIsValidating(true);
    try {
      const res = await posStaffService.verifyManagerOverrideAsync(pin, actionTitle);
      if (res.authorized && res.manager) {
        playScannerBeep('success');
        setIsSuccess(true);
        setTimeout(() => {
          onAuthorized(res.manager!, res.overrideToken);
          onClose();
        }, 350);
      } else {
        playScannerBeep('error');
        setErrorMessage(res.error || 'Manager authorization failed.');
        setPinInput('');
      }
    } catch {
      playScannerBeep('error');
      setErrorMessage('Manager authorization failed. Please try again.');
      setPinInput('');
    } finally {
      setIsValidating(false);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pinInput]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 select-none">
      <div className="relative w-full max-w-sm bg-[#071423] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-1.5">
                Manager Authorization Required
              </h2>
              <p className="text-[11px] text-[#94A3B8]">Elevated privilege action</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Details & PIN */}
        <div className="p-5 space-y-4">
          <div className="bg-[#030F1E] p-3 rounded-xl border border-[#1E3A4F] space-y-1">
            <div className="text-xs font-bold text-amber-400">{actionTitle}</div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">{actionDescription}</p>
          </div>

          <div className="bg-[#030F1E] p-3.5 rounded-xl border border-[#1E3A4F] text-center space-y-2">
            <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Enter Manager / Owner PIN
            </span>

            {/* PIN Dots */}
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
                        ? 'bg-amber-400 scale-110 shadow-lg shadow-amber-400/40'
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
                Authorized! Proceeding...
              </p>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="h-11 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] active:bg-amber-500/20 border border-[#1E3A4F] text-[#F1F5F9] font-mono font-bold text-sm transition-colors flex items-center justify-center cursor-pointer"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className="h-11 rounded-xl bg-[#030F1E] hover:bg-rose-500/10 active:bg-rose-500/20 border border-[#1E3A4F] text-[#94A3B8] hover:text-rose-400 text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-11 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] active:bg-amber-500/20 border border-[#1E3A4F] text-[#F1F5F9] font-mono font-bold text-sm transition-colors flex items-center justify-center cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="h-11 rounded-xl bg-[#030F1E] hover:bg-[#1E3A4F] active:bg-amber-500/10 border border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors flex items-center justify-center cursor-pointer"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
