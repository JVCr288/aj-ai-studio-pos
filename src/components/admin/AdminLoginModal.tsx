import React from 'react';
import { Lock, Shield, ArrowRight } from 'lucide-react';

interface AdminLoginModalProps {
  tenantId: string;
  onTenantChange: (t: string) => void;
  username?: string;
  onUsernameChange?: (u: string) => void;
  loginAdminKey: string;
  onLoginAdminKeyChange: (k: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loginError: string | null;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  tenantId,
  onTenantChange,
  username = 'admin',
  onUsernameChange,
  loginAdminKey,
  onLoginAdminKeyChange,
  onSubmit,
  loginError,
}) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#071423] border border-[#1E3A4F] shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#F1F5F9] tracking-tight">Studio Admin Operations Desk</h2>
          <p className="text-xs text-[#94A3B8]">
            Authenticate with your studio administrator credential to access live reservations, verify payments, and manage floor occupancy.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#94A3B8] block mb-1.5">Tenant Workspace</label>
            <select
              value={tenantId}
              onChange={(e) => onTenantChange(e.target.value)}
              className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
            >
              <option value="aj-ai-studio">AJ AI Studio (Master Tenant)</option>
              <option value="neutral-studio-tenant">Neutral Studio Tenant</option>
              <option value="nocturne">Creative Nocturne Atelier</option>
              <option value="akk-photo-studio">AKK Photography Atelier</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#94A3B8] block mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => onUsernameChange && onUsernameChange(e.target.value)}
              placeholder="Username (e.g. admin)"
              className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3 py-2 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#94A3B8] block mb-1.5">Password / Admin Key</label>
            <input
              type="password"
              value={loginAdminKey}
              onChange={(e) => onLoginAdminKeyChange(e.target.value)}
              placeholder="Enter administrator password..."
              className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3 py-2.5 text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#071423] font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-lg shadow-[#38BDF8]/20"
          >
            <span>Authenticate Session</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
