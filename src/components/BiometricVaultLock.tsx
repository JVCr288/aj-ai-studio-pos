import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Cpu,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Terminal,
  Info,
} from 'lucide-react';
import {
  queryBiometricSupport,
  executeBiometricAuthentication,
  BiometricTelemetry,
  BiometricAuthResult,
} from '../utils/biometricAuth';

interface BiometricVaultLockProps {
  guestName: string;
  sessionToken: string;
  onUnlock: (result: BiometricAuthResult) => void;
  onDisableToggle: () => void;
}

export const BiometricVaultLock: React.FC<BiometricVaultLockProps> = ({
  guestName,
  sessionToken,
  onUnlock,
  onDisableToggle,
}) => {
  const [telemetry, setTelemetry] = useState<BiometricTelemetry | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepText, setScanStepText] = useState<string>('Touch sensor or click authenticate');
  const [authSuccess, setAuthSuccess] = useState<BiometricAuthResult | null>(null);
  const [showApiInspector, setShowApiInspector] = useState(false);

  useEffect(() => {
    queryBiometricSupport().then((t) => setTelemetry(t));
  }, []);

  const handleStartScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setAuthSuccess(null);

    try {
      const result = await executeBiometricAuthentication({
        guestName,
        sessionToken,
        onProgress: (stage) => setScanStepText(stage),
      });

      setAuthSuccess(result);
      setTimeout(() => {
        setIsScanning(false);
        onUnlock(result);
      }, 550);
    } catch (err) {
      console.error('Biometric authentication error:', err);
      setIsScanning(false);
      setScanStepText('Authentication failed. Please retry.');
    }
  };

  return (
    <div className="w-full glass-plate hairline-copper-top border border-[rgba(120,165,190,0.18)] rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center my-6">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#38BDF8_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.03] pointer-events-none" />

      {/* Top Lock Status Pill */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#071423] border border-amber-500/30 text-amber-400 font-ui text-xs mb-6">
        <Lock className="w-3.5 h-3.5" />
        <span className="font-medium">
          Local WebAuthn Gate • Client-Side Access Protection
        </span>
      </div>

      {/* Title & Description */}
      <div className="max-w-md mx-auto space-y-2 mb-8">
        <h2 className="font-ui font-bold text-2xl sm:text-3xl text-[#F1F5F9] tracking-tight">
          Client-Side Biometric Gate
        </h2>
        <p className="font-ui text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
          Deliverable preview access is guarded by a local platform authenticator.
          Touch the sensor below to verify your biometric credential via the browser’s{' '}
          <span className="text-[#38BDF8]">Credential Management API</span>.
        </p>
      </div>

      {/* Interactive Fingerprint Sensor Touch Target */}
      <div className="flex flex-col items-center justify-center my-6">
        <div
          onClick={handleStartScan}
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 select-none ${
            isScanning
              ? 'bg-[#38BDF8]/15 border-2 border-[#38BDF8] shadow-[0_0_35px_rgba(56,189,248,0.35)] scale-105'
              : authSuccess
              ? 'bg-[#34D399]/15 border-2 border-[#34D399] shadow-[0_0_35px_rgba(52,211,153,0.35)]'
              : 'bg-[#101C2C] border-2 border-[#1E3A4F] hover:border-[#38BDF8]/60 hover:bg-[#102538] active:scale-95 shadow-xl'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Fingerprint Biometric Sensor"
          id="biometric-fingerprint-pad"
        >
          {/* Animated Laser Scanning Sweep Bar */}
          {isScanning && (
            <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_12px_#38BDF8] animate-bounce pointer-events-none" />
          )}

          {/* Central Fingerprint Icon with Dynamic State */}
          {authSuccess ? (
            <CheckCircle2 className="w-14 h-14 text-[#34D399] animate-in zoom-in-75 duration-300" />
          ) : (
            <Fingerprint
              className={`w-14 h-14 transition-colors duration-300 ${
                isScanning
                  ? 'text-[#38BDF8] animate-pulse'
                  : 'text-[#7E8F9F] group-hover:text-[#F1F5F9]'
              }`}
            />
          )}

          {/* Corner Framing Reticles */}
          <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-[#1E3A4F]" />
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-[#1E3A4F]" />
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-[#1E3A4F]" />
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-[#1E3A4F]" />
        </div>

        {/* Live Scan Step Text Readout */}
        <div className="mt-4 flex items-center space-x-2 font-ui text-xs">
          {isScanning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-[#38BDF8] animate-spin" />
              <span className="text-[#38BDF8] font-semibold">{scanStepText}</span>
            </>
          ) : authSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
              <span className="text-[#34D399] font-semibold">
                Gate Unlocked (<span className="font-mono">{authSuccess.credentialId}</span>)
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
              <span className="text-[#7E8F9F]">Tap sensor or press authenticate</span>
            </>
          )}
        </div>
      </div>

      {/* Primary Action Trigger Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 max-w-lg mx-auto">
        <button
          id="biometric-authenticate-btn"
          type="button"
          onClick={handleStartScan}
          disabled={isScanning}
          className="w-full sm:flex-1 h-12 px-6 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#0EA5E9] hover:to-[#0369A1] active:scale-[0.99] text-[#030F1E] font-ui font-bold text-sm tracking-normal flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-60 shadow-lg shadow-[#38BDF8]/20"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5]" />
              <span>Scanning Platform Gate...</span>
            </>
          ) : (
            <>
              <Fingerprint className="w-4 h-4 stroke-[2.5]" />
              <span>Authenticate Platform Gate</span>
            </>
          )}
        </button>

        <button
          id="biometric-disable-btn"
          type="button"
          onClick={onDisableToggle}
          className="w-full sm:w-auto h-12 px-5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border-2 border-amber-500/60 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-ui font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg"
          title="Turn off biometric lock protection and reveal deliverables directly"
        >
          <Unlock className="w-4 h-4 text-amber-400" />
          <span>Disable Local Gate (Quick Access)</span>
        </button>
      </div>

      {/* Quick Bypass / Skip Link */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onDisableToggle}
          className="text-xs text-[#94A3B8] hover:text-[#38BDF8] underline underline-offset-4 transition-colors cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>💡 Click here to bypass biometric authentication and view deliverables directly</span>
        </button>
      </div>

      {/* Hardware Telemetry Card */}
      <div className="mt-8 max-w-lg mx-auto bg-[#071423] border border-[#1E3A4F] rounded-xl p-4 text-left font-ui text-xs space-y-2">
        <div className="flex items-center justify-between text-[#7E8F9F] border-b border-[#1E3A4F] pb-2">
          <span className="flex items-center space-x-1.5 text-[#F1F5F9] font-semibold">
            <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Platform Authenticator Gate</span>
          </span>
          <span className="text-[#34D399] flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
            Ready
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[#94A3B8] pt-1">
          <div>
            <span className="text-[#7E8F9F] block">Standard:</span>
            <span className="text-[#F1F5F9] truncate block">WebAuthn / Credential Management</span>
          </div>
          <div>
            <span className="text-[#7E8F9F] block">Sensor Status:</span>
            <span className="text-[#F1F5F9]">{telemetry?.hardwareLevel ? 'Platform Authenticator' : 'Platform Authenticator (Local Gate)'}</span>
          </div>
          <div>
            <span className="text-[#7E8F9F] block">Target:</span>
            <span className="text-[#F1F5F9] truncate block">{guestName}</span>
          </div>
          <div>
            <span className="text-[#7E8F9F] block">Session Token:</span>
            <span className="text-[#38BDF8] truncate block font-mono">{sessionToken}</span>
          </div>
        </div>

        {/* API Inspector Toggle */}
        <div className="pt-2 border-t border-[#1E3A4F] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowApiInspector(!showApiInspector)}
            className="text-[10px] text-[#7E8F9F] hover:text-[#38BDF8] flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <Terminal className="w-3 h-3" />
            <span>{showApiInspector ? 'Hide WebAuthn Payload Spec' : 'Inspect Credential API Spec'}</span>
          </button>
          <span className="text-[10px] text-[#7E8F9F] font-mono">LOCAL GATE</span>
        </div>

        {showApiInspector && (
          <div className="mt-2 p-2.5 bg-[#030F1E] rounded-lg border border-[#1E3A4F] text-[10px] text-[#94A3B8] space-y-1">
            <p className="text-[#34D399] font-bold font-mono">navigator.credentials.get({'{'}</p>
            <p className="pl-3 font-mono">publicKey: {'{'}</p>
            <p className="pl-6 font-mono text-[#F1F5F9]">challenge: Uint8Array(32),</p>
            <p className="pl-6 font-mono text-[#F1F5F9]">userVerification: "preferred",</p>
            <p className="pl-6 font-mono text-[#F1F5F9]">rpId: "{typeof window !== 'undefined' ? window.location.hostname : 'aj-studio'}"</p>
            <p className="pl-3 font-mono">{'}'}</p>
            <p className="text-[#34D399] font-bold font-mono">{'}'})</p>
          </div>
        )}
      </div>
    </div>
  );
};
