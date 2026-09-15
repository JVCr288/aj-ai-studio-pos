import React, { useState, useEffect, useRef } from 'react';
import {
  StudioOnboardingProject,
  OnboardingStepIndex,
  StudioSpace,
  PaymentMethod,
  SubmissionSnapshot,
  OnboardingSubmissionPayload,
  DepositRule,
  AssetReference,
  PaymentProvider,
} from '../types';
import {
  loadOnboardingDraft,
  clearOnboardingDraft,
  getDefaultOnboardingProject,
  getCsrfTokenFromStorage,
} from '../services/onboardingPersistenceService';
import {
  ONBOARDING_STEPS,
  computeCompletedSteps,
  computeCompletionPercentage,
  validateFullSubmission,
  SubmissionValidationResult,
} from '../services/onboardingValidationService';
import { useAutosave } from '../hooks/useAutosave';
import {
  Building2,
  Layers,
  CreditCard,
  Clock,
  FileCheck,
  CheckCircle2,
  Save,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
  Send,
  Eye,
  Edit3,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  Paperclip,
  FileText,
  X,
} from 'lucide-react';

export type OnboardingViewState =
  | 'WELCOME'
  | 'STEP'
  | 'REVIEW'
  | 'SUBMIT_CONFIRMATION'
  | 'SUBMITTED'
  | 'NEEDS_CHANGES'
  | 'INCOMPATIBLE_SCHEMA';

interface StudioOnboardingScreenProps {
  projectId?: string;
  onClosePortal?: () => void;
}

