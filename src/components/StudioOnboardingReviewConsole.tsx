import React, { useState, useEffect } from 'react';
import {
  StudioOnboardingProject,
  SubmissionSnapshot,
  ReviewFeedback,
  CanonicalStepName,
  FeedbackSeverity,
} from '../types';
import {
  loadOnboardingDraft,
} from '../services/onboardingPersistenceService';
import {
  getLatestSubmissionSnapshot,
  startReview,
  addFeedbackItem,
  updateFeedbackItem,
  deleteFeedbackItem,
  requestChanges,
  approveSubmission,
  analyzeSnapshotAssets,
  DEV_REVIEWER_PLACEHOLDER_ID,
} from '../services/onboardingReviewService';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
  Check,
  Send,
  Eye,
  FileText,
  Building2,
  Package,
  Layers,
  CreditCard,
  FileCheck,
  Sparkles,
  Info,
  X,
  Lock,
} from 'lucide-react';

interface StudioOnboardingReviewConsoleProps {
  projectId?: string;
  onClose?: () => void;
}

export const StudioOnboardingReviewConsole: React.FC<StudioOnboardingReviewConsoleProps> = ({
  projectId = 'proj-aj-studio-01',
  onClose,
}) => {
  const [project, setProject] = useState<StudioOnboardingProject | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Modals
  const [isRequestChangesModalOpen, setIsRequestChangesModalOpen] = useState<boolean>(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState<boolean>(false);

  // Add Feedback Form State
  const [activeFeedbackSection, setActiveFeedbackSection] = useState<CanonicalStepName | null>(null);
  const [feedbackFieldPathInput, setFeedbackFieldPathInput] = useState<string>('');
  const [feedbackSeverityInput, setFeedbackSeverityInput] = useState<FeedbackSeverity>('CHANGE_REQUIRED');
  const [feedbackMessageInput, setFeedbackMessageInput] = useState<string>('');

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Load project on mount (with server-backed submissions fetcher)
  useEffect(() => {
    let isMounted = true;
    const devAdminKey = typeof window !== 'undefined' ? sessionStorage.getItem('aj_dev_admin_key') || '' : '';
    fetch(`/api/admin/onboarding/submissions?projectId=${projectId}`, {
      headers: devAdminKey ? { 'x-admin-key': devAdminKey } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((apiData) => {
        if (!isMounted) return;
        if (apiData && apiData.submissions && apiData.submissions.length > 0) {
          loadOnboardingDraft(projectId).then((data) => {
            if (data && isMounted) {
              const updatedProject: StudioOnboardingProject = {
                ...data,
                submission: {
                  currentSubmissionVersion: apiData.submissions.length,
                  submissions: apiData.submissions,
                },
              };
              setProject(updatedProject);
              setSelectedVersion(apiData.submissions[apiData.submissions.length - 1].version);
            }
          });
          return;
        }
        loadOnboardingDraft(projectId).then((data) => {
          if (data && isMounted) {
            setProject(data);
            const latest = getLatestSubmissionSnapshot(data);
            if (latest) {
              setSelectedVersion(latest.version);
            }
          }
        });
      })
      .catch(() => {
        if (!isMounted) return;
        loadOnboardingDraft(projectId).then((data) => {
          if (data && isMounted) {
            setProject(data);
            const latest = getLatestSubmissionSnapshot(data);
            if (latest) {
              setSelectedVersion(latest.version);
            }
          }
        });
      });
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (!project) {
    return (
      <div className="p-8 text-center text-[#7E8F9F] font-mono-code text-xs">
        Loading Developer Review Console...
      </div>
    );
  }

  const submissions = project.submission?.submissions || [];
  const latestSnapshot = getLatestSubmissionSnapshot(project);
  const activeSnapshot = submissions.find((s) => s.version === selectedVersion) || latestSnapshot;
  const isViewingLatest = activeSnapshot && latestSnapshot && activeSnapshot.version === latestSnapshot.version;
  const snapshotData = activeSnapshot?.snapshot;

  const unresolvedChangeRequiredCount = (latestSnapshot?.feedback || []).filter(
    (f) => !f.resolved && f.severity === 'CHANGE_REQUIRED'
  ).length;

  const assetDiagnostics = snapshotData ? analyzeSnapshotAssets(snapshotData) : [];

  // Actions
  const handleStartReview = async () => {
    try {
      const updated = await startReview(projectId, project);
      setProject(updated);
      showToast('Developer Review Started (Status: UNDER_REVIEW)');
    } catch (err: any) {
      showError(err.message || 'Failed to start review.');
    }
  };

  const handleCreateFeedback = async (section: CanonicalStepName) => {
    if (!feedbackMessageInput.trim()) {
      showError('Feedback message cannot be blank.');
      return;
    }
    try {
      const updated = await addFeedbackItem(projectId, project, {
        section,
        fieldPath: feedbackFieldPathInput.trim() || undefined,
        severity: feedbackSeverityInput,
        message: feedbackMessageInput.trim(),
      });
      setProject(updated);
      setActiveFeedbackSection(null);
      setFeedbackMessageInput('');
      setFeedbackFieldPathInput('');
      showToast('Review Feedback Added');
    } catch (err: any) {
      showError(err.message || 'Failed to add feedback.');
    }
  };

  const handleToggleResolveFeedback = async (feedbackId: string, currentResolved: boolean) => {
    try {
      const updated = await updateFeedbackItem(projectId, project, feedbackId, {
        resolved: !currentResolved,
      });
      setProject(updated);
      showToast(currentResolved ? 'Feedback Reopened' : 'Feedback Marked Resolved');
    } catch (err: any) {
      showError(err.message || 'Failed to update feedback.');
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      const updated = await deleteFeedbackItem(projectId, project, feedbackId);
      setProject(updated);
      showToast('Feedback Deleted');
    } catch (err: any) {
      showError(err.message || 'Failed to delete feedback.');
    }
  };

  const handleConfirmRequestChanges = async () => {
    try {
      const updated = await requestChanges(projectId, project);
      setProject(updated);
      setIsRequestChangesModalOpen(false);
      showToast('Changes Requested — Client Notified');
    } catch (err: any) {
      showError(err.message || 'Failed to request changes.');
    }
  };

  const handleConfirmApprove = async () => {
    try {
      const updated = await approveSubmission(projectId, project);
      setProject(updated);
      setIsApproveModalOpen(false);
      showToast('Studio Onboarding Approved!');
    } catch (err: any) {
      showError(err.message || 'Failed to approve submission.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-ui text-[#F1F5F9] pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div role="status" className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg bg-[#34D399] text-[#071423] font-mono text-xs font-bold shadow-xl flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Error Alert Toast */}
      {errorMsg && (
        <div role="alert" className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg bg-[#FB7185] text-[#071423] font-mono text-xs font-bold shadow-xl flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 stroke-[3]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Console Header */}
      <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] animate-pulse" />
              <h1 className="font-bold text-xl sm:text-2xl text-[#F1F5F9] tracking-tight">
                Developer Review Console
              </h1>
              <span className="px-2.5 py-0.5 rounded bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30 text-[10px] font-mono-code font-semibold">
                Dev Admin Context ({DEV_REVIEWER_PLACEHOLDER_ID})
              </span>
            </div>
            <p className="text-xs text-[#7E8F9F] mt-1">
              Inspect immutable onboarding snapshots, attach field-level feedback, and issue review decisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-md border text-xs font-semibold font-mono-code ${
              project.project.status === 'APPROVED'
                ? 'bg-[#34D399]/20 text-[#34D399] border-[#34D399]/40'
                : project.project.status === 'UNDER_REVIEW'
                ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/40'
                : project.project.status === 'NEEDS_CHANGES'
                ? 'bg-[#FB7185]/20 text-[#FB7185] border-[#FB7185]/40'
                : 'bg-[#030F1E] text-[#94A3B8] border-[#1E3A4F]'
            }`}>
              STATUS: {project.project.status}
            </span>

            {/* Start Review Button */}
            {project.project.status === 'SUBMITTED' && (
              <button
                type="button"
                onClick={handleStartReview}
                className="px-4 py-1.5 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Eye className="w-4 h-4" />
                <span>Start Review</span>
              </button>
            )}

            {/* Request Changes Button */}
            {project.project.status === 'UNDER_REVIEW' && (
              <button
                type="button"
                onClick={() => setIsRequestChangesModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#102538] hover:bg-[#FB7185]/20 border border-[#FB7185]/50 text-[#FB7185] font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Request Changes ({unresolvedChangeRequiredCount})</span>
              </button>
            )}

            {/* Approve Setup Button */}
            {project.project.status === 'UNDER_REVIEW' && (
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(true)}
                className="px-4 py-1.5 rounded-lg bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Approve Setup</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-[#102538] border border-[#1E3A4F] text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
              >
                Close Console
              </button>
            )}
          </div>
        </div>

        {/* Version History Selector Pills */}
        <div className="pt-3 border-t border-[#1E3A4F] flex items-center space-x-3 text-xs">
          <span className="text-[#7E8F9F] font-semibold">Snapshot Version History:</span>
          {submissions.length === 0 ? (
            <span className="text-[#7E8F9F] italic">No submitted snapshots recorded yet</span>
          ) : (
            <div className="flex items-center space-x-2">
              {submissions.map((sub) => {
                const isSelected = selectedVersion === sub.version;
                return (
                  <button
                    key={sub.submissionId}
                    type="button"
                    onClick={() => setSelectedVersion(sub.version)}
                    className={`px-3 py-1 rounded-md border text-xs font-mono-code flex items-center space-x-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#38BDF8] text-[#071423] border-[#38BDF8] font-bold shadow-md'
                        : 'bg-[#030F1E] text-[#94A3B8] border-[#1E3A4F] hover:text-[#F1F5F9]'
                    }`}
                  >
                    <span>v{sub.version}.0</span>
                    <span className="text-[10px] opacity-75">({sub.reviewStatus})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Snapshot Read-Only Warning if inspecting older version */}
      {!isViewingLatest && (
        <div className="p-4 rounded-xl bg-[#FBBF24]/10 border border-[#FBBF24]/40 text-xs text-[#FBBF24] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Viewing Historical Snapshot v{activeSnapshot?.version}.0 (Read-Only Inspection Mode)</span>
          </div>
          <button
            type="button"
            onClick={() => latestSnapshot && setSelectedVersion(latestSnapshot.version)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Switch to Latest Active Snapshot (v{latestSnapshot?.version}.0)
          </button>
        </div>
      )}

      {!snapshotData ? (
        <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-8 text-center space-y-3">
          <Info className="w-8 h-8 text-[#7E8F9F] mx-auto" />
          <h3 className="font-bold text-base text-[#F1F5F9]">No Submitted Snapshot to Review</h3>
          <p className="text-xs text-[#7E8F9F]">
            The onboarding project is in DRAFT mode. Review becomes available once the studio owner submits a setup snapshot.
          </p>
        </div>
      ) : (
        /* IMMUTABLE SNAPSHOT DOMAIN REVIEW SECTIONS (CANONICAL SCHEMA V1) */
        <div className="space-y-6">
          {/* SECTION 1: STUDIO INFORMATION */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3A4F] pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-bold text-sm text-[#F1F5F9]">1. Studio Information</h3>
              </div>
              {isViewingLatest && (
                <button
                  type="button"
                  onClick={() => setActiveFeedbackSection('STUDIO_INFORMATION')}
                  className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#38BDF8] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Feedback</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div><span className="text-[#7E8F9F] block">Studio Name</span><span className="font-bold">{snapshotData.studio.name}</span></div>
              <div><span className="text-[#7E8F9F] block">Project Slug</span><span className="font-mono-code text-[#38BDF8]">{snapshotData.project.projectSlug}</span></div>
              <div><span className="text-[#7E8F9F] block">Phone / Email</span><span>{snapshotData.studio.phone} • {snapshotData.studio.email}</span></div>
              <div className="sm:col-span-2"><span className="text-[#7E8F9F] block">Address</span><span>{snapshotData.studio.address}</span></div>
              <div><span className="text-[#7E8F9F] block">Maps Link</span><span>{snapshotData.studio.googleMapsUrl || 'Unlisted'}</span></div>
              <div><span className="text-[#7E8F9F] block">Facebook / Telegram</span><span>{snapshotData.studio.facebookUrl || 'None'} {snapshotData.studio.telegramContact ? `• @${snapshotData.studio.telegramContact}` : ''}</span></div>
              <div><span className="text-[#7E8F9F] block">Opening Hours</span><span>{snapshotData.studio.openingHours || 'Unspecified'}</span></div>
              <div><span className="text-[#7E8F9F] block">Closed Days</span><span>{snapshotData.studio.closedDays?.join(', ') || 'None'}</span></div>
              <div><span className="text-[#7E8F9F] block">Logo Asset ID</span><span className="font-mono-code text-[#38BDF8]">{snapshotData.studio.logoAssetId || 'None'}</span></div>
            </div>

            {/* Attached Section Feedback */}
            {renderSectionFeedback(activeSnapshot?.feedback || [], 'STUDIO_INFORMATION', handleToggleResolveFeedback, handleDeleteFeedback, isViewingLatest)}
          </div>

          {/* SECTION 2: BOOKING PACKAGES */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3A4F] pb-3">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-bold text-sm text-[#F1F5F9]">2. Booking Packages ({snapshotData.packages.length})</h3>
              </div>
              {isViewingLatest && (
                <button
                  type="button"
                  onClick={() => setActiveFeedbackSection('BOOKING_PACKAGES')}
                  className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#38BDF8] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Feedback</span>
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {snapshotData.packages.map((pkg, i) => (
                <div key={pkg.packageId} className="p-3 rounded bg-[#030F1E] border border-[#1E3A4F] space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span>{i + 1}. {pkg.name} ({pkg.sessionDurationMinutes} mins) {!pkg.enabled && <span className="text-[#FB7185] text-[10px]">(Disabled)</span>}</span>
                    <span className="text-[#34D399] font-mono-code">{pkg.price.toLocaleString()} {pkg.currency}</span>
                  </div>
                  <div className="text-[#94A3B8] text-[11px]">{pkg.description || 'No description'}</div>
                  {pkg.includedItems && pkg.includedItems.length > 0 && (
                    <div className="text-[#7E8F9F] text-[11px]">Included: {pkg.includedItems.join(', ')}</div>
                  )}
                  <div className="text-[#7E8F9F] text-[10px] flex space-x-4">
                    <span>Retouched Photos: {pkg.retouchedPhotoCount ?? 'Unlisted'}</span>
                    <span>Deposit Override: {pkg.depositOverride ? `${pkg.depositOverride.type} (${pkg.depositOverride.value ?? 'N/A'})` : 'Inherited'}</span>
                  </div>
                </div>
              ))}
            </div>

            {renderSectionFeedback(activeSnapshot?.feedback || [], 'BOOKING_PACKAGES', handleToggleResolveFeedback, handleDeleteFeedback, isViewingLatest)}
          </div>

          {/* SECTION 3: STUDIO SPACES */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3A4F] pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-bold text-sm text-[#F1F5F9]">3. Studio Spaces ({snapshotData.spaces.length})</h3>
              </div>
              {isViewingLatest && (
                <button
                  type="button"
                  onClick={() => setActiveFeedbackSection('STUDIO_SPACES')}
                  className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#38BDF8] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Feedback</span>
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {snapshotData.spaces.map((sp, i) => (
                <div key={sp.spaceId} className="p-3 rounded bg-[#030F1E] border border-[#1E3A4F] space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span>{i + 1}. {sp.name} {!sp.enabled && <span className="text-[#FB7185] text-[10px]">(Disabled)</span>}</span>
                    <span className="text-[#38BDF8] font-mono-code text-[11px]">[{sp.primaryUse}]</span>
                  </div>
                  <div className="text-[#94A3B8] text-[11px]">Size: {sp.approximateSize || 'Unlisted'}</div>
                  <div className="text-[#7E8F9F] text-[10px] flex flex-wrap gap-x-4">
                    <span>Floor Plan Asset: <code className="text-[#38BDF8]">{sp.floorPlanAssetId || 'None'}</code></span>
                    <span>Sketch Asset: <code className="text-[#38BDF8]">{sp.sketchAssetId || 'None'}</code></span>
                    <span>Photos: {sp.photoAssetIds?.length || 0} file(s)</span>
                  </div>
                </div>
              ))}
            </div>

            {renderSectionFeedback(activeSnapshot?.feedback || [], 'STUDIO_SPACES', handleToggleResolveFeedback, handleDeleteFeedback, isViewingLatest)}
          </div>

          {/* SECTION 4: PAYMENT CONFIGURATION */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3A4F] pb-3">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-bold text-sm text-[#F1F5F9]">4. Payment Configuration</h3>
              </div>
              {isViewingLatest && (
                <button
                  type="button"
                  onClick={() => setActiveFeedbackSection('PAYMENTS')}
                  className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#38BDF8] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Feedback</span>
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded bg-[#030F1E] border border-[#1E3A4F]">
                <div>
                  <span className="text-[#7E8F9F] block">Default Deposit Rule</span>
                  <span className="font-bold text-[#34D399]">
                    {snapshotData.paymentConfiguration.defaultDepositRule.type} ({snapshotData.paymentConfiguration.defaultDepositRule.value ?? 'None'})
                  </span>
                </div>
                <div>
                  <span className="text-[#7E8F9F] block">Remaining Balance Timing</span>
                  <span>{snapshotData.paymentConfiguration.remainingBalanceTiming || 'UPON_SESSION_START'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[#7E8F9F] block font-semibold">Payment Methods ({snapshotData.paymentConfiguration.methods.length}):</span>
                {snapshotData.paymentConfiguration.methods.map((m) => (
                  <div key={m.paymentMethodId} className="p-2.5 rounded bg-[#030F1E] border border-[#1E3A4F] flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#F1F5F9]">{m.provider}</span>
                      <span className="text-[11px] text-[#94A3B8] ml-2">{m.accountName || 'No title'}</span>
                      {m.qrAssetId && <span className="text-[10px] text-[#38BDF8] ml-2 font-mono-code">[QR: {m.qrAssetId}]</span>}
                    </div>
                    <span className="font-mono-code text-[#38BDF8]">{m.accountIdentifier || 'No identifier'}</span>
                  </div>
                ))}
              </div>
            </div>

            {renderSectionFeedback(activeSnapshot?.feedback || [], 'PAYMENTS', handleToggleResolveFeedback, handleDeleteFeedback, isViewingLatest)}
          </div>

          {/* SECTION 5: BOOKING RULES */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3A4F] pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-bold text-sm text-[#F1F5F9]">5. Booking Rules</h3>
              </div>
              {isViewingLatest && (
                <button
                  type="button"
                  onClick={() => setActiveFeedbackSection('BOOKING_RULES')}
                  className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#38BDF8] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Feedback</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div><span className="text-[#7E8F9F] block">Hours</span><span>{snapshotData.bookingRules.openingTime} - {snapshotData.bookingRules.closingTime}</span></div>
              <div><span className="text-[#7E8F9F] block">Buffer / Default Session</span><span>{snapshotData.bookingRules.bufferMinutes}m buffer • {snapshotData.bookingRules.defaultSessionDurationMinutes}m session</span></div>
              <div><span className="text-[#7E8F9F] block">Same-Day / Max Advance</span><span>{snapshotData.bookingRules.sameDayBooking ? 'Allowed' : 'Disabled'} • {snapshotData.bookingRules.maxAdvanceBookingDays} days</span></div>
              <div className="sm:col-span-3 space-y-1 pt-1 border-t border-[#1E3A4F]">
                <div><span className="text-[#7E8F9F]">Cancellation Policy: </span><span>{snapshotData.bookingRules.cancellationPolicy}</span></div>
                <div><span className="text-[#7E8F9F]">Reschedule Policy: </span><span>{snapshotData.bookingRules.reschedulePolicy}</span></div>
                <div><span className="text-[#7E8F9F]">Deposit Refund Policy: </span><span>{snapshotData.bookingRules.depositRefundPolicy}</span></div>
              </div>
            </div>

            {renderSectionFeedback(activeSnapshot?.feedback || [], 'BOOKING_RULES', handleToggleResolveFeedback, handleDeleteFeedback, isViewingLatest)}
          </div>

          {/* SECTION 6: INVOICE PROFILE */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3A4F] pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-bold text-sm text-[#F1F5F9]">6. Invoice Profile</h3>
              </div>
              {isViewingLatest && (
                <button
                  type="button"
                  onClick={() => setActiveFeedbackSection('INVOICE_PROFILE')}
                  className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#38BDF8] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Feedback</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div><span className="text-[#7E8F9F] block">Use Studio Profile</span><span>{snapshotData.invoiceProfile.useStudioProfile ? 'Yes' : 'Custom'}</span></div>
              <div><span className="text-[#7E8F9F] block">Invoice Studio Name</span><span>{snapshotData.invoiceProfile.studioName}</span></div>
              <div><span className="text-[#7E8F9F] block">Phone / Address</span><span>{snapshotData.invoiceProfile.phone} • {snapshotData.invoiceProfile.address}</span></div>
              <div><span className="text-[#7E8F9F] block">Business / Tax Info</span><span>{snapshotData.invoiceProfile.businessInfo || 'None'} • {snapshotData.invoiceProfile.taxInfo || 'None'}</span></div>
              <div className="sm:col-span-2"><span className="text-[#7E8F9F] block">Footer Message</span><span>{snapshotData.invoiceProfile.footerMessage || 'None'}</span></div>
            </div>

            {renderSectionFeedback(activeSnapshot?.feedback || [], 'INVOICE_PROFILE', handleToggleResolveFeedback, handleDeleteFeedback, isViewingLatest)}
          </div>

          {/* SECTION 7: ASSETS SUMMARY & DIAGNOSTICS */}
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E3A4F] pb-3">
              <h3 className="font-bold text-sm text-[#F1F5F9]">7. Asset Reference Diagnostics ({assetDiagnostics.length})</h3>
            </div>

            <div className="space-y-2 text-xs">
              {assetDiagnostics.map((diag, i) => {
                const isReady = diag.diagnosticStatus === 'READY';
                const isFailed = diag.diagnosticStatus === 'FAILED_UPLOAD';
                const isDangling = diag.diagnosticStatus === 'DANGLING_REFERENCE';
                const isRemoved = diag.diagnosticStatus === 'REMOVED_REFERENCE';

                return (
                  <div
                    key={`${diag.assetId}-${i}`}
                    className={`p-3 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isReady
                        ? 'bg-[#030F1E] border-[#1E3A4F]'
                        : isFailed || isDangling
                        ? 'bg-[#FB7185]/10 border-[#FB7185]/40 text-[#FB7185]'
                        : 'bg-[#FBBF24]/10 border-[#FBBF24]/40 text-[#FBBF24]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono-code font-bold ${
                          isReady
                            ? 'bg-[#34D399]/20 text-[#34D399]'
                            : isFailed || isDangling
                            ? 'bg-[#FB7185]/20 text-[#FB7185]'
                            : 'bg-[#FBBF24]/20 text-[#FBBF24]'
                        }`}>
                          {diag.diagnosticStatus}
                        </span>
                        <span className="font-mono-code text-[11px] text-[#38BDF8]">{diag.assetId}</span>
                        {diag.category && <span className="text-[10px] text-[#7E8F9F]">({diag.category})</span>}
                      </div>
                      <p className="text-[11px] mt-1 text-[#F1F5F9]">{diag.diagnosticMessage}</p>
                    </div>

                    {diag.originalFilename && (
                      <div className="text-right text-[10px] text-[#7E8F9F] font-mono-code shrink-0">
                        <div>{diag.originalFilename}</div>
                        <div>{diag.fileSizeBytes ? `${(diag.fileSizeBytes / 1024).toFixed(1)} KB` : ''}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK FORM MODAL */}
      {activeFeedbackSection && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1B2B] border border-[#38BDF8]/50 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#1E3A4F]">
              <h3 className="font-bold text-sm text-[#F1F5F9]">Add Review Feedback — {activeFeedbackSection}</h3>
              <button type="button" onClick={() => setActiveFeedbackSection(null)} className="text-[#7E8F9F] hover:text-[#F1F5F9]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#7E8F9F] block mb-1">Severity</label>
                <select
                  value={feedbackSeverityInput}
                  onChange={(e) => setFeedbackSeverityInput(e.target.value as FeedbackSeverity)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9]"
                >
                  <option value="CHANGE_REQUIRED">CHANGE_REQUIRED (Blocks approval)</option>
                  <option value="INFO">INFO (Advisory note)</option>
                </select>
              </div>

              <div>
                <label className="text-[#7E8F9F] block mb-1">Target Field Path (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. packages[0].price or studio.name"
                  value={feedbackFieldPathInput}
                  onChange={(e) => setFeedbackFieldPathInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#030F1E] border border-[#1E3A4F] text-[#38BDF8] font-mono-code"
                />
              </div>

              <div>
                <label className="text-[#7E8F9F] block mb-1">Feedback Message *</label>
                <textarea
                  rows={3}
                  placeholder="State the requested correction clearly..."
                  value={feedbackMessageInput}
                  onChange={(e) => setFeedbackMessageInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveFeedbackSection(null)}
                className="px-3 py-1.5 rounded bg-[#102538] border border-[#1E3A4F] text-xs font-semibold text-[#94A3B8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateFeedback(activeFeedbackSection)}
                className="px-4 py-1.5 rounded bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-bold text-xs"
              >
                Save Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST CHANGES CONFIRMATION MODAL */}
      {isRequestChangesModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1B2B] border border-[#FB7185]/50 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-[#FB7185]">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-[#F1F5F9]">Request Changes from Studio Owner?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This will update project status to <span className="text-[#FB7185] font-mono-code font-bold">NEEDS_CHANGES</span> and notify the studio owner to complete the requested corrections.
            </p>
            <div className="p-3 rounded bg-[#030F1E] border border-[#1E3A4F] text-xs space-y-1">
              <div className="text-[#7E8F9F]">Unresolved CHANGE_REQUIRED Feedback Items:</div>
              <div className="font-bold text-[#FB7185] font-mono-code">{unresolvedChangeRequiredCount} Item(s) Attached</div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRequestChangesModalOpen(false)}
                className="px-4 py-2 rounded bg-[#102538] border border-[#1E3A4F] text-xs font-semibold text-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRequestChanges}
                className="px-5 py-2 rounded bg-[#FB7185] hover:bg-[#E11D48] text-[#071423] font-bold text-xs shadow-lg"
              >
                Confirm Request Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE SETUP CONFIRMATION MODAL */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1B2B] border border-[#34D399]/50 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-[#34D399]">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-lg font-bold text-[#F1F5F9]">Approve Studio Setup?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This will mark the onboarding project as <span className="text-[#34D399] font-mono-code font-bold">APPROVED</span> for integration. Production configuration mapping remains isolated.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2 rounded bg-[#102538] border border-[#1E3A4F] text-xs font-semibold text-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="px-5 py-2 rounded bg-[#34D399] hover:bg-[#059669] text-[#071423] font-bold text-xs shadow-lg"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Section Feedback List Sub-renderer
function renderSectionFeedback(
  feedbackList: ReviewFeedback[],
  section: CanonicalStepName,
  onToggleResolve: (id: string, current: boolean) => void,
  onDelete: (id: string) => void,
  isLatest: boolean
) {
  const sectionFeedback = feedbackList.filter((f) => f.section === section);
  if (sectionFeedback.length === 0) return null;

  return (
    <div className="pt-3 border-t border-[#1E3A4F]/60 space-y-2 text-xs">
      <span className="text-[10px] font-bold text-[#FB7185] uppercase tracking-wider block">
        Section Feedback Items ({sectionFeedback.length})
      </span>
      <div className="space-y-2">
        {sectionFeedback.map((fb) => (
          <div key={fb.feedbackId} className="p-3 rounded bg-[#030F1E] border border-[#1E3A4F] flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold ${
                  fb.severity === 'CHANGE_REQUIRED' ? 'bg-[#FB7185]/20 text-[#FB7185]' : 'bg-[#38BDF8]/20 text-[#38BDF8]'
                }`}>
                  {fb.severity}
                </span>
                {fb.fieldPath && (
                  <span className="text-[11px] font-mono-code text-[#38BDF8]">{fb.fieldPath}</span>
                )}
                {fb.resolved && (
                  <span className="px-2 py-0.5 rounded bg-[#34D399]/20 text-[#34D399] text-[10px] font-mono-code">
                    RESOLVED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#F1F5F9]">{fb.message}</p>
              <div className="text-[10px] text-[#7E8F9F]">
                Added: {new Date(fb.createdAt).toLocaleString()}
              </div>
            </div>

            {isLatest && (
              <div className="flex items-center space-x-2 shrink-0 ml-3">
                <button
                  type="button"
                  onClick={() => onToggleResolve(fb.feedbackId, fb.resolved)}
                  className="text-xs text-[#38BDF8] hover:underline font-semibold"
                >
                  {fb.resolved ? 'Reopen' : 'Mark Resolved'}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(fb.feedbackId)}
                  className="text-[#FB7185] hover:opacity-80 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
