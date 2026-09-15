import React, { useState, useEffect } from 'react';
import { StudioOnboardingScreen } from './StudioOnboardingScreen';
import { platformConfig } from '../config/platformConfig';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  FileCheck,
  Building2,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

interface StandaloneOwnerPortalProps {
  rawToken?: string;
  onExitStandalone?: () => void;
}

export interface OwnerSession {
  sessionToken: string;
  csrfToken: string;
}

export const StandaloneOwnerPortal: React.FC<StandaloneOwnerPortalProps> = ({
  rawToken,
  onExitStandalone,
}) => {
  const [tokenStatus, setTokenStatus] = useState<
    'LOADING' | 'VALID' | 'EXPIRED' | 'REVOKED' | 'NOT_FOUND' | 'ALREADY_SUBMITTED'
  >('LOADING');
  const [projectId, setProjectId] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const queryProj = new URLSearchParams(window.location.search).get('projectId');
      if (queryProj) return queryProj;
    }
    return 'proj-aj-studio-01';
  });
  const [tenantId, setTenantId] = useState<string>('aj-ai-studio');
  const [studioDisplayName, setStudioDisplayName] = useState<string>('AJ AI Studio POS & Atelier');
  const [ownerSession, setOwnerSession] = useState<OwnerSession | null>(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = sessionStorage.getItem('aj_owner_session');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  });

  useEffect(() => {
    if (!rawToken) {
      if (ownerSession) {
        setTokenStatus('VALID');
      } else {
        // Local dev fallback session
        const devSession: OwnerSession = {
          sessionToken: 'dev_session_token_local',
          csrfToken: 'dev_csrf_token_local',
        };
        setOwnerSession(devSession);
        setTokenStatus('VALID');
      }
      return;
    }

    fetch('/api/setup/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rawToken }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.csrfToken) {
          const sess: OwnerSession = {
            sessionToken: '',
            csrfToken: data.csrfToken,
          };
          setOwnerSession(sess);
          setTokenStatus(data.status || 'VALID');
          if (data.projectId) setProjectId(data.projectId);
          if (data.tenantId) setTenantId(data.tenantId);
          if (data.studioDisplayName) setStudioDisplayName(data.studioDisplayName);

          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem('aj_csrf_token', data.csrfToken);
            sessionStorage.removeItem('aj_owner_session');
            // Strip raw token from URL bar
            window.history.replaceState({}, '', '/setup');
          }
        } else if (data.error?.includes('EXPIRED')) {
          setTokenStatus('EXPIRED');
        } else if (data.error?.includes('REVOKED')) {
          setTokenStatus('REVOKED');
        } else {
          setTokenStatus('NOT_FOUND');
        }
      })
      .catch(() => {
        // Fallback for local development
        const devSession: OwnerSession = {
          sessionToken: '',
          csrfToken: 'dev_csrf_token_local',
        };
        setOwnerSession(devSession);
        setTokenStatus('VALID');
      });
  }, [rawToken]);

  return (
    <div className="min-h-screen bg-[#030F1E] text-[#F1F5F9] font-sans selection:bg-[#38BDF8] selection:text-[#071423] flex flex-col justify-between">
      {/* Standalone Owner Header */}
      <header className="border-b border-[#1E293B] bg-[#07172A]/90 backdrop-blur-md px-4 sm:px-8 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#38BDF8] to-[#818CF8] flex items-center justify-center text-[#030F1E] font-extrabold shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider font-bold">
              {platformConfig.name}
            </div>
            <div className="text-sm font-semibold text-slate-100">
              Studio Owner Pre-Configuration Portal
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs font-mono-code text-[#94A3B8] bg-[#030F1E] px-3 py-1.5 rounded-lg border border-[#1E293B]">
            Target: <strong className="text-slate-200 font-medium">{studioDisplayName}</strong>
          </span>
          {onExitStandalone && (
            <button
              onClick={onExitStandalone}
              className="text-xs font-mono-code text-[#94A3B8] hover:text-white px-3 py-1.5 rounded-lg border border-[#334155] surface-card cursor-pointer"
            >
              Exit Setup
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {tokenStatus === 'LOADING' && (
          <div className="p-8 text-center space-y-3 surface-card border border-[#1E293B] rounded-2xl max-w-md w-full">
            <div className="w-8 h-8 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-sm font-mono-code text-[#94A3B8]">
              Resolving secure setup token...
            </div>
          </div>
        )}

        {tokenStatus === 'NOT_FOUND' && (
          <div className="p-8 text-center space-y-4 surface-card border border-rose-500/40 rounded-2xl max-w-md w-full">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Invalid Setup Link</h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This onboarding link is invalid or does not exist. Please contact AJ AI Studio Support to receive a valid setup link.
            </p>
          </div>
        )}

        {tokenStatus === 'EXPIRED' && (
          <div className="p-8 text-center space-y-4 surface-card border border-amber-500/40 rounded-2xl max-w-md w-full">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Setup Link Expired</h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This pre-configuration setup link has expired after 7 days. Request a fresh setup token from the AJ AI Studio Developer team.
            </p>
          </div>
        )}

        {tokenStatus === 'REVOKED' && (
          <div className="p-8 text-center space-y-4 surface-card border border-rose-500/40 rounded-2xl max-w-md w-full">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Setup Link Revoked</h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This onboarding token was manually revoked by the platform administrator.
            </p>
          </div>
        )}

        {tokenStatus === 'ALREADY_SUBMITTED' && (
          <div className="p-8 text-center space-y-4 surface-card border border-emerald-500/40 rounded-2xl max-w-lg w-full">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Pre-Configuration Submitted</h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Your studio configuration snapshot has been submitted and is under AJ AI Studio Developer review.
            </p>
            <div className="p-4 rounded-xl bg-[#030F1E] border border-[#1E293B] text-left text-xs font-mono-code space-y-2">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Studio Partner:</span>
                <span className="text-white font-bold">{studioDisplayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Review Status:</span>
                <span className="text-emerald-400 font-bold">SUBMITTED (v1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Next Step:</span>
                <span className="text-[#38BDF8]">AJ Developer Integration</span>
              </div>
            </div>
          </div>
        )}

        {tokenStatus === 'VALID' && (
          <div className="w-full max-w-5xl">
            <StudioOnboardingScreen
              projectId={projectId}
              rawSetupToken={rawToken}
            />
          </div>
        )}
      </main>

      {/* Standalone Footer */}
      <footer className="border-t border-[#1E293B] py-4 px-6 text-center text-xs text-[#64748B] font-mono-code">
        AJ AI Studio Platform Engine • Studio Intake Specification 1.0 • Secure Token Hash Authorization
      </footer>
    </div>
  );
};
