import React, { useState } from 'react';
import { BookingState, VaultAsset, WorkspaceView } from '../types';
import { VAULT_MASTER_FRAMES } from '../data/mockData';
import { getTenantConfig } from '../config/tenantConfig';
import {
  Download,
  Share2,
  Shield,
  FileText,
  ExternalLink,
  Check,
  Eye,
  Sliders,
  Maximize2,
  X,
  Camera,
  Layers,
  Receipt,
  Printer,
  FileCode,
  Copy,
  CheckCircle2,
  Fingerprint,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { ClientInvoiceGenerator } from './ClientInvoiceGenerator';
import {
  downloadDigitalReceiptFile,
  generateDigitalReceiptJson,
  DigitalReceiptData,
} from '../utils/receiptGenerator';
import { BiometricVaultLock } from './BiometricVaultLock';
import { BiometricAuthResult } from '../utils/biometricAuth';

interface ArchiveVaultScreenProps {
  bookingState: BookingState;
  workspaceView?: WorkspaceView;
}

export const ArchiveVaultScreen: React.FC<ArchiveVaultScreenProps> = ({
  bookingState,
  workspaceView = 'compact',
}) => {
  const tenant = getTenantConfig(bookingState.tenantId);

  const [activeTab, setActiveTab] = useState<'masters' | 'raw' | 'contact' | 'invoice'>(
    'masters'
  );
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingFrame, setDownloadingFrame] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const [licenseToast, setLicenseToast] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<VaultAsset | null>(null);

  // Secure Biometric Vault Unlock States
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(true);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [biometricAuthResult, setBiometricAuthResult] = useState<BiometricAuthResult | null>(null);
  const [biometricToast, setBiometricToast] = useState<string | null>(null);
  
  // Digital Receipt JSON States
  const [receiptDownloading, setReceiptDownloading] = useState(false);
  const [receiptToast, setReceiptToast] = useState<{ show: boolean; filename: string }>({
    show: false,
    filename: '',
  });
  const [previewReceiptModal, setPreviewReceiptModal] = useState<DigitalReceiptData | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleDownloadReceipt = () => {
    setReceiptDownloading(true);
    setTimeout(() => {
      const { filename } = downloadDigitalReceiptFile(bookingState);
      setReceiptDownloading(false);
      setReceiptToast({ show: true, filename });
      setTimeout(() => setReceiptToast({ show: false, filename: '' }), 4000);
    }, 400);
  };

  const handlePreviewReceipt = () => {
    const data = generateDigitalReceiptJson(bookingState);
    setPreviewReceiptModal(data);
  };

  const handleCopyJson = () => {
    if (previewReceiptModal) {
      navigator.clipboard.writeText(JSON.stringify(previewReceiptModal, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handleToggleBiometrics = () => {
    setIsBiometricEnabled((prev) => {
      const next = !prev;
      if (next) {
        setIsVaultUnlocked(false);
        setBiometricToast('Secure Biometric Vault Unlock armed. Fingerprint verification required.');
      } else {
        setIsVaultUnlocked(true);
        setBiometricToast('Biometric protection disabled. Direct archive access granted.');
      }
      setTimeout(() => setBiometricToast(null), 3500);
      return next;
    });
  };

  const handleBiometricUnlock = (result: BiometricAuthResult) => {
    setBiometricAuthResult(result);
    setIsVaultUnlocked(true);
    setBiometricToast(`LOCAL WEBAUTHN GATE PASSED (${result.credentialId}). Client-side archive access unlocked.`);
    setTimeout(() => setBiometricToast(null), 4500);
  };

  const handleLockVault = () => {
    setIsVaultUnlocked(false);
    setBiometricToast('Vault secured. Fingerprint verification required to view deliverables.');
    setTimeout(() => setBiometricToast(null), 3500);
  };

  const handleDownloadAll = () => {
    if (isBiometricEnabled && !isVaultUnlocked) {
      setBiometricToast('Vault is locked. Touch fingerprint sensor to authenticate before extracting master payload.');
      setTimeout(() => setBiometricToast(null), 3500);
      return;
    }
    setDownloadingAll(true);
    setTimeout(() => {
      setDownloadingAll(false);
      const manifestTitle = tenant.archiveManifestTitle || `${tenant.displayName} - Master Archive Manifest`;
      const filePrefix = tenant.archiveExportFilenamePrefix || tenant.displayName.replace(/\s+/g, '_');
      // create simulated download
      const element = document.createElement('a');
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' +
          encodeURIComponent(
            `${manifestTitle}\nSession: ${bookingState.manifestId}\nToken: ${bookingState.token}\nClient: ${bookingState.guestName}\nFiles: 5 TIFF Masters (16-bit) + 142 DNG RAW Captures\nTotal Payload: 3.42 GB`
          )
      );
      element.setAttribute(
        'download',
        `${filePrefix}_${bookingState.guestName.replace(/\s+/g, '_')}_Vault_Archive.txt`
      );
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 1500);
  };

  const handleDownloadSingle = (asset: VaultAsset) => {
    if (isBiometricEnabled && !isVaultUnlocked) {
      setBiometricToast('Vault is locked. Touch fingerprint sensor to authenticate.');
      setTimeout(() => setBiometricToast(null), 3500);
      return;
    }
    setDownloadingFrame(asset.id);
    setTimeout(() => {
      setDownloadingFrame(null);
      const element = document.createElement('a');
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' +
          encodeURIComponent(
            `${tenant.displayName} TIFF File: ${asset.filename}\nResolution: ${asset.resolution} at ${asset.dpi} DPI\nColor Profile: ProPhoto RGB 16-bit\nLighting: ${asset.lightingSetup}\nCamera: ${asset.exif.camera}\nLens: ${asset.exif.lens}\nSettings: ${asset.exif.shutter}, ${asset.exif.aperture}, ${asset.exif.iso}`
          )
      );
      element.setAttribute('download', asset.filename.replace('.TIFF', '.txt'));
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 1000);
  };

  const handleShareLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        window.location.origin + '?vault=' + bookingState.token
      );
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  const handleDownloadLicense = () => {
    setLicenseToast(true);
    setTimeout(() => setLicenseToast(false), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#38BDF8] selection:text-[#071423]">
      {/* Top Studio Navigation Bar for Vault */}
      <div className="w-full border-b border-[#1E3A4F] bg-[#071423]/90 backdrop-blur-md">
        <div
          className={`w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between transition-[max-width] duration-300 ${
            workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
          }`}
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] flex items-center justify-center relative overflow-hidden">
              <svg
                className="w-5 h-5 text-[#38BDF8]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
                <circle
                  className="fill-[#38BDF8]/20 stroke-[#38BDF8]"
                  cx="12"
                  cy="12"
                  r="3"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-ui font-bold text-lg tracking-tight text-[#F1F5F9]">
                  {tenant.displayName}
                </span>
                <span className="font-ui text-[11px] px-2 py-0.5 rounded bg-[#102538] border border-[#1E3A4F] text-[#34D399] font-medium tracking-normal">
                  Secure Archive (Local Demo)
                </span>
              </div>
              <p className="text-xs text-[#7E8F9F] font-ui tracking-normal">
                {tenant.archiveRepositoryLabel || 'Atelier Client Repository'} // Simulated Local Node 01
              </p>
            </div>
          </div>

          {/* Manifest & Storage Lifecycle Status */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Secure Biometric Vault Unlock Toggle */}
            <div className="bg-[#0B1B2B] border border-[#1E3A4F] hover:border-[#38BDF8]/40 px-3 py-1.5 rounded-xl text-xs font-ui flex items-center space-x-2.5 transition-colors">
              <div className="flex items-center space-x-1.5">
                <Fingerprint
                  className={`w-4 h-4 ${
                    isBiometricEnabled
                      ? isVaultUnlocked
                        ? 'text-[#34D399]'
                        : 'text-[#38BDF8] animate-pulse'
                      : 'text-[#7E8F9F]'
                  }`}
                />
                <span className="hidden sm:inline text-[#94A3B8] text-xs select-none">
                  {isBiometricEnabled
                    ? isVaultUnlocked
                      ? 'Biometric: Verified'
                      : 'Biometric Lock'
                    : 'Biometric: Off'}
                </span>
              </div>
              <button
                id="biometric-vault-toggle"
                type="button"
                role="switch"
                aria-checked={isBiometricEnabled}
                onClick={handleToggleBiometrics}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                  isBiometricEnabled ? 'bg-[#38BDF8]' : 'bg-[#102538]'
                }`}
                title="Secure Biometric Vault Unlock Toggle (Credential Management API)"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#071423] shadow ring-0 transition duration-200 ease-in-out ${
                    isBiometricEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="hidden sm:flex bg-[#0B1B2B] border border-[#1E3A4F] px-3.5 py-2 rounded-xl text-xs font-ui items-center space-x-3">
              <span className="text-[#7E8F9F]">Expires in:</span>
              <span className="text-[#38BDF8] font-bold tabular-nums">29 days, 14 hrs</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
            </div>

            <div
              className="w-9 h-9 rounded-lg border border-[#1E3A4F] bg-[#102538] overflow-hidden flex items-center justify-center cursor-pointer relative group"
              title={bookingState.guestName}
            >
              <img
                src={VAULT_MASTER_FRAMES[0].imageUrl}
                alt={bookingState.guestName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Bay Content Container */}
      <main
        className={`w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-7 transition-[max-width] duration-300 ${
          workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
        }`}
      >
        {/* Hero / Metadata & Pipeline Progress Tracker */}
        <div className="glass-plate hairline-copper-top border border-[rgba(120,165,190,0.18)] rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Session Details */}
            <div>
              <div className="flex flex-wrap items-center space-x-2 mb-2 font-ui text-xs">
                <span className="px-2 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 font-mono font-medium">
                  {bookingState.token}
                </span>
                <span className="text-[#7E8F9F]">•</span>
                <span className="text-[#94A3B8]">{bookingState.bayAllocation}</span>
                <span className="text-[#7E8F9F]">•</span>
                <span className="text-[#94A3B8]">
                  Shot: {bookingState.dateStr}
                </span>
                <span className="text-[#7E8F9F]">•</span>
                {/* Clickable Biometric Gate Badge */}
                <button
                  type="button"
                  id="hero-biometric-status-pill"
                  onClick={handleToggleBiometrics}
                  className={`px-2 py-0.5 rounded border font-medium flex items-center space-x-1.5 cursor-pointer transition-all ${
                    isBiometricEnabled
                      ? isVaultUnlocked
                        ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30'
                        : 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/40 animate-pulse'
                      : 'bg-[#102538] text-[#7E8F9F] border-[#1E3A4F]'
                  }`}
                  title="Click to toggle Secure Biometric Vault Unlock"
                >
                  <Fingerprint className="w-3 h-3" />
                  <span>
                    {isBiometricEnabled
                      ? isVaultUnlocked
                        ? 'Biometric pass: Unlocked'
                        : 'Biometric gate: Locked'
                      : 'Biometric: Disabled'}
                  </span>
                </button>
              </div>
              <h1 className="font-ui font-bold text-2xl sm:text-3xl text-[#F1F5F9] tracking-tight">
                {bookingState.guestName} — {bookingState.selectedPackage.name}
              </h1>
              <p className="text-[#7E8F9F] text-xs sm:text-sm mt-1.5 font-ui">
                5 Master Fine-Art Retouched Frames (TIFF/16-bit) + Full Digital
                Raw Library (DNG) • [Simulated Demo Cloud Archive]
              </p>
            </div>

            {/* Right: Primary Bulk Action */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="h-12 px-6 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] active:scale-[0.99] text-[#071423] font-ui font-semibold text-sm tracking-normal flex items-center justify-center space-x-2.5 transition-all cursor-pointer disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {downloadingAll
                    ? 'Packing Archive (3.42 GB)...'
                    : 'Download Master Archive (3.42 GB)'}
                </span>
              </button>

              <button
                id="download-digital-receipt-btn"
                onClick={handleDownloadReceipt}
                disabled={receiptDownloading}
                className="h-12 px-4 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] hover:border-[#38BDF8]/60 text-[#F1F5F9] font-ui font-medium text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer group disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                title="Export booking details as a structured JSON file for client record-keeping"
              >
                {receiptDownloading ? (
                  <div className="w-4 h-4 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileCode className="w-4 h-4 text-[#38BDF8] group-hover:scale-110 transition-transform" />
                )}
                <span>
                  {receiptDownloading ? 'Exporting JSON...' : 'Download Digital Receipt'}
                </span>
                <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-[#0B1B2B] text-[#38BDF8] font-bold">
                  JSON
                </span>
              </button>

              <button
                id="preview-digital-receipt-btn"
                onClick={handlePreviewReceipt}
                className="h-12 px-3 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] font-ui text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                title="Preview raw structured JSON receipt in interactive inspector"
              >
                <Eye className="w-3.5 h-3.5 text-[#7E8F9F]" />
                <span className="hidden md:inline">Inspect JSON</span>
              </button>

              <button
                onClick={handleShareLink}
                className="h-12 px-4 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] font-ui text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              >
                {shareToast ? (
                  <>
                    <Check className="w-4 h-4 text-[#34D399]" />
                    <span className="text-[#34D399]">Vault Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-[#38BDF8]" />
                    <span>Share Vault Link</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveTab('invoice')}
                className={`h-12 px-4 rounded-xl border font-ui text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                  activeTab === 'invoice'
                    ? 'bg-[#38BDF8] text-[#071423] border-[#38BDF8] font-semibold shadow-sm'
                    : 'bg-[#102538] hover:bg-[#1E3A4F] border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#38BDF8]/40'
                }`}
              >
                <Receipt className="w-4 h-4 text-[#38BDF8]" />
                <span>Invoice Generator</span>
              </button>
            </div>
          </div>

          {/* Studio Workflow Stage Track */}
          <div className="mt-6 pt-6 border-t border-[#1E3A4F] grid grid-cols-2 md:grid-cols-4 gap-4 font-ui text-xs">
            <div className="flex items-center space-x-2.5 text-[#94A3B8]">
              <span className="w-4 h-4 rounded-full bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 flex items-center justify-center text-[10px]">
                ✓
              </span>
              <span>1. Studio Capture</span>
            </div>
            <div className="flex items-center space-x-2.5 text-[#94A3B8]">
              <span className="w-4 h-4 rounded-full bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 flex items-center justify-center text-[10px]">
                ✓
              </span>
              <span>2. Color Tether &amp; Proof</span>
            </div>
            <div className="flex items-center space-x-2.5 text-[#94A3B8]">
              <span className="w-4 h-4 rounded-full bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 flex items-center justify-center text-[10px]">
                ✓
              </span>
              <span>3. Retouch Calibration</span>
            </div>
            <div className="flex items-center space-x-2.5 text-[#38BDF8] font-bold">
              <span className="w-4 h-4 rounded-full bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 flex items-center justify-center text-[10px] animate-pulse">
                ●
              </span>
              <span>4. Vault Ready</span>
            </div>
          </div>
        </div>

        {/* Filter & Vault Asset Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 font-ui text-xs bg-[#030F1E] p-1.5 rounded-xl border border-[#1E3A4F]">
            <button
              onClick={() => setActiveTab('masters')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                activeTab === 'masters'
                  ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 shadow-sm'
                  : 'text-[#7E8F9F] hover:text-[#F1F5F9]'
              }`}
            >
              Retouched Master (5)
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                activeTab === 'raw'
                  ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 font-semibold'
                  : 'text-[#7E8F9F] hover:text-[#F1F5F9]'
              }`}
            >
              Raw DNG Capture (142)
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                activeTab === 'contact'
                  ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 font-semibold'
                  : 'text-[#7E8F9F] hover:text-[#F1F5F9]'
              }`}
            >
              Color Grading Contact Sheet
            </button>
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                activeTab === 'invoice'
                  ? 'bg-[#38BDF8] text-[#071423] font-semibold shadow-sm'
                  : 'text-[#7E8F9F] hover:text-[#F1F5F9] border border-transparent hover:border-[#1E3A4F]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Client Invoice Generator</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-ui font-bold ${
                activeTab === 'invoice' ? 'bg-black/20 text-[#071423]' : 'bg-[#38BDF8]/15 text-[#38BDF8]'
              }`}>
                PDF
              </span>
            </button>
          </div>

          <div className="font-ui text-xs text-[#7E8F9F] flex items-center space-x-2">
            <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Color Profile: ProPhoto RGB (16-bit Depth)</span>
          </div>
        </div>

        {/* Biometric Gate Screen or Deliverables Archive */}
        {isBiometricEnabled && !isVaultUnlocked && activeTab !== 'invoice' ? (
          <BiometricVaultLock
            guestName={bookingState.guestName}
            sessionToken={bookingState.token}
            onUnlock={handleBiometricUnlock}
            onDisableToggle={() => {
              setIsBiometricEnabled(false);
              setIsVaultUnlocked(true);
            }}
          />
        ) : (
          <>
            {/* Biometrically Unlocked Status Pill Banner */}
            {isBiometricEnabled && isVaultUnlocked && activeTab !== 'invoice' && (
              <div
                id="vault-unlocked-status-banner"
                className="bg-[#0B1B2B] border border-[#34D399]/30 rounded-xl p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs font-ui animate-in fade-in duration-300"
              >
                <div className="flex items-center space-x-2.5 text-[#34D399]">
                  <div className="w-6 h-6 rounded-lg bg-[#34D399]/20 border border-[#34D399]/40 flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-3.5 h-3.5 text-[#34D399]" />
                  </div>
                  <span>
                    Client-side gate unlocked // Local WebAuthn gate passed via{' '}
                    <strong className="text-[#F1F5F9]">
                      {biometricAuthResult?.apiUsed || 'Platform Authenticator'}
                    </strong>{' '}
                    <span className="text-[#7E8F9F] font-mono">
                      (Pass ID: {biometricAuthResult?.credentialId || 'CRED-BIO-FP-884920'})
                    </span>
                  </span>
                </div>
                <button
                  id="lock-vault-btn"
                  type="button"
                  onClick={handleLockVault}
                  className="px-3 py-1.5 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] hover:border-[#FBBF24]/40 text-[#94A3B8] hover:text-[#F1F5F9] font-ui text-xs flex items-center space-x-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  title="Re-lock Deliverables Archive"
                >
                  <Lock className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>Re-lock Vault</span>
                </button>
              </div>
            )}

            {/* Media Grid: Retouched Master Frames */}
            {activeTab === 'masters' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {VAULT_MASTER_FRAMES.slice(0, 3).map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-[#0B1B2B] border border-[#1E3A4F] hover:border-[#38BDF8]/50 rounded-xl overflow-hidden group transition-all shadow-sm"
                  >
                    {/* Photo Preview Container */}
                    <div
                      className="relative aspect-[4/5] bg-[#030F1E] overflow-hidden cursor-pointer"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <img
                        src={asset.imageUrl}
                        alt={asset.filename}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 bg-[#030F1E]/80 backdrop-blur-md px-2 py-1 rounded border border-[#1E3A4F] font-mono text-[10px] text-[#38BDF8]">
                        {asset.frameNumber}
                      </div>
                      <div className="absolute top-3 right-3 bg-[#34D399]/20 backdrop-blur-md px-2 py-0.5 rounded border border-[#34D399]/40 font-ui text-[9px] text-[#34D399] font-bold uppercase">
                        {asset.badge}
                      </div>

                      {/* Hover Overlay with Inspector Prompt */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-lg bg-[#030F1E]/90 border border-[#38BDF8]/50 text-[#F1F5F9] font-ui text-xs flex items-center gap-1.5 shadow-lg">
                          <Eye className="w-3.5 h-3.5 text-[#38BDF8]" /> Inspect Frame
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 font-ui">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#F1F5F9]">
                          {asset.filename}
                        </span>
                        <span className="text-[#7E8F9F] tabular-nums">{asset.fileSize}</span>
                      </div>
                      <div className="text-xs text-[#7E8F9F] flex items-center justify-between border-t border-[#1E3A4F] pt-2.5">
                        <span>
                          {asset.resolution} • {asset.dpi} DPI
                        </span>
                        <span className="text-[#94A3B8]">{asset.lightingSetup}</span>
                      </div>
                      <button
                        onClick={() => handleDownloadSingle(asset)}
                        disabled={downloadingFrame === asset.id}
                        className="w-full py-2 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] hover:border-[#38BDF8] text-xs font-ui font-medium text-[#F1F5F9] flex items-center justify-center space-x-2 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                      >
                        <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>
                          {downloadingFrame === asset.id
                            ? 'Extracting TIFF...'
                            : 'Download Lossless (TIFF)'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: RAW DNG Capture simulation */}
            {activeTab === 'raw' && (
              <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-6 font-ui">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-ui font-bold text-base text-[#F1F5F9]">
                      Full Session Uncompressed DNG Library (142 Frames)
                    </h3>
                    <p className="font-ui text-xs text-[#7E8F9F] mt-0.5">
                      14-bit lossless compressed RAW files with embedded XMP color metadata. [Local Demo Repository]
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadAll}
                    className="px-4 py-2 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] font-ui font-semibold text-xs text-[#38BDF8] flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <Download className="w-3.5 h-3.5" /> Bulk Export DNG (2.8 GB)
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {[...Array(12)].map((_, i) => {
                    const img = VAULT_MASTER_FRAMES[i % VAULT_MASTER_FRAMES.length].imageUrl;
                    return (
                      <div
                        key={i}
                        className="bg-[#102538] border border-[#1E3A4F] rounded-lg p-2 space-y-1.5 group cursor-pointer hover:border-[#38BDF8]/50 transition-colors"
                      >
                        <div className="aspect-[3/4] bg-[#030F1E] rounded overflow-hidden relative">
                          <img
                            src={img}
                            alt={`RAW ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/80 font-ui text-[9px] text-[#94A3B8] px-1 rounded">
                            RAW
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-[#7E8F9F] truncate">
                          {tenant.archiveAssetFilenamePrefix || 'RAW'}_{String(i + 1).padStart(3, '0')}.DNG
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Contact Sheet simulation */}
            {activeTab === 'contact' && (
              <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-6 space-y-4 font-ui">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-ui font-bold text-base text-[#F1F5F9]">
                      Color Grading Contact Calibration Sheet
                    </h3>
                    <p className="font-ui text-xs text-[#7E8F9F]">
                      Calibrated against X-Rite ColorChecker Passport for 6500K daylight balance.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30 font-ui text-xs">
                    Delta-E &lt; 0.8 Accuracy
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {VAULT_MASTER_FRAMES.map((asset, i) => (
                    <div
                      key={asset.id}
                      className="bg-[#030F1E] border border-[#1E3A4F] rounded-lg p-3 space-y-2"
                    >
                      <div className="aspect-video bg-[#0B1B2B] rounded overflow-hidden relative">
                        <img
                          src={asset.imageUrl}
                          alt={asset.filename}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                          <span className="font-ui text-[11px] text-[#38BDF8]">
                            LUT: Nocturne 35mm Tungsten
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between font-ui text-xs text-[#7E8F9F]">
                        <span>Plate #{i + 1}</span>
                        <span className="text-[#F1F5F9]">{asset.lightingSetup}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Sub-Section 4: Client Invoice Generator View */}
        {activeTab === 'invoice' && (
          <ClientInvoiceGenerator bookingState={bookingState} />
        )}

        {/* Client Invoice Quick Banner when in other tabs */}
        {activeTab !== 'invoice' && (
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] hover:border-[#38BDF8]/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] flex-shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-ui font-bold text-sm text-[#F1F5F9]">
                    Client Invoice &amp; Gear Rental Generator
                  </h4>
                  <span className="text-[10px] font-ui px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] font-bold">
                    NEW FEATURE
                  </span>
                </div>
                <p className="font-ui text-xs text-[#7E8F9F] mt-0.5">
                  Select gear from the studio inventory (cameras, lenses, lighting, modifiers) and generate a custom, branded PDF-style invoice snippet with payment remittance for {bookingState.guestName}.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('invoice')}
              className="px-4 py-2 rounded-xl bg-[#102538] hover:bg-[#38BDF8] text-[#F1F5F9] hover:text-[#071423] border border-[#1E3A4F] hover:border-[#38BDF8] font-ui font-semibold text-xs flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              <span>Launch Invoice Generator</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* Commercial License Notice Banner */}
        <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-ui">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-ui font-semibold text-sm text-[#F1F5F9]">
                Personal &amp; Editorial Portfolio Release Included
              </h4>
              <p className="font-ui text-xs text-[#7E8F9F] mt-0.5">
                Full non-exclusive worldwide rights granted for online portfolios,
                print exhibitions, and social channels.
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadLicense}
            className="font-ui text-xs text-[#38BDF8] hover:underline flex items-center space-x-1.5 whitespace-nowrap cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
          >
            <span>
              {licenseToast
                ? 'Certificate Verified ✓'
                : 'Download Licensing Certificate (PDF)'}
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      {/* Frame Inspector Modal (Lightbox) */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-[#071423]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#0B1B2B] border border-[#1E3A4F] rounded-2xl overflow-hidden relative flex flex-col md:flex-row max-h-[90vh] shadow-2xl">
            <button
              onClick={() => setSelectedAsset(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg bg-[#071423]/80 border border-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left Image Large */}
            <div className="md:w-3/5 bg-[#030F1E] flex items-center justify-center relative overflow-hidden">
              <img
                src={selectedAsset.imageUrl}
                alt={selectedAsset.filename}
                className="max-h-[70vh] w-auto object-contain"
              />
              <div className="absolute bottom-3 left-3 bg-[#071423]/90 font-ui text-xs text-[#38BDF8] px-2 py-1 rounded border border-[#1E3A4F]">
                100% ProPhoto RGB
              </div>
            </div>

            {/* Right Meta Column */}
            <div className="md:w-2/5 p-6 space-y-4 font-ui flex flex-col justify-between overflow-y-auto">
              <div>
                <span className="text-xs text-[#38BDF8] font-mono uppercase font-semibold">
                  {selectedAsset.frameNumber}
                </span>
                <h3 className="font-ui font-bold text-lg text-[#F1F5F9] mt-1">
                  {selectedAsset.filename}
                </h3>
                <div className="text-xs text-[#7E8F9F] mt-1 tabular-nums">
                  {selectedAsset.fileSize} • {selectedAsset.resolution} • {selectedAsset.dpi} DPI
                </div>
              </div>

              {/* EXIF Data */}
              <div className="bg-[#030F1E] border border-[#1E3A4F] rounded-xl p-3.5 space-y-2 text-xs font-ui">
                <div className="flex items-center gap-1.5 text-[#F1F5F9] font-medium mb-1">
                  <Camera className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Optical EXIF Capture Data</span>
                </div>
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Camera:</span>
                  <span className="text-[#F1F5F9]">{selectedAsset.exif.camera}</span>
                </div>
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Lens:</span>
                  <span className="text-[#F1F5F9]">{selectedAsset.exif.lens}</span>
                </div>
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Exposure:</span>
                  <span className="text-[#38BDF8] tabular-nums">
                    {selectedAsset.exif.shutter} at {selectedAsset.exif.aperture} ({selectedAsset.exif.iso})
                  </span>
                </div>
                <div className="flex justify-between text-[#7E8F9F]">
                  <span>Lighting Rig:</span>
                  <span className="text-[#F1F5F9]">{selectedAsset.lightingSetup}</span>
                </div>
              </div>

              {/* Action */}
              <div className="space-y-2 font-ui">
                <button
                  onClick={() => handleDownloadSingle(selectedAsset)}
                  className="w-full py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-ui font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download Full TIFF ({selectedAsset.fileSize})</span>
                </button>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="w-full py-2 rounded-xl bg-[#102538] border border-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] text-xs font-ui focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secure Biometric Status Toast Notification */}
      {biometricToast && (
        <div
          id="biometric-alert-toast"
          className="fixed bottom-20 right-6 z-50 bg-[#0B1B2B] border border-[#38BDF8]/70 rounded-xl p-4 shadow-2xl flex items-center space-x-3 text-xs font-ui text-[#F1F5F9] animate-in fade-in slide-in-from-bottom-3 duration-200 backdrop-blur-md"
        >
          <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 flex items-center justify-center flex-shrink-0">
            <Fingerprint className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-[#38BDF8] flex items-center gap-1.5 font-ui">
              <span>Biometric Vault Security</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#102538] text-[#94A3B8] uppercase font-mono">
                WebAuthn
              </span>
            </p>
            <p className="text-[#7E8F9F] text-xs max-w-sm font-ui">{biometricToast}</p>
          </div>
        </div>
      )}

      {/* Digital Receipt Download Toast Notification */}
      {receiptToast.show && (
        <div
          id="digital-receipt-toast"
          className="fixed bottom-6 right-6 z-50 bg-[#0B1B2B] border border-[#38BDF8]/60 rounded-xl p-4 shadow-2xl flex items-center space-x-3 text-xs font-ui text-[#F1F5F9] animate-in fade-in slide-in-from-bottom-3 duration-200 backdrop-blur-md"
        >
          <div className="w-8 h-8 rounded-lg bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-[#38BDF8] flex items-center gap-1.5 font-ui">
              <span>Digital Receipt Exported</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#102538] text-[#94A3B8] uppercase font-mono">
                JSON
              </span>
            </p>
            <p className="text-[#7E8F9F] text-xs truncate max-w-xs font-ui">{receiptToast.filename}</p>
          </div>
        </div>
      )}

      {/* Structured Digital Receipt Preview Modal */}
      {previewReceiptModal && (
        <div
          id="digital-receipt-preview-modal"
          className="fixed inset-0 z-50 bg-[#071423]/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        >
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden font-ui">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#1E3A4F] flex items-center justify-between bg-[#102538]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-ui font-bold text-[#F1F5F9] text-base flex items-center gap-2">
                    Structured Digital Receipt
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#0B1B2B] text-[#38BDF8] font-bold">
                      application/json
                    </span>
                  </h3>
                  <p className="font-ui text-xs text-[#7E8F9F]">
                    <span className="font-mono">{previewReceiptModal.receiptHeader.receiptNumber}</span> // Token:{' '}
                    <span className="text-[#38BDF8] font-mono">{previewReceiptModal.bookingManifest.sessionToken}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="copy-receipt-json-btn"
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-lg bg-[#0B1B2B] hover:bg-[#1E3A4F] text-xs font-ui text-[#F1F5F9] flex items-center space-x-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#34D399]" />
                      <span className="text-[#34D399] font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="modal-download-receipt-btn"
                  onClick={handleDownloadReceipt}
                  className="px-3 py-1.5 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-ui font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Download File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewReceiptModal(null)}
                  className="p-1.5 rounded-lg hover:bg-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] transition-colors cursor-pointer ml-1 focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Metadata Pill Bar */}
            <div className="bg-[#030F1E] px-5 py-2.5 border-b border-[#1E3A4F] flex flex-wrap items-center justify-between gap-2 text-xs font-ui">
              <div className="flex items-center space-x-3 text-[#7E8F9F]">
                <span>
                  Guest: <strong className="text-[#F1F5F9] font-medium">{previewReceiptModal.clientIdentity.guestName}</strong>
                </span>
                <span>•</span>
                <span>
                  Package: <strong className="text-[#38BDF8] font-medium">{previewReceiptModal.photographyPackage.name}</strong>
                </span>
                <span>•</span>
                <span>
                  Total: <strong className="text-[#34D399] font-semibold tabular-nums">{previewReceiptModal.financialLedger.totalAmountMmk.toLocaleString()} MMK</strong>
                </span>
              </div>
              <span className="text-[#7E8F9F] text-xs font-ui">
                {previewReceiptModal.receiptHeader.issuedAt}
              </span>
            </div>

            {/* Formatted JSON Payload Body */}
            <div className="p-4 sm:p-5 overflow-auto flex-1 font-mono text-xs bg-[#030F1E]">
              <pre className="text-[#34D399]/90 leading-relaxed selection:bg-[#38BDF8] selection:text-black">
                {JSON.stringify(previewReceiptModal, null, 2)}
              </pre>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-[#102538] border-t border-[#1E3A4F] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-ui text-[#7E8F9F]">
              <span className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Format: {previewReceiptModal.receiptHeader.receiptVersion} • Studio Certified Digital Ledger</span>
              </span>
              <span className="text-[#7E8F9F] truncate max-w-sm font-mono text-[11px]">
                Digest: {previewReceiptModal.termsAndCertification.digitalSignatureDigest}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

