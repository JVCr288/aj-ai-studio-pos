import React, { useState, useEffect } from 'react';
import {
  StudioOnboardingProject,
  ProductionConfigurationResult,
  ProductionIntegrationPlan,
  IntegrationReceipt,
} from '../types';
import { loadOnboardingDraft } from '../services/onboardingPersistenceService';
import {
  buildProductionInitialConfiguration,
  ONBOARDING_CONFIGURATION_MAPPER_VERSION,
} from '../services/onboardingConfigurationMapper';
import {
  createIntegrationPlan,
  performDryRun,
  applyIntegration,
  developmentMemoryAdapter,
  INTEGRATION_PLAN_VERSION,
} from '../services/onboardingIntegrationService';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Package,
  Layers,
  CreditCard,
  FileCheck,
  Sparkles,
  Info,
  X,
  Lock,
  Database,
  Play,
  History,
  FileCode,
} from 'lucide-react';

interface StudioOnboardingMapperPreviewConsoleProps {
  projectId?: string;
  onClose?: () => void;
}

export const StudioOnboardingMapperPreviewConsole: React.FC<
  StudioOnboardingMapperPreviewConsoleProps
> = ({ projectId = 'proj-aj-studio-01', onClose }) => {
  const [project, setProject] = useState<StudioOnboardingProject | null>(null);
  const [mapperResult, setMapperResult] = useState<ProductionConfigurationResult | null>(null);
  const [plan, setPlan] = useState<ProductionIntegrationPlan | null>(null);
  const [lastReceipt, setLastReceipt] = useState<IntegrationReceipt | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    loadOnboardingDraft(projectId).then((data) => {
      if (data) {
        setProject(data);
        const result = buildProductionInitialConfiguration(data);
        setMapperResult(result);

        const planRes = createIntegrationPlan(data);
        if (planRes.plan) {
          setPlan(planRes.plan);
          const existing = developmentMemoryAdapter.checkIdempotency(planRes.plan.idempotencyKey);
          if (existing) {
            setLastReceipt(existing);
          }
        }
      }
    });
  }, [projectId]);

  if (!project) {
    return (
      <div className="p-8 text-center text-[#7E8F9F] font-mono-code text-xs">
        Loading Configuration Mapper Preview...
      </div>
    );
  }

  const isApproved = project.project.status === 'APPROVED';
  const config = mapperResult?.config;
  const validation = mapperResult?.validation;

  const handleRunDryRun = () => {
    if (!plan) return;
    const res = performDryRun(plan);
    setLastReceipt(res.receipt);
    setNotice('Dry run executed cleanly. Zero side effects recorded.');
  };

  const handleExecuteSimulatedApply = async () => {
    if (!plan) return;
    setShowConfirmModal(false);
    setIsSimulating(true);

    const res = await applyIntegration(plan, 'SIMULATED_APPLY');
    setLastReceipt(res.receipt);
    setIsSimulating(false);

    if (res.status === 'ALREADY_APPLIED') {
      setNotice('Already Applied in Development Simulation. Existing receipt retrieved.');
    } else if (res.success) {
      setNotice('Simulated transaction committed successfully in development memory.');
    } else {
      setNotice(`Simulated transaction failed and rolled back: ${res.error?.message}`);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-ui text-[#F1F5F9] pb-12">
      {/* Non-Production Banner */}
      <div className="bg-[#102538] border border-[#38BDF8]/40 rounded-xl p-3.5 flex items-center justify-between text-xs font-mono-code">
        <div className="flex items-center space-x-2.5">
          <Database className="w-4 h-4 text-[#38BDF8]" />
          <span className="font-bold text-[#38BDF8]">
            DEVELOPMENT SIMULATION — NO PRODUCTION DATA WILL BE WRITTEN
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#38BDF8]/10 text-[#94A3B8] border border-[#38BDF8]/20">
          Adapter: {developmentMemoryAdapter.adapterName}
        </span>
      </div>

      {/* Console Header */}
      <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-pulse" />
              <h1 className="font-bold text-xl sm:text-2xl text-[#F1F5F9] tracking-tight">
                Approved Configuration Mapper Preview
              </h1>
              <span className="px-2.5 py-0.5 rounded bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 text-[10px] font-mono-code font-semibold">
                Plan v{INTEGRATION_PLAN_VERSION} • Mapper v{ONBOARDING_CONFIGURATION_MAPPER_VERSION}
              </span>
            </div>
            <p className="text-xs text-[#7E8F9F] mt-1">
              Transforms approved onboarding snapshot data into a production-ready initial configuration contract.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {validation ? (
              <span
                className={`px-3 py-1.5 rounded-md border text-xs font-semibold font-mono-code flex items-center space-x-1.5 ${
                  validation.readinessState === 'READY_FOR_INTEGRATION'
                    ? 'bg-[#34D399]/20 text-[#34D399] border-[#34D399]/40'
                    : 'bg-[#FB7185]/20 text-[#FB7185] border-[#FB7185]/40'
                }`}
              >
                {validation.readinessState === 'READY_FOR_INTEGRATION' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#FB7185]" />
                )}
                <span>{validation.readinessState}</span>
              </span>
            ) : null}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-[#102538] border border-[#1E3A4F] text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
              >
                Close Preview
              </button>
            )}
          </div>
        </div>

        {/* Source Provenance Header Bar */}
        {config && (
          <div className="pt-3 border-t border-[#1E3A4F] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
            <div>
              <span className="text-[#7E8F9F] block text-[10px]">Source Submission ID</span>
              <span className="text-[#38BDF8] font-bold">{config.source.approvedSubmissionId}</span>
            </div>
            <div>
              <span className="text-[#7E8F9F] block text-[10px]">Submission Version</span>
              <span className="font-bold text-[#F1F5F9]">v{config.source.submissionVersion}.0</span>
            </div>
            <div>
              <span className="text-[#7E8F9F] block text-[10px]">Approved Timestamp</span>
              <span className="text-[#94A3B8]">{new Date(config.source.approvedAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[#7E8F9F] block text-[10px]">Schema & Mapper Version</span>
              <span className="text-[#34D399]">Schema {config.source.schemaVersion} • Mapper {config.source.mapperVersion}</span>
            </div>
          </div>
        )}

        {plan && (
          <div className="pt-2 border-t border-[#1E3A4F]/60 flex items-center justify-between text-xs font-mono-code">
            <div>
              <span className="text-[#7E8F9F]">Idempotency Key: </span>
              <span className="text-[#34D399] font-bold">{plan.idempotencyKey}</span>
            </div>
            <div>
              <span className="text-[#7E8F9F]">Operations: </span>
              <span className="text-[#F1F5F9] font-bold">{plan.operations.length} Sequence Operations</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Notice Toast */}
      {notice && (
        <div className="p-3.5 rounded-xl bg-[#030F1E] border border-[#38BDF8]/40 text-xs text-[#38BDF8] flex items-center justify-between font-mono-code">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-[#7E8F9F] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Warning/Error Block if mapping unapproved or invalid */}
      {!isApproved && (
        <div className="bg-[#0B1B2B] border border-[#FB7185]/40 rounded-xl p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-[#FB7185] mx-auto" />
          <h3 className="font-bold text-base text-[#F1F5F9]">Mapping Blocked: Setup Not Approved</h3>
          <p className="text-xs text-[#7E8F9F] max-w-lg mx-auto">
            The onboarding project status is currently <span className="font-mono-code text-[#FB7185] font-bold">{project.project.status}</span>. Production configuration mapping requires explicit developer approval.
          </p>
        </div>
      )}

      {/* Validation Errors/Warnings Block */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-3">
          {validation.errors.map((err, i) => (
            <div key={`err-${i}`} className="p-3.5 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/40 text-xs text-[#FB7185] flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span><strong>[{err.code}]</strong> {err.message}</span>
            </div>
          ))}
          {validation.warnings.map((warn, i) => (
            <div key={`warn-${i}`} className="p-3.5 rounded-xl bg-[#FBBF24]/10 border border-[#FBBF24]/40 text-xs text-[#FBBF24] flex items-center space-x-2">
              <Info className="w-4 h-4 shrink-0" />
              <span><strong>[{warn.code}]</strong> {warn.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* CONTROLLED INTEGRATION TRANSACTION ACTIONS */}
      {plan && (
        <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-[#F1F5F9] flex items-center space-x-2">
              <Play className="w-4 h-4 text-[#34D399]" />
              <span>Controlled Integration Transaction Actions</span>
            </h3>
            <p className="text-xs text-[#7E8F9F] mt-0.5">
              Execute dry run or simulated apply using development memory persistence adapter.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={handleRunDryRun}
              className="px-4 py-2 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] border border-[#38BDF8]/40 text-[#38BDF8] font-bold text-xs flex items-center space-x-2 cursor-pointer transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Run Dry Run</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSimulating}
              className="px-4 py-2 rounded-lg bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold text-xs flex items-center space-x-2 cursor-pointer transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Run Simulated Apply</span>
            </button>
          </div>
        </div>
      )}

      {/* Last Integration Receipt (If Any) */}
      {lastReceipt && (
        <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-3 font-mono-code text-xs">
          <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-2.5">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-[#38BDF8]" />
              <span className="font-bold text-[#F1F5F9]">Integration Receipt</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                lastReceipt.status === 'SIMULATED_COMMITTED' || lastReceipt.status === 'DRY_RUN_SUCCESS'
                  ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40'
                  : lastReceipt.status === 'ALREADY_APPLIED'
                  ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                  : 'bg-[#FB7185]/20 text-[#FB7185] border border-[#FB7185]/40'
              }`}
            >
              {lastReceipt.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div><span className="text-[#7E8F9F]">Receipt ID:</span> <span className="text-[#38BDF8]">{lastReceipt.integrationId}</span></div>
            <div><span className="text-[#7E8F9F]">Mode:</span> <span className="text-[#F1F5F9]">{lastReceipt.mode}</span></div>
            <div><span className="text-[#7E8F9F]">Operations:</span> <span className="text-[#F1F5F9]">{lastReceipt.operationCount}</span></div>
          </div>
        </div>
      )}

      {/* MAPPED SECTIONS PREVIEW */}
      {config && (
        <div className="space-y-6">
          {/* Section 1: Studio Profile */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E3A4F] pb-3">
              <Building2 className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="font-bold text-sm text-[#F1F5F9]">Mapped Studio Profile</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div><span className="text-[#7E8F9F] block">Studio Name</span><span className="font-bold">{config.studioProfile.name}</span></div>
              <div><span className="text-[#7E8F9F] block">Phone / Email</span><span>{config.studioProfile.phone} • {config.studioProfile.email}</span></div>
              <div className="sm:col-span-2"><span className="text-[#7E8F9F] block">Address</span><span>{config.studioProfile.address}</span></div>
              <div><span className="text-[#7E8F9F] block">Maps Link</span><span>{config.studioProfile.googleMapsUrl || 'Unlisted'}</span></div>
              <div><span className="text-[#7E8F9F] block">Opening Hours</span><span>{config.studioProfile.openingHours || 'Unspecified'}</span></div>
              <div><span className="text-[#7E8F9F] block">Closed Days</span><span>{config.studioProfile.closedDays?.join(', ') || 'None'}</span></div>
            </div>
          </div>

          {/* Section 2: Active Packages */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E3A4F] pb-3">
              <Package className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="font-bold text-sm text-[#F1F5F9]">Mapped Active Packages ({config.bookingPackages.length})</h3>
            </div>

            <div className="space-y-3 text-xs">
              {config.bookingPackages.map((pkg, i) => (
                <div key={pkg.packageId} className="p-3 rounded bg-[#030F1E] border border-[#1E3A4F] space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{i + 1}. {pkg.name} ({pkg.sessionDurationMinutes} mins)</span>
                    <span className="text-[#34D399] font-mono-code">{pkg.price.toLocaleString()} {pkg.currency}</span>
                  </div>
                  <div className="text-[#94A3B8] text-[11px]">{pkg.description || 'No description'}</div>
                  <div className="text-[#7E8F9F] text-[10px] flex space-x-4">
                    <span>Retouched Photos: {pkg.retouchedPhotoCount ?? 'Unlisted'}</span>
                    <span>Deposit Rule: {pkg.depositOverride ? `${pkg.depositOverride.type} (${pkg.depositOverride.value ?? 'None'})` : 'Default'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Active Studio Spaces */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E3A4F] pb-3">
              <Layers className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="font-bold text-sm text-[#F1F5F9]">Mapped Active Spaces ({config.spacesConfiguration.length})</h3>
            </div>

            <div className="space-y-3 text-xs">
              {config.spacesConfiguration.map((sp, i) => (
                <div key={sp.spaceId} className="p-3 rounded bg-[#030F1E] border border-[#1E3A4F] space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{i + 1}. {sp.name}</span>
                    <span className="text-[#38BDF8] font-mono-code text-[11px]">[{sp.primaryUse}]</span>
                  </div>
                  <div className="text-[#94A3B8] text-[11px]">Approx Size: {sp.approximateSize || 'Unlisted'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Payment Configuration */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E3A4F] pb-3">
              <CreditCard className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="font-bold text-sm text-[#F1F5F9]">Mapped Payment Configuration</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded bg-[#030F1E] border border-[#1E3A4F]">
                <div>
                  <span className="text-[#7E8F9F] block">Default Deposit Rule</span>
                  <span className="font-bold text-[#34D399]">
                    {config.paymentConfiguration.defaultDepositRule.type} ({config.paymentConfiguration.defaultDepositRule.value ?? 'None'})
                  </span>
                </div>
                <div>
                  <span className="text-[#7E8F9F] block">Remaining Balance Timing</span>
                  <span>{config.paymentConfiguration.remainingBalanceTiming}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[#7E8F9F] block font-semibold">Enabled Gateways ({config.paymentConfiguration.methods.length}):</span>
                {config.paymentConfiguration.methods.map((m) => (
                  <div key={m.paymentMethodId} className="p-2.5 rounded bg-[#030F1E] border border-[#1E3A4F] flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#F1F5F9]">{m.provider}</span>
                      <span className="text-[11px] text-[#94A3B8] ml-2">{m.accountName || 'No title'}</span>
                    </div>
                    <span className="font-mono-code text-[#38BDF8]">{m.accountIdentifier || 'No identifier'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Effective Invoice Profile (Precedence Resolved) */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3A4F] pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-bold text-sm text-[#F1F5F9]">Mapped Effective Invoice Profile</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#38BDF8]/20 text-[#38BDF8] text-[10px] font-mono-code">
                {config.invoiceProfile.useStudioProfile ? 'Precedence: Inherited from Studio' : 'Custom Profile'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div><span className="text-[#7E8F9F] block">Effective Studio Name</span><span className="font-bold">{config.invoiceProfile.effectiveStudioName}</span></div>
              <div><span className="text-[#7E8F9F] block">Effective Phone / Address</span><span>{config.invoiceProfile.effectivePhone} • {config.invoiceProfile.effectiveAddress}</span></div>
              <div><span className="text-[#7E8F9F] block">Business / Tax Info</span><span>{config.invoiceProfile.businessInfo || 'None'} • {config.invoiceProfile.taxInfo || 'None'}</span></div>
              <div><span className="text-[#7E8F9F] block">Footer Message</span><span>{config.invoiceProfile.footerMessage || 'None'}</span></div>
            </div>
          </div>

          {/* Section 6: Asset Bindings */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E3A4F] pb-3">
              <Sparkles className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="font-bold text-sm text-[#F1F5F9]">Mapped Production Asset Bindings ({config.assetBindings.length})</h3>
            </div>

            <div className="space-y-2 text-xs">
              {config.assetBindings.map((ab, i) => (
                <div key={`${ab.assetId}-${i}`} className="p-2.5 rounded bg-[#030F1E] border border-[#1E3A4F] flex justify-between items-center">
                  <div>
                    <span className="font-mono-code text-[#38BDF8] font-bold">{ab.assetId}</span>
                    <span className="text-[#94A3B8] text-[11px] ml-2">{ab.originalFilename} ({ab.category})</span>
                  </div>
                  <span className="text-[10px] text-[#7E8F9F]">Field: {ab.sourceField}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Integration Persistence Boundary Footer Button */}
          <div className="p-5 rounded-xl bg-[#0B1B2B] border border-[#1E3A4F] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Database className="w-6 h-6 text-[#34D399]" />
              <div>
                <h4 className="font-bold text-sm text-[#F1F5F9]">Production Database Boundary</h4>
                <p className="text-xs text-[#7E8F9F]">
                  {validation?.readinessState === 'READY_FOR_INTEGRATION'
                    ? 'Configuration is validated and ready for future persistence adapter invocation.'
                    : 'Configuration has outstanding validation errors blocking integration.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="px-5 py-2 rounded-lg bg-[#102538] border border-[#1E3A4F] text-[#7E8F9F] font-bold text-xs flex items-center space-x-2 cursor-not-allowed opacity-80 shrink-0"
              title="Database persistence is disabled in Phase 10.5 & 10.6"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ready for Integration (Persistence Disabled)</span>
            </button>
          </div>
        </div>
      )}

      {/* SIMULATED APPLY CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070E]/80 backdrop-blur-md">
          <div className="bg-[#0B1B2B] border border-[#38BDF8]/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-[#38BDF8]">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="font-bold text-lg text-[#F1F5F9]">Confirm Simulated Apply</h3>
            </div>

            <div className="p-3 rounded-xl bg-[#102538] border border-[#1E3A4F] text-xs text-[#94A3B8] space-y-1.5">
              <p className="font-semibold text-[#F1F5F9]">
                This is a development transaction simulation.
              </p>
              <p>No production database will be modified.</p>
              <p className="text-[11px] text-[#7E8F9F]">
                Operations will be executed in memory via <code className="text-[#38BDF8]">{developmentMemoryAdapter.adapterName}</code> to verify idempotency and rollback capabilities.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-[#102538] border border-[#1E3A4F] text-xs text-[#94A3B8] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSimulatedApply}
                className="px-4 py-2 rounded-lg bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold text-xs cursor-pointer"
              >
                Confirm Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
