import React, { useState, useEffect } from 'react';
import { Download, ShieldCheck, RefreshCw, Key } from 'lucide-react';

interface DemoLeadRow {
  id: string;
  name: string;
  phone: string;
  studioName: string;
  city: string;
  contactHandle: string;
  preferredChannel: string;
  visits: number;
  furthestStepReached: string;
  firstSeenAt: string;
  lastSeenAt: string;
  source: string;
}

export const DemoLeadsView: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('aj_admin_api_key') || '';
    }
    return '';
  });
  const [leads, setLeads] = useState<DemoLeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!apiKey);

  const fetchLeads = async (keyToUse = apiKey) => {
    if (!keyToUse) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/demo/leads', {
        headers: {
          'x-admin-key': keyToUse,
        },
      });

      if (res.status === 401) {
        setErrorMsg('UNAUTHORIZED: Invalid ADMIN_API_KEY.');
        setIsAuthModalOpen(true);
        setLeads([]);
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setLeads(data.leads || []);
      } else {
        setErrorMsg(data.error || 'Failed to load leads.');
      }
    } catch {
      setErrorMsg('Failed to communicate with server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (apiKey) {
      fetchLeads(apiKey);
    }
  }, [apiKey]);

  const handleExportCsv = () => {
    if (!apiKey) return;
    window.location.href = `/api/demo/leads/export?key=${encodeURIComponent(apiKey)}`;
    // Alternatively fetch with headers
    fetch('/api/demo/leads/export', {
      headers: { 'x-admin-key': apiKey },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aj_studio_desk_demo_leads_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert(err.message));
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    sessionStorage.setItem('aj_admin_api_key', apiKey.trim());
    setIsAuthModalOpen(false);
    fetchLeads(apiKey.trim());
  };

  return (
    <div className="min-h-screen bg-[#030F1E] text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#1E3A4F]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Demo Visitors &amp; Marketing Leads</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold border border-purple-500/30">
                  Founder Only
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Live visitor tracking for demo sandboxes, visits, and engagement levels
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-xs font-semibold text-slate-300 flex items-center gap-1.5 border border-[#1E3A4F] transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>API Key</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLeads()}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-xs font-semibold text-slate-300 flex items-center gap-1.5 border border-[#1E3A4F] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={leads.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-[#071423] border border-[#1E3A4F] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#030F1E] text-[11px] font-mono uppercase text-slate-400 border-b border-[#1E3A4F]">
                <tr>
                  <th className="py-3 px-4">Visitor / Studio</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Visits</th>
                  <th className="py-3 px-4">Furthest Engagement</th>
                  <th className="py-3 px-4">First Seen</th>
                  <th className="py-3 px-4">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3A4F]/60">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                      {isLoading ? 'Loading demo leads...' : 'No demo visitor records found.'}
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#102538]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100">{lead.name}</div>
                        <div className="text-[11px] text-emerald-400 font-semibold">{lead.studioName}</div>
                        {lead.city && lead.city !== 'N/A' && (
                          <div className="text-[10px] text-slate-400">{lead.city}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="text-slate-100 font-bold">{lead.phone}</div>
                        {lead.contactHandle && lead.contactHandle !== 'N/A' && (
                          <div className="text-[10px] text-sky-400">{lead.contactHandle}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#102538] border border-[#1E3A4F] text-slate-300">
                          {lead.preferredChannel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {lead.visits}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          {lead.furthestStepReached}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[10.5px] font-mono text-slate-400">
                        {new Date(lead.firstSeenAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-[10.5px] font-mono text-slate-400">
                        {new Date(lead.lastSeenAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Auth Modal for ADMIN_API_KEY */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#071423] border border-[#1E3A4F] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2.5">
              <Key className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">Enter ADMIN_API_KEY</h3>
            </div>
            <p className="text-xs text-slate-400">
              Founder access only. Please provide the operational Admin API key to access demo visitor records.
            </p>
            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <input
                type="password"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="dev-admin-secret"
                className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
              />
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoLeadsView;