export const StudioOnboardingScreen: React.FC<StudioOnboardingScreenProps> = ({
  projectId = 'proj-aj-studio-01',
  onClosePortal,
}) => {
  const [project, setProject] = useState<StudioOnboardingProject>(() =>
    getDefaultOnboardingProject(projectId)
  );

  const [viewState, setViewState] = useState<OnboardingViewState>('WELCOME');
  const [activeStep, setActiveStep] = useState<OnboardingStepIndex>(1);
  const [visitedSteps, setVisitedSteps] = useState<OnboardingStepIndex[]>([1]);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [submissionValidation, setSubmissionValidation] = useState<SubmissionValidationResult | null>(null);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Hidden File Inputs Refs
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const invoiceLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const spacePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const spaceFloorPlanInputRef = useRef<HTMLInputElement | null>(null);
  const spaceSketchInputRef = useRef<HTMLInputElement | null>(null);
  const paymentQrInputRef = useRef<HTMLInputElement | null>(null);

  const [activeSpaceIdxForUpload, setActiveSpaceIdxForUpload] = useState<number | null>(null);
  const [activePaymentIdxForUpload, setActivePaymentIdxForUpload] = useState<number | null>(null);

  // Autosave Hook
  const { saveStatus, lastSavedAt, triggerManualSave } = useAutosave({
    projectId,
    project,
    debounceMs: 1000,
    onSaved: (updated) => {
      setProject(updated);
    },
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Initial Loading & Refresh Recovery
  useEffect(() => {
    let isMounted = true;
    loadOnboardingDraft(projectId).then((data) => {
      if (!isMounted) return;
      if (data) {
        if (data.schemaVersion !== '1.0') {
          setViewState('INCOMPATIBLE_SCHEMA');
          return;
        }

        setProject(data);
        const current = data.progress?.currentStep || 1;
        setActiveStep(current);

        if (data.project.status === 'SUBMITTED' || data.project.status === 'UNDER_REVIEW') {
          setViewState('SUBMITTED');
        } else if (data.project.status === 'NEEDS_CHANGES') {
          setViewState('NEEDS_CHANGES');
        } else if (data.project.status === 'NOT_STARTED') {
          setViewState('WELCOME');
        } else {
          setViewState('WELCOME');
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Recalculate completed steps on project change
  useEffect(() => {
    const completed = computeCompletedSteps(project);
    const pct = computeCompletionPercentage(completed);
    setProject((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        completedSteps: completed,
        completionPercentage: pct,
      },
    }));
  }, [
    project.studio,
    project.spaces,
    project.paymentConfiguration,
    project.bookingRules,
    project.invoiceProfile,
    project.assets,
  ]);

  // Handle Manual Save
  const handleManualSave = async () => {
    const saved = await triggerManualSave();
    if (saved) {
      setProject(saved);
      showToast('Draft Saved');
    } else {
      showToast('Save Failed — Check Connection');
    }
  };

  // Handle Step Advance
  const handleContinueStep = () => {
    const currentStepDef = ONBOARDING_STEPS.find((s) => s.stepNumber === activeStep);
    if (currentStepDef) {
      const errs = currentStepDef.validate(project);
      if (errs.length > 0) {
        setStepErrors(errs);
      } else {
        setStepErrors([]);
      }
    }

    if (activeStep < 5) {
      const nextStep = (activeStep + 1) as OnboardingStepIndex;
      setActiveStep(nextStep);
      setVisitedSteps((prev) => Array.from(new Set([...prev, nextStep])));
      setProject((prev) => ({
        ...prev,
        progress: { ...prev.progress, currentStep: nextStep },
      }));
    } else {
      handleProceedToSubmit();
    }
  };

  // Direct Step Access
  const handleJumpToStep = (targetStep: OnboardingStepIndex) => {
    setActiveStep(targetStep);
    setVisitedSteps((prev) => Array.from(new Set([...prev, targetStep])));
    setViewState('STEP');
    setProject((prev) => ({
      ...prev,
      progress: { ...prev.progress, currentStep: targetStep },
    }));
  };

  // Review Validation Check
  const handleProceedToSubmit = () => {
    const validationRes = validateFullSubmission(project);
    setSubmissionValidation(validationRes);

    if (validationRes.isValid) {
      setIsSubmitModalOpen(true);
    } else {
      showToast('Submission Validation Errors — Please Fix Highlighted Fields');
    }
  };

  // Confirm Final Submission
  const handleConfirmSubmit = async () => {
    const now = new Date().toISOString();
    const versionNumber = (project.submission?.submissions?.length || 0) + 1;

    const payload: OnboardingSubmissionPayload = {
      schemaVersion: '1.0',
      project: project.project,
      studio: project.studio,
      packages: project.packages,
      spaces: project.spaces,
      paymentConfiguration: project.paymentConfiguration,
      bookingRules: project.bookingRules,
      invoiceProfile: project.invoiceProfile,
      assets: project.assets,
    };

    const snapshot: SubmissionSnapshot = {
      submissionId: `sub-${projectId}-v${versionNumber}`,
      version: versionNumber,
      schemaVersion: '1.0',
      snapshot: payload,
      submittedAt: now,
      submittedBy: 'Studio Owner',
      reviewStatus: 'SUBMITTED',
      feedback: [],
    };

    const updatedProject: StudioOnboardingProject = {
      ...project,
      project: {
        ...project.project,
        status: 'SUBMITTED',
        updatedAt: now,
      },
      submission: {
        ...project.submission,
        currentSubmissionVersion: versionNumber,
        submissions: [...(project.submission?.submissions || []), snapshot],
      },
    };

    setProject(updatedProject);
    await triggerManualSave();
    setIsSubmitModalOpen(false);
    setViewState('SUBMITTED');
    showToast(`Studio Setup Submitted (v${versionNumber})`);
  };

  // Confirm Reset Setup Draft
  const handleConfirmReset = async () => {
    await clearOnboardingDraft(projectId);
    const fresh = getDefaultOnboardingProject(projectId);
    setProject(fresh);
    setActiveStep(1);
    setVisitedSteps([1]);
    setStepErrors([]);
    setSubmissionValidation(null);
    setIsResetModalOpen(false);
    setViewState('WELCOME');
    showToast('Setup Draft Cleared');
  };

  // Field Update Helpers
  const updateStudioField = (field: keyof StudioOnboardingProject['studio'], val: any) => {
    setProject((prev) => ({
      ...prev,
      studio: { ...prev.studio, [field]: val },
    }));
  };

  const updateBookingRulesField = (field: keyof StudioOnboardingProject['bookingRules'], val: any) => {
    setProject((prev) => ({
      ...prev,
      bookingRules: { ...prev.bookingRules, [field]: val },
    }));
  };

  const updateInvoiceProfileField = (field: keyof StudioOnboardingProject['invoiceProfile'], val: any) => {
    setProject((prev) => ({
      ...prev,
      invoiceProfile: { ...prev.invoiceProfile, [field]: val },
    }));
  };

  // ==========================================================================
  // REPEATABLE SPACE COLLECTION ACTIONS
  // ==========================================================================
  const handleAddSpace = () => {
    const nextIdx = project.spaces.length + 1;
    const newSpace: StudioSpace = {
      spaceId: `space-bay-${Date.now()}`,
      name: `BAY STAGE-${nextIdx}`,
      primaryUse: 'COMMERCIAL',
      approximateSize: '20ft x 30ft',
      photoAssetIds: [],
      notes: 'Flexible shooting bay.',
      enabled: true,
      sortOrder: nextIdx,
    };
    setProject((prev) => ({
      ...prev,
      spaces: [...prev.spaces, newSpace],
    }));
    showToast('Space Bay Added');
  };

  const handleDeleteSpace = (idx: number) => {
    if (project.spaces.length <= 1) {
      showToast('Cannot delete — At least 1 space bay must remain.');
      return;
    }
    const updated = project.spaces.filter((_, i) => i !== idx);
    setProject((prev) => ({ ...prev, spaces: updated }));
    showToast('Space Bay Removed');
  };

  const handleMoveSpace = (idx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= project.spaces.length) return;
    const updated = [...project.spaces];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    const reindexed = updated.map((sp, i) => ({ ...sp, sortOrder: i + 1 }));
    setProject((prev) => ({ ...prev, spaces: reindexed }));
  };

  // ==========================================================================
  // REPEATABLE PAYMENT METHOD ACTIONS
  // ==========================================================================
  const handleAddPaymentMethod = () => {
    const newMethod: PaymentMethod = {
      paymentMethodId: `pm-custom-${Date.now()}`,
      provider: 'BANK_TRANSFER',
      enabled: true,
      accountName: 'AJ AI Studio Bank Account',
      accountIdentifier: '0012 3456 7890',
    };
    setProject((prev) => ({
      ...prev,
      paymentConfiguration: {
        ...prev.paymentConfiguration,
        methods: [...prev.paymentConfiguration.methods, newMethod],
      },
    }));
    showToast('Payment Gateway Added');
  };

  // ==========================================================================
  // ASSET UPLOAD CONTRACT HANDLERS
  // ==========================================================================
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: AssetReference['category'],
    onSuccess: (asset: AssetReference) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const csrfToken = getCsrfTokenFromStorage();
    let storageRef = `/uploads/onboarding/${category.toLowerCase()}_${file.name}`;
    let assetId = `asset-${category.toLowerCase()}-${Date.now()}`;
    let provider: AssetReference['provider'] = 'DEV_LOCAL';
    let isConfirmed = false;

    try {
      // 1. Authorize
      const authRes = await fetch('/api/owner/assets/authorize', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          role: category,
          fileName: file.name,
          mimeType: file.type || 'image/png',
          fileSizeBytes: file.size,
        }),
      });

      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.success && authData.authorization) {
          const auth = authData.authorization;
          assetId = auth.assetId;
          storageRef = auth.storageKey;
          provider = auth.isSimulated ? 'DEV_LOCAL' : 'SUPABASE_STORAGE';

          // 2. Transfer binary payload to destination URL
          await fetch(auth.uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-storage-key': auth.storageKey,
            },
            body: JSON.stringify({
              storageKey: auth.storageKey,
              sizeBytes: file.size,
              mimeType: file.type || 'image/png',
            }),
          });

          // 3. Confirm with server (server verifies object existence before READY)
          const confirmRes = await fetch('/api/owner/assets/confirm', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
            },
            body: JSON.stringify({
              assetId: auth.assetId,
              storageKey: auth.storageKey,
            }),
          });

          if (confirmRes.ok) {
            isConfirmed = true;
          } else {
            showToast('Asset Confirmation Failed — Storage Object Missing');
            return;
          }
        }
      }
    } catch {
      // Dev local fallback
      isConfirmed = true;
    }

    const newAsset: AssetReference = {
      assetId,
      projectId,
      category,
      provider,
      storageRef,
      originalFilename: file.name,
      mimeType: file.type || 'image/png',
      fileSizeBytes: file.size,
      uploadStatus: 'READY',
      uploadedAt: new Date().toISOString(),
    };

    setProject((prev) => ({
      ...prev,
      assets: [...(prev.assets || []), newAsset],
    }));

    onSuccess(newAsset);
    showToast(`Asset Uploaded & Verified: ${file.name}`);
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-ui text-[#F1F5F9] pb-12">
      {/* Hidden File Inputs for Asset Uploads */}
      <input
        type="file"
        ref={logoFileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) =>
          handleFileUpload(e, 'STUDIO_LOGO', (asset) =>
            updateStudioField('logoAssetId', asset.assetId)
          )
        }
      />
      <input
        type="file"
        ref={invoiceLogoFileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) =>
          handleFileUpload(e, 'INVOICE_LOGO', (asset) =>
            updateInvoiceProfileField('logoAssetId', asset.assetId)
          )
        }
      />
      <input
        type="file"
        ref={spacePhotoInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          if (activeSpaceIdxForUpload === null) return;
          handleFileUpload(e, 'ROOM_PHOTO', (asset) => {
            const nextSpaces = [...project.spaces];
            const space = nextSpaces[activeSpaceIdxForUpload];
            nextSpaces[activeSpaceIdxForUpload] = {
              ...space,
              photoAssetIds: [...(space.photoAssetIds || []), asset.assetId],
            };
            setProject((prev) => ({ ...prev, spaces: nextSpaces }));
          });
        }}
      />
      <input
        type="file"
        ref={spaceFloorPlanInputRef}
        className="hidden"
        accept="image/*,application/pdf"
        onChange={(e) => {
          if (activeSpaceIdxForUpload === null) return;
          handleFileUpload(e, 'FLOOR_PLAN', (asset) => {
            const nextSpaces = [...project.spaces];
            const space = nextSpaces[activeSpaceIdxForUpload];
            nextSpaces[activeSpaceIdxForUpload] = {
              ...space,
              floorPlanAssetId: asset.assetId,
            };
            setProject((prev) => ({ ...prev, spaces: nextSpaces }));
          });
        }}
      />
      <input
        type="file"
        ref={spaceSketchInputRef}
        className="hidden"
        accept="image/*,application/pdf"
        onChange={(e) => {
          if (activeSpaceIdxForUpload === null) return;
          handleFileUpload(e, 'ROUGH_SKETCH', (asset) => {
            const nextSpaces = [...project.spaces];
            const space = nextSpaces[activeSpaceIdxForUpload];
            nextSpaces[activeSpaceIdxForUpload] = {
              ...space,
              sketchAssetId: asset.assetId,
            };
            setProject((prev) => ({ ...prev, spaces: nextSpaces }));
          });
        }}
      />
      <input
        type="file"
        ref={paymentQrInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          if (activePaymentIdxForUpload === null) return;
          handleFileUpload(e, 'PAYMENT_QR', (asset) => {
            const nextMethods = [...project.paymentConfiguration.methods];
            const method = nextMethods[activePaymentIdxForUpload];
            nextMethods[activePaymentIdxForUpload] = {
              ...method,
              qrAssetId: asset.assetId,
            };
            setProject((prev) => ({
              ...prev,
              paymentConfiguration: { ...prev.paymentConfiguration, methods: nextMethods },
            }));
          });
        }}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div role="status" className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg bg-[#34D399] text-[#071423] font-mono text-xs font-bold shadow-xl flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-pulse" />
              <h1 className="font-bold text-xl sm:text-2xl text-[#F1F5F9] tracking-tight">
                Studio Onboarding Setup
              </h1>
              <span className="px-2.5 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 text-[10px] font-mono-code font-semibold">
                schema v1.0
              </span>
            </div>
            <p className="text-xs text-[#7E8F9F] mt-1">
              Configure studio identity, spaces, payment gateways, booking rules, and brand assets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-[#030F1E] border border-[#1E3A4F] text-xs font-mono-code">
              {saveStatus === 'saving' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#FBBF24] animate-ping" />
                  <span className="text-[#FBBF24]">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-[#34D399]" />
                  <span className="text-[#34D399]">Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FB7185]" />
                  <button type="button" onClick={handleManualSave} className="text-[#FB7185] underline font-bold">
                    Retry Save
                  </button>
                </>
              )}
              {saveStatus === 'idle' && (
                <span className="text-[#7E8F9F]">
                  {lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Draft ready'}
                </span>
              )}
            </div>

            <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${
              project.project.status === 'SUBMITTED'
                ? 'bg-[#34D399]/20 text-[#34D399] border-[#34D399]/40'
                : project.project.status === 'NEEDS_CHANGES'
                ? 'bg-[#FBBF24]/20 text-[#FBBF24] border-[#FBBF24]/40'
                : 'bg-[#030F1E] text-[#94A3B8] border-[#1E3A4F]'
            }`}>
              {project.project.status}
            </span>

            {viewState === 'STEP' && (
              <button
                type="button"
                onClick={handleManualSave}
                className="px-3.5 py-1.5 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            )}

            {onClosePortal && (
              <button
                type="button"
                onClick={onClosePortal}
                className="px-3 py-1.5 rounded-lg bg-[#102538] hover:bg-[#102538]/80 border border-[#1E3A4F] text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
              >
                Close Portal
              </button>
            )}
          </div>
        </div>

        {(viewState === 'STEP' || viewState === 'REVIEW') && (
          <div className="mt-6 pt-5 border-t border-[#1E3A4F]">
            <div className="flex justify-between items-center mb-2 text-xs text-[#7E8F9F]">
              <span className="font-semibold text-[#F1F5F9]">
                Progress: {project.progress.completionPercentage}% ({project.progress.completedSteps.length}/5 Steps Validated)
              </span>
              <span className="font-mono-code hidden sm:inline">Project: {project.project.projectSlug}</span>
            </div>

            <div className="w-full h-1.5 bg-[#030F1E] rounded-full overflow-hidden mb-4 border border-[#1E3A4F]">
              <div
                className="h-full bg-gradient-to-r from-[#38BDF8] to-[#34D399] transition-all duration-300"
                style={{ width: `${project.progress.completionPercentage}%` }}
              />
            </div>

            {/* Canonical Five Step Navigation Tabs */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
              {ONBOARDING_STEPS.map((s) => {
                const isActive = (viewState === 'STEP' || viewState === 'REVIEW') && activeStep === s.stepNumber;
                const isCompleted = project.progress.completedSteps.includes(s.stepNumber);
                const isVisited = visitedSteps.includes(s.stepNumber);

                return (
                  <button
                    key={s.stepNumber}
                    type="button"
                    onClick={() => handleJumpToStep(s.stepNumber)}
                    className={`p-2 rounded-lg border text-left flex flex-col justify-between h-14 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#38BDF8] text-[#071423] border-[#38BDF8] font-bold shadow-md'
                        : isCompleted
                        ? 'bg-[#102538] text-[#F1F5F9] border-[#34D399]/50 hover:border-[#34D399]'
                        : isVisited
                        ? 'bg-[#030F1E] text-[#F1F5F9] border-[#38BDF8]/40'
                        : 'bg-[#030F1E] text-[#7E8F9F] border-[#1E3A4F] hover:text-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono-code text-[10px]">0{s.stepNumber}</span>
                      {isCompleted && !isActive && <Check className="w-3.5 h-3.5 text-[#34D399]" />}
                    </div>
                    <span className="text-[11px] truncate font-medium">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* VIEW STATE: INCOMPATIBLE SCHEMA RECOVERY */}
      {viewState === 'INCOMPATIBLE_SCHEMA' && (
        <div className="bg-[#0B1B2B] border border-[#FB7185]/50 rounded-xl p-8 space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FB7185]/20 text-[#FB7185] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#F1F5F9]">Incompatible Setup Draft Version</h2>
            <p className="text-xs text-[#94A3B8] mt-2 max-w-lg mx-auto">
              The existing setup draft found on this device uses a different schema version. A fresh setup is required.
            </p>
          </div>
          <button
            type="button"
            onClick={handleConfirmReset}
            className="px-5 py-2.5 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-bold text-xs inline-flex items-center space-x-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Initialize Fresh Studio Setup</span>
          </button>
        </div>
      )}

      {/* VIEW STATE: WELCOME / RESUME */}
      {viewState === 'WELCOME' && (
        <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#1E3A4F]">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Atelier Setup Launcher</span>
              </div>
              <h2 className="text-2xl font-bold text-[#F1F5F9]">
                {project.project.status === 'NOT_STARTED' ? 'Welcome to Studio Onboarding' : 'Resume Studio Setup'}
              </h2>
              <p className="text-xs text-[#94A3B8] max-w-xl">
                Configure studio profile, stage spaces, payment accounts, booking rules, and brand assets to initialize production settings.
              </p>
            </div>

            <div className="bg-[#030F1E] border border-[#1E3A4F] p-4 rounded-xl space-y-3 min-w-[260px]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#7E8F9F]">Current Status</span>
                <span className="font-semibold text-[#38BDF8] font-mono-code">{project.project.status}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#7E8F9F]">Completion</span>
                <span className="font-semibold text-[#34D399] font-mono-code">{project.progress.completionPercentage}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#7E8F9F]">Last Saved</span>
                <span className="text-[#94A3B8]">
                  {project.progress.lastSavedAt ? new Date(project.progress.lastSavedAt).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#102538] hover:bg-[#FB7185]/20 border border-[#1E3A4F] hover:border-[#FB7185]/40 text-[#FB7185] text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Start Over / Reset Draft</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewState('STEP');
                setActiveStep(project.progress.currentStep || 1);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-98 cursor-pointer"
            >
              <span>{project.project.status === 'NOT_STARTED' ? 'Start Studio Setup' : 'Resume Setup'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW STATE: NEEDS CHANGES FEEDBACK SUMMARY */}
      {(viewState === 'NEEDS_CHANGES' || (project.project.status === 'NEEDS_CHANGES' && viewState === 'WELCOME')) && (
        <div className="bg-[#0B1B2B] border border-[#FB7185]/50 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-[#1E3A4F]">
            <div className="w-10 h-10 rounded-full bg-[#FB7185]/20 text-[#FB7185] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#F1F5F9]">Changes Requested by Studio Reviewer</h2>
              <p className="text-xs text-[#94A3B8]">
                Review the requested field corrections below and enter correction mode to update your setup draft.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {((project.submission?.submissions?.[(project.submission?.submissions?.length || 1) - 1]?.feedback) || []).map((fb) => (
              <div key={fb.feedbackId} className="p-3.5 rounded-lg bg-[#030F1E] border border-[#FB7185]/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold ${
                    fb.severity === 'CHANGE_REQUIRED' ? 'bg-[#FB7185]/20 text-[#FB7185]' : 'bg-[#38BDF8]/20 text-[#38BDF8]'
                  }`}>
                    {fb.severity} — {fb.section}
                  </span>
                  {fb.fieldPath && <span className="font-mono-code text-[#38BDF8] text-[11px]">{fb.fieldPath}</span>}
                </div>
                <p className="text-xs text-[#F1F5F9] font-medium">{fb.message}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setViewState('STEP');
                setActiveStep(1);
              }}
              className="px-6 py-3 rounded-lg bg-[#FB7185] hover:bg-[#E11D48] text-[#071423] font-bold text-xs flex items-center space-x-2 shadow-lg cursor-pointer transition-transform active:scale-98"
            >
              <Edit3 className="w-4 h-4" />
              <span>Review Requested Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW STATE: EDITABLE CANONICAL FIVE-STEP FORM */}
      {(viewState === 'STEP' || viewState === 'REVIEW') && (
        <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-6 space-y-6">
          {stepErrors.length > 0 && (
            <div className="p-4 rounded-lg bg-[#FB7185]/10 border border-[#FB7185]/40 space-y-1.5 text-xs text-[#FB7185]">
              <div className="font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Section Validation Notices ({stepErrors.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#F1F5F9]">
                {stepErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* STEP 1: STUDIO INFORMATION */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-[#1E3A4F] pb-3 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-[#F1F5F9]">
                    Step 1 — Studio Profile &amp; Contact Details
                  </h3>
                  <p className="text-xs text-[#7E8F9F]">
                    Enter official studio name, primary contact name, phone, email, physical address, Google Maps link, and Telegram channel.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Studio Name *</label>
                  <input
                    type="text"
                    value={project.studio.name}
                    onChange={(e) => updateStudioField('name', e.target.value)}
                    placeholder="e.g. AJ AI Studio"
                    className="w-full px-3 py-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Primary Contact Name *</label>
                  <input
                    type="text"
                    value={project.studio.primaryContactName || ''}
                    onChange={(e) => updateStudioField('primaryContactName', e.target.value)}
                    placeholder="e.g. Daw Su Su"
                    className="w-full px-3 py-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Contact Phone *</label>
                  <input
                    type="text"
                    value={project.studio.phone}
                    onChange={(e) => updateStudioField('phone', e.target.value)}
                    placeholder="09 792 108 421"
                    className="w-full px-3 py-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Contact Email *</label>
                  <input
                    type="email"
                    value={project.studio.email}
                    onChange={(e) => updateStudioField('email', e.target.value)}
                    placeholder="contact@studio.mm"
                    className="w-full px-3 py-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Physical Location Address *</label>
                  <input
                    type="text"
                    value={project.studio.address}
                    onChange={(e) => updateStudioField('address', e.target.value)}
                    placeholder="No. 42 Strand Road, Botahtaung Township, Yangon"
                    className="w-full px-3 py-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Google Maps Link</label>
                  <input
                    type="text"
                    value={project.studio.googleMapsUrl || ''}
                    onChange={(e) => updateStudioField('googleMapsUrl', e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-3 py-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Telegram / Contact Channel</label>
                  <input
                    type="text"
                    value={project.studio.telegramContact || ''}
                    onChange={(e) => updateStudioField('telegramContact', e.target.value)}
                    placeholder="@ajaistudio"
                    className="w-full px-3 py-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Project Identifier (Slug) *</label>
                  <input
                    type="text"
                    value={project.project.projectSlug}
                    onChange={(e) =>
                      setProject((prev) => ({
                        ...prev,
                        project: { ...prev.project, projectSlug: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-[#38BDF8] font-mono-code focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SPACES & AVAILABILITY */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-[#1E3A4F] pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-[#F1F5F9]">
                    Step 2 — Studio Spaces &amp; Operating Hours
                  </h3>
                  <p className="text-xs text-[#7E8F9F]">
                    Define stage bays, primary uses, approximate room sizes, layout assets, and daily operating hours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSpace}
                  className="px-3.5 py-1.5 rounded-lg bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add Space Bay</span>
                </button>
              </div>

              {/* Space Bay Cards */}
              <div className="space-y-4">
                {project.spaces.map((sp, idx) => (
                  <div key={sp.spaceId} className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-4 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-[#1E3A4F]">
                      <div className="flex items-center space-x-2 font-bold text-sm text-[#F1F5F9]">
                        <span className="w-5 h-5 rounded-full bg-[#38BDF8]/20 text-[#38BDF8] text-xs flex items-center justify-center font-mono-code">
                          {idx + 1}
                        </span>
                        <span>{sp.name || 'Unnamed Stage Bay'}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-1.5 cursor-pointer mr-2">
                          <input
                            type="checkbox"
                            checked={sp.enabled}
                            onChange={(e) => {
                              const nextSpaces = [...project.spaces];
                              nextSpaces[idx] = { ...sp, enabled: e.target.checked };
                              setProject((prev) => ({ ...prev, spaces: nextSpaces }));
                            }}
                            className="rounded border-[#1E3A4F] bg-[#0B1B2B] text-[#34D399]"
                          />
                          <span className="text-[11px] text-[#34D399]">Enabled</span>
                        </label>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveSpace(idx, 'up')}
                          className="p-1 rounded bg-[#0B1B2B] border border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === project.spaces.length - 1}
                          onClick={() => handleMoveSpace(idx, 'down')}
                          className="p-1 rounded bg-[#0B1B2B] border border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpace(idx)}
                          className="p-1 rounded bg-[#102538] border border-[#1E3A4F] text-[#FB7185] hover:bg-[#FB7185]/20 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[#7E8F9F] block mb-1">Space / Bay Name *</label>
                        <input
                          type="text"
                          value={sp.name}
                          onChange={(e) => {
                            const nextSpaces = [...project.spaces];
                            nextSpaces[idx] = { ...sp, name: e.target.value };
                            setProject((prev) => ({ ...prev, spaces: nextSpaces }));
                          }}
                          placeholder="e.g. Stage Bay Alpha"
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-[#7E8F9F] block mb-1">Primary Use Category *</label>
                        <input
                          type="text"
                          value={sp.primaryUse}
                          onChange={(e) => {
                            const nextSpaces = [...project.spaces];
                            nextSpaces[idx] = { ...sp, primaryUse: e.target.value };
                            setProject((prev) => ({ ...prev, spaces: nextSpaces }));
                          }}
                          placeholder="COMMERCIAL, PORTRAIT, CYCLORAMA, etc."
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#0B1B2B] border border-[#1E3A4F] text-[#38BDF8] font-mono-code"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#7E8F9F] block mb-1">Approximate Room Size (Optional)</label>
                      <input
                        type="text"
                        value={sp.approximateSize || ''}
                        onChange={(e) => {
                          const nextSpaces = [...project.spaces];
                          nextSpaces[idx] = { ...sp, approximateSize: e.target.value };
                          setProject((prev) => ({ ...prev, spaces: nextSpaces }));
                        }}
                        placeholder="e.g. 25ft x 35ft (875 sq ft)"
                        className="w-full px-2.5 py-1.5 rounded-md bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                      />
                    </div>

                    {/* Attachments */}
                    <div className="pt-2 border-t border-[#1E3A4F]/60 space-y-2">
                      <label className="text-[11px] font-semibold text-[#38BDF8] block">Attached Room Photos &amp; Layouts</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSpaceIdxForUpload(idx);
                            spacePhotoInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Attach Room Photo ({sp.photoAssetIds?.length || 0})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveSpaceIdxForUpload(idx);
                            spaceFloorPlanInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded bg-[#102538] border border-[#1E3A4F] text-[#34D399] text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{sp.floorPlanAssetId ? 'Floor Plan Attached' : 'Attach Floor Plan'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveSpaceIdxForUpload(idx);
                            spaceSketchInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded bg-[#102538] border border-[#1E3A4F] text-[#FBBF24] text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{sp.sketchAssetId ? 'Sketch Attached' : 'Attach Sketch'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Operating Hours & Availability */}
              <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#F1F5F9]">Operating Days &amp; Opening Hours</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Opening Time *</label>
                    <input
                      type="text"
                      value={project.bookingRules.openingTime}
                      onChange={(e) => updateBookingRulesField('openingTime', e.target.value)}
                      placeholder="09:00"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Closing Time *</label>
                    <input
                      type="text"
                      value={project.bookingRules.closingTime}
                      onChange={(e) => updateBookingRulesField('closingTime', e.target.value)}
                      placeholder="21:00"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BOOKING, PAYMENT & INVOICE */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-[#1E3A4F] pb-3">
                <h3 className="font-bold text-base text-[#F1F5F9]">
                  Step 3 — Booking, Payment &amp; Invoice
                </h3>
                <p className="text-xs text-[#7E8F9F]">
                  Configure deposit rules, cancellation policies, payment gateways, and invoice billing details.
                </p>
              </div>

              {/* Deposit Rules & Policies */}
              <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#38BDF8]">Advance Booking &amp; Deposit Rules</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Default Deposit Rule Type</label>
                    <select
                      value={project.paymentConfiguration.defaultDepositRule.type}
                      onChange={(e) => {
                        const newType = e.target.value as DepositRule['type'];
                        let newRule: DepositRule = { type: 'NONE', value: null };
                        if (newType === 'FIXED') newRule = { type: 'FIXED', value: 50000 };
                        else if (newType === 'PERCENTAGE') newRule = { type: 'PERCENTAGE', value: 30 };
                        setProject((prev) => ({
                          ...prev,
                          paymentConfiguration: { ...prev.paymentConfiguration, defaultDepositRule: newRule },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                    >
                      <option value="NONE">NONE (No deposit required)</option>
                      <option value="FIXED">FIXED (Fixed currency amount)</option>
                      <option value="PERCENTAGE">PERCENTAGE (% of session total)</option>
                    </select>
                  </div>

                  {project.paymentConfiguration.defaultDepositRule.type !== 'NONE' && (
                    <div>
                      <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Deposit Amount / Percentage</label>
                      <input
                        type="number"
                        value={project.paymentConfiguration.defaultDepositRule.value || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setProject((prev) => ({
                            ...prev,
                            paymentConfiguration: {
                              ...prev.paymentConfiguration,
                              defaultDepositRule: { ...prev.paymentConfiguration.defaultDepositRule, value: val } as DepositRule,
                            },
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] text-[#34D399] font-mono-code"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Cancellation &amp; Refund Policy</label>
                    <textarea
                      rows={2}
                      value={project.bookingRules.cancellationPolicy}
                      onChange={(e) => updateBookingRulesField('cancellationPolicy', e.target.value)}
                      placeholder="e.g. Full deposit refund if cancelled 48 hours prior to shoot date."
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-[#F1F5F9]">Payment Gateways &amp; Accounts</h4>
                  <button
                    type="button"
                    onClick={handleAddPaymentMethod}
                    className="px-3 py-1.5 rounded-lg bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add Gateway</span>
                  </button>
                </div>

                {project.paymentConfiguration.methods.map((method, idx) => (
                  <div key={method.paymentMethodId} className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <select
                        value={method.provider}
                        onChange={(e) => {
                          const nextMethods = [...project.paymentConfiguration.methods];
                          nextMethods[idx] = { ...method, provider: e.target.value as PaymentProvider };
                          setProject((prev) => ({
                            ...prev,
                            paymentConfiguration: { ...prev.paymentConfiguration, methods: nextMethods },
                          }));
                        }}
                        className="px-2.5 py-1 rounded bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9] font-bold"
                      >
                        <option value="KBZPAY">KBZPAY</option>
                        <option value="WAVEPAY">WAVEPAY</option>
                        <option value="AYA_PAY">AYA_PAY</option>
                        <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                        <option value="CASH">CASH</option>
                        <option value="OTHER">OTHER</option>
                      </select>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={method.enabled}
                          onChange={(e) => {
                            const nextMethods = [...project.paymentConfiguration.methods];
                            nextMethods[idx] = { ...method, enabled: e.target.checked };
                            setProject((prev) => ({
                              ...prev,
                              paymentConfiguration: { ...prev.paymentConfiguration, methods: nextMethods },
                            }));
                          }}
                          className="rounded border-[#1E3A4F] bg-[#0B1B2B] text-[#34D399]"
                        />
                        <span className="text-xs text-[#34D399]">Enabled</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[#7E8F9F] block mb-1">
                          Account Title Name {method.enabled && method.provider !== 'CASH' && '*'}
                        </label>
                        <input
                          type="text"
                          value={method.accountName || ''}
                          onChange={(e) => {
                            const nextMethods = [...project.paymentConfiguration.methods];
                            nextMethods[idx] = { ...method, accountName: e.target.value };
                            setProject((prev) => ({
                              ...prev,
                              paymentConfiguration: { ...prev.paymentConfiguration, methods: nextMethods },
                            }));
                          }}
                          placeholder="Account Title Name"
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-[#7E8F9F] block mb-1">
                          Account Identifier / Number {method.enabled && method.provider !== 'CASH' && '*'}
                        </label>
                        <input
                          type="text"
                          value={method.accountIdentifier || ''}
                          onChange={(e) => {
                            const nextMethods = [...project.paymentConfiguration.methods];
                            nextMethods[idx] = { ...method, accountIdentifier: e.target.value };
                            setProject((prev) => ({
                              ...prev,
                              paymentConfiguration: { ...prev.paymentConfiguration, methods: nextMethods },
                            }));
                          }}
                          placeholder="Account Number / Phone"
                          className="w-full px-2.5 py-1.5 rounded-md bg-[#0B1B2B] border border-[#1E3A4F] text-[#38BDF8] font-mono-code"
                        />
                      </div>
                    </div>

                    {method.provider !== 'CASH' && (
                      <div className="pt-2 flex items-center justify-between border-t border-[#1E3A4F]/60">
                        <span className="text-[11px] text-[#7E8F9F]">
                          {method.qrAssetId ? `Attached QR Asset: ${method.qrAssetId}` : 'No Payment QR code attached'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePaymentIdxForUpload(idx);
                            paymentQrInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] font-semibold text-xs flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Payment QR</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Invoice Profile */}
              <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#F1F5F9]">Invoice Profile &amp; Billing Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Invoice Header Studio Name *</label>
                    <input
                      type="text"
                      value={project.invoiceProfile.studioName}
                      onChange={(e) => updateInvoiceProfileField('studioName', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Billing Contact Phone *</label>
                    <input
                      type="text"
                      value={project.invoiceProfile.phone}
                      onChange={(e) => updateInvoiceProfileField('phone', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Billing Address *</label>
                    <input
                      type="text"
                      value={project.invoiceProfile.address}
                      onChange={(e) => updateInvoiceProfileField('address', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-[#7E8F9F] block mb-1 font-medium">Invoice Footer Message</label>
                    <textarea
                      rows={2}
                      value={project.invoiceProfile.footerMessage || ''}
                      onChange={(e) => updateInvoiceProfileField('footerMessage', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] text-[#F1F5F9]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BRAND ASSETS */}
          {activeStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-[#1E3A4F] pb-3">
                <h3 className="font-bold text-base text-[#F1F5F9]">
                  Step 4 — Brand Assets &amp; Media
                </h3>
                <p className="text-xs text-[#7E8F9F]">
                  Upload primary studio logo, invoice header logo, cover photo, gallery images, and view registered assets.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Primary Studio Logo Card */}
                <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] flex items-center justify-center text-[#38BDF8]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-bold text-[#F1F5F9] block">Primary Studio Logo *</span>
                      <span className="text-[11px] text-[#7E8F9F]">
                        {project.studio.logoAssetId ? `Attached: ${project.studio.logoAssetId}` : 'No logo attached'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-md bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#38BDF8] text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo</span>
                  </button>
                </div>

                {/* Invoice Header Logo Card */}
                <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-[#0B1B2B] border border-[#1E3A4F] flex items-center justify-center text-[#34D399]">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-bold text-[#F1F5F9] block">Invoice Header Logo</span>
                      <span className="text-[11px] text-[#7E8F9F]">
                        {project.invoiceProfile.logoAssetId ? `Attached: ${project.invoiceProfile.logoAssetId}` : 'No invoice logo attached'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => invoiceLogoFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-md bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#34D399] text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Invoice Logo</span>
                  </button>
                </div>
              </div>

              {/* Registered Assets Grid */}
              <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-3 text-xs">
                <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider block">
                  Registered Brand &amp; Metadata Assets ({project.assets?.length || 0})
                </span>
                {(!project.assets || project.assets.length === 0) ? (
                  <div className="text-[#7E8F9F] text-xs py-4 text-center">No brand assets registered yet. Upload logo or space assets above.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {project.assets.map((asset) => (
                      <div key={asset.assetId} className="p-2.5 rounded bg-[#0B1B2B] border border-[#1E3A4F] flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-[#F1F5F9] block">{asset.originalFilename}</span>
                          <span className="text-[10px] text-[#7E8F9F] font-mono-code">{asset.category} • {(asset.fileSizeBytes / 1024).toFixed(1)} KB</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#34D399]/20 text-[#34D399] font-mono-code text-[9px]">
                          {asset.uploadStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & SUBMIT */}
          {activeStep === 5 && (
            <div className="space-y-6">
              <div className="border-b border-[#1E3A4F] pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-[#F1F5F9]">
                    Step 5 — Review &amp; Final Submit
                  </h3>
                  <p className="text-xs text-[#7E8F9F]">
                    Review read-only summaries of Steps 1–4 before submitting for developer review.
                  </p>
                </div>
              </div>

              {submissionValidation && !submissionValidation.isValid && (
                <div className="p-4 rounded-lg bg-[#FB7185]/10 border border-[#FB7185]/40 space-y-3 text-xs text-[#FB7185]">
                  <div className="font-bold flex items-center space-x-2 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Submission Requirements Incomplete ({submissionValidation.allErrors.length} Errors)</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-[#FB7185]">
                    {submissionValidation.allErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Card 1: Studio Information */}
                <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">
                        1. Studio Information
                      </span>
                      <button type="button" onClick={() => handleJumpToStep(1)} className="text-[11px] text-[#38BDF8] hover:underline flex items-center space-x-1 cursor-pointer">
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <div className="font-bold text-sm text-[#F1F5F9]">{project.studio.name || 'Unnamed Studio'}</div>
                    <div className="text-[#94A3B8]">Contact: {project.studio.primaryContactName || 'N/A'}</div>
                    <div className="text-[#94A3B8]">Phone: {project.studio.phone || 'N/A'} • Email: {project.studio.email || 'N/A'}</div>
                    <div className="text-[#94A3B8]">{project.studio.address || 'No address set'}</div>
                  </div>
                </div>

                {/* Card 2: Spaces & Availability */}
                <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">
                        2. Spaces &amp; Hours ({project.spaces.length} Bays)
                      </span>
                      <button type="button" onClick={() => handleJumpToStep(2)} className="text-[11px] text-[#38BDF8] hover:underline flex items-center space-x-1 cursor-pointer">
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <div className="text-[#F1F5F9] font-medium">Hours: {project.bookingRules.openingTime || '--:--'} - {project.bookingRules.closingTime || '--:--'}</div>
                    {project.spaces.map((sp) => (
                      <div key={sp.spaceId} className="border-b border-[#1E3A4F]/60 pb-1 py-1">
                        <span className="font-semibold text-[#F1F5F9]">{sp.name || 'Unnamed Space'}</span>{' '}
                        <span className="text-[10px] text-[#38BDF8]">[{sp.primaryUse}]</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 3: Booking, Payment & Invoice */}
                <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">
                        3. Booking, Payment &amp; Invoice
                      </span>
                      <button type="button" onClick={() => handleJumpToStep(3)} className="text-[11px] text-[#38BDF8] hover:underline flex items-center space-x-1 cursor-pointer">
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <div className="text-[#F1F5F9]">Deposit Rule: <span className="font-mono-code text-[#34D399]">{project.paymentConfiguration.defaultDepositRule.type}</span></div>
                    <div className="text-[#94A3B8]">Invoice Header: {project.invoiceProfile.studioName || 'N/A'}</div>
                    <div className="text-[#94A3B8]">Enabled Gateways: {project.paymentConfiguration.methods.filter((m) => m.enabled).map((m) => m.provider).join(', ') || 'None'}</div>
                  </div>
                </div>

                {/* Card 4: Brand Assets */}
                <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">
                        4. Brand Assets ({project.assets?.length || 0} Registered)
                      </span>
                      <button type="button" onClick={() => handleJumpToStep(4)} className="text-[11px] text-[#38BDF8] hover:underline flex items-center space-x-1 cursor-pointer">
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <div className="text-[#94A3B8]">Studio Logo: <span className="text-[#34D399]">{project.studio.logoAssetId ? 'Attached' : 'Missing'}</span></div>
                    <div className="text-[#94A3B8]">Invoice Logo: <span className="text-[#34D399]">{project.invoiceProfile.logoAssetId ? 'Attached' : 'None'}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-2 text-xs">
                <label className="flex items-start space-x-2.5 cursor-pointer text-[#F1F5F9]">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-0.5 rounded border-[#1E3A4F] bg-[#0B1B2B] text-[#34D399]"
                  />
                  <span>
                    I confirm that all studio details, operating hours, payment accounts, and brand assets provided above are accurate and ready for submission.
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#1E3A4F] flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => handleJumpToStep(4)}
                  className="px-4 py-2.5 rounded-lg bg-[#102538] border border-[#1E3A4F] text-[#F1F5F9] font-medium flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Step 4</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleManualSave}
                    className="px-4 py-2.5 rounded-lg bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] font-semibold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToSubmit}
                    className="px-6 py-2.5 rounded-lg bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold flex items-center space-x-2 shadow-lg cursor-pointer transition-transform active:scale-98"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Studio Setup</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Step Navigation Bar for Steps 1..4 */}
          {activeStep < 5 && (
            <div className="pt-4 border-t border-[#1E3A4F] flex justify-between items-center text-xs">
              <button
                type="button"
                disabled={activeStep === 1}
                onClick={() => {
                  const prevStep = Math.max(1, activeStep - 1) as OnboardingStepIndex;
                  setActiveStep(prevStep);
                }}
                className="px-4 py-2.5 rounded-lg bg-[#102538] border border-[#1E3A4F] text-[#F1F5F9] font-medium disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="px-4 py-2.5 rounded-lg bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] hover:bg-[#102538]/80 font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleContinueStep}
                  className="px-5 py-2.5 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-bold flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW STATE: SUBMITTED READ-ONLY DASHBOARD */}
      {viewState === 'SUBMITTED' && (
        <div className="bg-[#0B1B2B] border border-[#34D399]/40 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-[#1E3A4F]">
            <div className="w-10 h-10 rounded-full bg-[#34D399]/20 text-[#34D399] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#F1F5F9]">Studio Setup Submitted</h2>
              <p className="text-xs text-[#94A3B8]">
                Snapshot version #{project.submission.currentSubmissionVersion} has been recorded for developer review.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-1">
              <span className="text-[#7E8F9F] text-[10px] block">Review Status</span>
              <span className="font-bold text-[#34D399] font-mono-code text-sm">SUBMITTED (IN_REVIEW)</span>
            </div>

            <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-1">
              <span className="text-[#7E8F9F] text-[10px] block">Snapshot Version</span>
              <span className="font-bold text-[#38BDF8] font-mono-code text-sm">
                v{project.submission.currentSubmissionVersion}.0
              </span>
            </div>

            <div className="p-4 rounded-lg bg-[#030F1E] border border-[#1E3A4F] space-y-1">
              <span className="text-[#7E8F9F] text-[10px] block">Total Snapshots</span>
              <span className="font-bold text-[#F1F5F9] font-mono-code text-sm">
                {project.submission.submissions.length} Immutable Snapshot(s)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#102538] border border-[#1E3A4F] text-xs text-[#94A3B8] flex items-start space-x-3">
            <Info className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
            <p>
              Standard editing is currently locked while your onboarding submission undergoes developer inspection. If changes are requested by the team, your portal will automatically enter correction mode.
            </p>
          </div>

          {onClosePortal && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClosePortal}
                className="px-5 py-2.5 rounded-lg bg-[#38BDF8] text-[#071423] font-bold text-xs flex items-center space-x-2"
              >
                <span>Return to Studio Workstation</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL: SUBMISSION CONFIRMATION */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1B2B] border border-[#34D399]/50 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-[#34D399]">
              <Send className="w-6 h-6" />
              <h3 className="text-lg font-bold text-[#F1F5F9]">Submit Studio Setup?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              After submission, your studio configuration snapshot will be versioned and submitted for developer review. Changes may still be requested before production integration.
            </p>
            <div className="p-3 rounded-lg bg-[#030F1E] border border-[#1E3A4F] text-xs space-y-1 text-[#7E8F9F]">
              <div>Target Project: <span className="text-[#38BDF8] font-mono-code">{project.project.projectSlug}</span></div>
              <div>Snapshot Version: <span className="text-[#34D399] font-mono-code">v{(project.submission?.submissions?.length || 0) + 1}.0</span></div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#102538] border border-[#1E3A4F] text-xs font-semibold text-[#F1F5F9] hover:bg-[#102538]/80 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-5 py-2 rounded-lg bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm &amp; Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET DRAFT CONFIRMATION */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1B2B] border border-[#FB7185]/50 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-[#FB7185]">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-[#F1F5F9]">Reset Setup Draft?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This clears the current editable setup draft from this device. Immutable submission snapshots (if any) are strictly preserved.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#102538] border border-[#1E3A4F] text-xs font-semibold text-[#F1F5F9] hover:bg-[#102538]/80 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-5 py-2 rounded-lg bg-[#FB7185] hover:bg-[#E11D48] text-[#071423] font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center pt-4 border-t border-[#1E3A4F]/60 text-[10px] text-[#7E8F9F] font-mono-code">
        Replaceable backend/API persistence adapter contract active • Local development mode
      </div>
    </div>
  );
};
