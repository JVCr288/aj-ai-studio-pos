import React, { useState, useEffect } from 'react';
import {
  StudioOnboardingProject,
  ProductionIntegrationPlan,
  IntegrationReceipt,
  IntegrationStatus,
} from '../types';
import { loadOnboardingDraft } from '../services/onboardingPersistenceService';
import { ONBOARDING_CONFIGURATION_MAPPER_VERSION } from '../services/onboardingConfigurationMapper';
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
  ArrowRight,
  Database,
  Play,
  RotateCcw,
  History,
  FileCode,
} from 'lucide-react';

interface StudioOnboardingIntegrationPreviewConsoleProps {
  projectId?: string;
  onClose?: () => void;
}

export const StudioOnboardingIntegrationPreviewConsole: React.FC<
  StudioOnboardingIntegrationPreviewConsoleProps
> = ({ projectId = 'proj-akk-studio-01', onClose }) => {
  const [project, setProject] = useState<StudioOnboardingProject | null>(null);
  const [plan, setPlan] = useState<ProductionIntegrationPlan | null>(null);
  const [lastReceipt, setLastReceipt] = useState<IntegrationReceipt | null>(null);
  const [dryRunResult, setDryRunResult] = useState<ReturnType<typeof performDryRun> | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    const data = await loadOnboardingDraft(projectId);
    if (data) {
      setProject(data);
      const res = createIntegrationPlan(data);
      if (res.plan) {
        setPlan(res.plan);
        const existing = developmentMemoryAdapter.checkIdempotency(res.plan.idempotencyKey);
        if (existing) {
          setLastReceipt(existing);
        }
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (!project) {
    return (
      <div className="p-8 text-center text-[#7E8F9F] font-mono-code text-xs">
        Loading Controlled Integration Transaction Console...
      </div>
    );
  }

  const isApproved = project.project.status === 'APPROVED';

  const handleRunDryRun = () => {
    if (!plan) return;
    const res = performDryRun(plan);
    setDryRunResult(res);
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
    <div className="w-full max-w-5xl mx-auto space-y-6 font-ui text-[#F1F5F9] pb-12 relative">
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
                Controlled Integration Transaction Preview
              </h1>
              <span className="px-2.5 py-0.5 rounded bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 text-[10px] font-mono-code font-semibold">
                Plan v{INTEGRATION_PLAN_VERSION} • Mapper v{ONBOARDING_CONFIGURATION_MAPPER_VERSION}
              </span>
            </div>
            <p className="text-xs text-[#7E8F9F] mt-1">
              Verifies transaction boundary, deterministic operation model, idempotency keys, dry runs, and atomic simulated rollback.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {plan?.validation ? (
              <span
                className={`px-3 py-1.5 rounded-md border text-xs font-semibold font-mono-code flex items-center space-x-1.5 ${
                  plan.validation.readinessState === 'READY_FOR_INTEGRATION'
                    ? 'bg-[#34D399]/20 text-[#34D399] border-[#34D399]/40'
                    : 'bg-[#FB7185]/20 text-[#FB7185] border-[#FB7185]/40'
                }`}
              >
                {plan.validation.readinessState === 'READY_FOR_INTEGRATION' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#FB7185]" />
                )}
                <span>{plan.validation.readinessState}</span>
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

        {/* Source Provenance & Idempotency Bar */}
        {plan && (
          <div className="pt-3 border-t border-[#1E3A4F] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
            <div>
              <span className="text-[#7E8F9F] block text-[10px]">Source Submission ID</span>
              <span className="text-[#38BDF8] font-bold">{plan.source.approvedSubmissionId}</span>
            </div>
            <div>
              <span className="text-[#7E8F9F] block text-[10px]">Idempotency Key</span>
              <span className="font-bold text-[#34D399] truncate block" title={plan.idempotencyKey}>
                {plan.idempotencyKey}
              </span>
            </div>
            <div>
              <span className="text-[#7E8F9F] block text-[10px]">Operation Count</span>
              <span className="text-[#F1F5F9] font-bold">{plan.operations.length} Operations</span>
            </div>
            <div>
              <span className="text-[#7E8F9F] block text-[10px]">Project Status</span>
              <span className="text-[#FBBF24] font-bold">{project.project.status} (Unchanged)</span>
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

      {/* Warning Block if unapproved */}
      {!isApproved && (
        <div className="bg-[#0B1B2B] border border-[#FB7185]/40 rounded-xl p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-[#FB7185] mx-auto" />
          <h3 className="font-bold text-base text-[#F1F5F9]">Integration Blocked: Source Not Approved</h3>
          <p className="text-xs text-[#7E8F9F] max-w-lg mx-auto">
            The onboarding project status is <span className="font-mono-code text-[#FB7185] font-bold">{project.project.status}</span>. Integration plan generation requires an APPROVED submission snapshot.
          </p>
        </div>
      )}

      {/* DETERMINISTIC INTEGRATION OPERATIONS PLAN */}
      {plan && (
        <div className="space-y-6">
          {/* Action Control Panel */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-[#F1F5F9] flex items-center space-x-2">
                <Play className="w-4 h-4 text-[#34D399]" />
                <span>Execute Controlled Integration Transaction</span>
              </h3>
              <p className="text-xs text-[#7E8F9F] mt-0.5">
                Run zero-side-effect dry run or simulate transaction apply using development memory adapter.
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
                <div><span className="text-[#7E8F9F]">Started:</span> <span className="text-[#94A3B8]">{new Date(lastReceipt.startedAt).toLocaleTimeString()}</span></div>
                <div><span className="text-[#7E8F9F]">Completed:</span> <span className="text-[#94A3B8]">{new Date(lastReceipt.completedAt).toLocaleTimeString()}</span></div>
                <div><span className="text-[#7E8F9F]">Warnings:</span> <span className="text-[#FBBF24]">{lastReceipt.warnings.length}</span></div>
              </div>

              {lastReceipt.error && (
                <div className="p-2.5 rounded bg-[#FB7185]/10 border border-[#FB7185]/40 text-[#FB7185] text-[11px]">
                  <strong>[{lastReceipt.error.code}]</strong> {lastReceipt.error.message}
                </div>
              )}
            </div>
          )}

          {/* Operations List */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-3">
              <h3 className="font-bold text-sm text-[#F1F5F9] flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#38BDF8]" />
                <span>Deterministic Operations Sequence ({plan.operations.length})</span>
              </h3>
              <span className="text-xs text-[#7E8F9F] font-mono-code">Order: Profile → Pkgs → Spaces → Payment → Rules → Invoice → Assets</span>
            </div>

            <div className="space-y-2.5 font-mono-code text-xs">
              {plan.operations.map((op) => (
                <div
                  key={op.operationId}
                  className="p-3 rounded-lg bg-[#030F1E] border border-[#1E3A4F] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded bg-[#102538] border border-[#38BDF8]/30 text-[#38BDF8] flex items-center justify-center text-[10px] font-bold">
                      #{op.sequence}
                    </span>
                    <div>
                      <div className="font-bold text-[#F1F5F9] flex items-center space-x-2">
                        <span>{op.type}</span>
                        <span className="text-[10px] text-[#7E8F9F]">({op.operationId})</span>
                      </div>
                      <div className="text-[11px] text-[#38BDF8]">targetKey: {op.targetKey}</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#94A3B8] bg-[#071423] p-2 rounded border border-[#1E3A4F]/60 max-w-xs truncate">
                    {JSON.stringify(op.payload)}
                  </div>
                </div>
              ))}
            </div>
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
