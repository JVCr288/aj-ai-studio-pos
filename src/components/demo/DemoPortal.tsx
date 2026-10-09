import React, { useState, useEffect } from 'react';
import { HelpTip } from '../ui/HelpTip';
import {
  Sparkles,
  UserCheck,
  ShieldCheck,
  Store,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  Send,
} from 'lucide-react';

export interface DemoPortalProps {
  onSelectRole: (
    role: 'customer' | 'admin' | 'cashier',
    tenantId: string,
    studioName: string,
    credentials?: { username: string; password: string }
  ) => void;
  onBackToLanding?: () => void;
}

export interface DemoSessionState {
  leadId: string;
  sandboxId: string;
  studioName: string;
  leadName: string;
  adminCredentials: { username: string; password: string; role: string };
  staffList: Array<{
    id: string;
    name: string;
    myanmarName: string;
    role: string;
    pin: string;
    badgeBarcode: string;
  }>;
}

export const DemoPortal: React.FC<DemoPortalProps> = ({ onSelectRole, onBackToLanding }) => {
  const [session, setSession] = useState<DemoSessionState | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aj_demo_session');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Sign-up Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [studioName, setStudioName] = useState('');
  const [city, setCity] = useState('');
  const [contactHandle, setContactHandle] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<'TELEGRAM' | 'MESSENGER' | 'VIBER' | 'PHONE'>('TELEGRAM');
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Check returning cookie/localStorage
  useEffect(() => {
    if (!session && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )demo_lead_id=([^;]*)/);
      if (match && match[1]) {
        // Automatically check if existing lead can be restored
      }
    }
  }, [session]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormNotice('ကျေးဇူးပြု၍ သင့်အမည်ကို ထည့်သွင်းပေးပါ။');
      return;
    }
    if (!phone.trim()) {
      setFormNotice('ကျေးဇူးပြု၍ ဆက်သွယ်ရမည့် ဖုန်းနံပါတ်ကို ထည့်သွင်းပေးပါ။');
      return;
    }
    if (!studioName.trim()) {
      setFormNotice('ကျေးဇူးပြု၍ စတူဒီယို အမည်ကို ထည့်သွင်းပေးပါ။');
      return;
    }

    setIsSubmitting(true);
    setFormNotice(null);

    try {
      const res = await fetch('/api/demo/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          studioName: studioName.trim(),
          city: city.trim() || undefined,
          contactHandle: contactHandle.trim() || undefined,
          preferredChannel,
          consent,
          source: 'showroom',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const demoState: DemoSessionState = {
          leadId: data.leadId,
          sandboxId: data.sandboxId,
          studioName: data.studioName,
          leadName: name.trim(),
          adminCredentials: data.adminCredentials,
          staffList: data.staffList,
        };
        setSession(demoState);
        localStorage.setItem('aj_demo_session', JSON.stringify(demoState));
      } else {
        setFormNotice(data.error || 'စနစ်ချိတ်ဆက်မှု မအောင်မြင်ပါ။ နောက်တစ်ကြိမ် ကြိုးစားပေးပါ။');
      }
    } catch {
      setFormNotice('ကွန်ရက် ချိတ်ဆက်မှု အခက်အခဲ ရှိနေပါသည်။ စက္ကန့်အနည်းငယ် စောင့်ပြီး ပြန်လည် စမ်းသပ်ပေးပါ။');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSandbox = async () => {
    if (!session) return;
    try {
      await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sandboxId: session.sandboxId,
          studioName: session.studioName,
        }),
      });
      alert('သင်၏ Demo စတူဒီယိုဒေတာများကို အစမှ ပြန်လည် စတင်ပြင်ဆင်ပြီးပါပြီ။');
    } catch {
      alert('စနစ်ချိတ်ဆက်မှု မအောင်မြင်ပါ။');
    }
  };

  const bookingCustomerUrl = session
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${session.sandboxId}`
    : '';

  const copyBookingLink = () => {
    if (bookingCustomerUrl && navigator.clipboard) {
      navigator.clipboard.writeText(bookingCustomerUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#030F1E] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* -------------------------------------------------------------------
          TOP HEADER
      ------------------------------------------------------------------- */}
      <header className="border-b border-[#1E3A4F] bg-[#071423]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold font-mono text-sm">
            AJ
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>AJ Studio Desk</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono font-semibold">
                Live Demo
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              စတူဒီယိုလုပ်ငန်းသုံး အပြည့်အစုံ စမ်းသပ်ခန်း (Interactive Sandbox)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {session && (
            <button
              type="button"
              onClick={handleResetSandbox}
              className="px-2.5 py-1.5 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer border border-[#1E3A4F]"
              title="Reseed your sandbox studio data"
            >
              <RefreshCw className="w-3 h-3 text-sky-400" />
              <span>Reset</span>
            </button>
          )}

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="px-3 py-1.5 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-xs font-semibold text-slate-300 transition-colors cursor-pointer border border-[#1E3A4F]"
            >
              Back
            </button>
          )}
        </div>
      </header>

      {/* -------------------------------------------------------------------
          MAIN CONTENT CONTAINER
      ------------------------------------------------------------------- */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center">
        {!session ? (
          /* STEP 1: DEMO SIGNUP FORM */
          <div className="bg-[#071423] border border-[#1E3A4F] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="border-b border-[#1E3A4F] pb-4">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>စတူဒီယို သီးသန့် စမ်းသပ်ခန်း အခမဲ့ ဖွင့်လှစ်ပါ</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
                Try Demo — သင့်စတူဒီယို နာမည်ဖြင့် လက်တွေ့ စမ်းသပ်ပါ
              </h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                စတူဒီယို အချက်အလက်များ ဖြည့်စွက်ပြီးသည်နှင့် သင်တစ်ဦးတည်းအတွက် သီးသန့် Sandbox စတူဒီယိုတစ်ခုကို စနစ်က အသင့်ဖန်တီးပေးမည်ဖြစ်ပြီး ၇ ရက်အတွင်း လွတ်လပ်စွာ စမ်းသပ်အသုံးပြုနိုင်ပါသည်။
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    အမည် (Name) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ဥပမာ - ကိုမင်းသူ"
                    className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between mb-1">
                    <span>
                      ဖုန်းနံပါတ် (Phone) <span className="text-rose-400">*</span>
                    </span>
                    <HelpTip tipId="demo-phone-purpose" />
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    AJ Studio Desk အကြောင်း ဆက်သွယ်ပြောပြနိုင်ရန် ဖြစ်ပါသည်။
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    စတူဒီယို အမည် (Studio Name) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="ဥပမာ - Aura Photo Studio"
                    className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    ဤအမည်သည် သင့် Booking စာမျက်နှာနှင့် ပြေစာများပေါ်တွင် ပေါ်မည်ဖြစ်ပါသည်။
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    မြို့ (City / Location) <span className="text-slate-500">(ရွေးချယ်ရန်)</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="ဥပမာ - ရန်ကုန် / မန္တလေး"
                    className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      ဆက်သွယ်ရမည့် အကောင့် (Handle) <span className="text-slate-500">(ရွေးချယ်ရန်)</span>
                    </label>
                    <input
                      type="text"
                      value={contactHandle}
                      onChange={(e) => setContactHandle(e.target.value)}
                      placeholder="@telegram_handle သို့မဟုတ် Messenger Link"
                      className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      အဆင်ပြေဆုံး ဆက်သွယ်ရမည့် လမ်းကြောင်း
                    </label>
                    <select
                      value={preferredChannel}
                      onChange={(e) => setPreferredChannel(e.target.value as any)}
                      className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="TELEGRAM">Telegram</option>
                      <option value="MESSENGER">Facebook Messenger</option>
                      <option value="VIBER">Viber</option>
                      <option value="PHONE">Direct Phone Call</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Consent checkbox */}
              <div className="pt-2">
                <label className="flex items-start space-x-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-400 bg-[#030F1E] border-[#1E3A4F]"
                  />
                  <span>
                    AJ Studio Desk အကြောင်း ဆက်သွယ်ပြောပြခွင့် ပြုပါသည်။ (အခမဲ့ မိတ်ဆက်ဆွေးနွေးမှု)
                  </span>
                </label>
              </div>

              {formNotice && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
                  {formNotice}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Demo စတူဒီယို ပြင်ဆင်နေပါသည်...' : 'Try Demo — စမ်းသပ်ခန်းသို့ ဝင်မည်'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: ROLE PICKER SCREEN */
          <div className="space-y-6">
            {/* Greeting banner */}
            <div className="bg-[#071423] border border-[#1E3A4F] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Demo Studio Ready</span>
                </span>
                <h2 className="text-xl font-bold text-slate-100 mt-1">
                  Welcome, {session.leadName} ({session.studioName})
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  အခန်းကဏ္ဍ (Role) ရွေးချယ်ပြီး စနစ်တစ်ခုလုံးကို လက်တွေ့ စမ်းသပ်ကြည့်ရှုနိုင်ပါပြီ။
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[10px] font-mono text-slate-400">Sandbox Tenant ID</span>
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {session.sandboxId}
                </span>
              </div>
            </div>

            {/* Realtime test invitation banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span>ဖုန်းဖြင့် အချိန်နှင့်တပြေးညီ စမ်းသပ်ကြည့်ရှုပါ</span>
                    <HelpTip tipId="demo-realtime-test" />
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    ဖုန်းနဲ့ Booking တင်ကြည့်ပြီး Admin desk မှာ ချက်ချင်း ပေါ်လာတာကို ကြည့်ပါ
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={copyBookingLink}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold transition-colors flex items-center gap-1.5 border border-sky-500/40 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Mobile Link'}</span>
                </button>
                <a
                  href={bookingCustomerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 border border-[#1E3A4F]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                </a>
              </div>
            </div>

            {/* THREE ROLE BUTTONS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Customer Role */}
              <div className="bg-[#071423] border border-[#1E3A4F] hover:border-emerald-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-lg">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center justify-between">
                    <span>Customer</span>
                    <HelpTip tipId="demo-role-picker" />
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    သင့်စတူဒီယို၏ ဧည့်သည်အနေဖြင့် ဓာတ်ပုံရိုက်ကူးရေး ပက်ကေ့ချ် ရွေးချယ်ခြင်း၊ အချိန်ရွေးခြင်းနှင့် ပြေစာတင်ခြင်းတို့ကို စမ်းသပ်ပါ။
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[#1E3A4F]/60">
                  <button
                    type="button"
                    onClick={() => onSelectRole('customer', session.sandboxId, session.studioName)}
                    className="w-full py-2.5 rounded-xl bg-[#102538] hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>Open Customer Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. Studio Admin Role */}
              <div className="bg-[#071423] border border-[#1E3A4F] hover:border-sky-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-lg">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100">Studio Admin</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    ရုံးပိုင်း စီမံခန့်ခွဲသူ နေရာမှ ဘွတ်ကင် အတည်ပြုခြင်း၊ ငွေလွှဲပြေစာ စစ်ဆေးခြင်းနှင့် အချိန်ပြောင်းလဲခြင်း (Reschedule) များကို စမ်းသပ်ပါ။
                  </p>
                  <div className="mt-3 p-2.5 bg-[#030F1E] rounded-xl border border-[#1E3A4F] text-[11px] text-slate-400 font-mono">
                    <div>User: <span className="text-sky-300">admin</span></div>
                    <div>Pass: <span className="text-sky-300">DemoAdmin2026!</span> (Pre-filled)</div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-[#1E3A4F]/60">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectRole('admin', session.sandboxId, session.studioName, session.adminCredentials)
                    }
                    className="w-full py-2.5 rounded-xl bg-[#102538] hover:bg-sky-600 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>Open Admin Desk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 3. Cashier (POS) Role */}
              <div className="bg-[#071423] border border-[#1E3A4F] hover:border-amber-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-lg">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
                    <Store className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100">Cashier (POS)</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    အရောင်းကောင်တာမှ ပစ္စည်းရောင်းချခြင်း၊ အံဆွဲငွေစာရင်း၊ Split ငွေချေစနစ်နှင့် ဆိုင်းပိတ် Z-Report ရှင်းတမ်း ထုတ်ယူခြင်းတို့ကို စမ်းသပ်ပါ။
                  </p>
                  <div className="mt-3 p-2.5 bg-[#030F1E] rounded-xl border border-[#1E3A4F] text-[10.5px] text-slate-400 font-mono space-y-0.5">
                    <div>Cashier PIN: <span className="text-amber-300">4444</span></div>
                    <div>Manager PIN: <span className="text-amber-300">2222</span> (Override)</div>
                    <div>Owner PIN: <span className="text-amber-300">1111</span></div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-[#1E3A4F]/60">
                  <button
                    type="button"
                    onClick={() => onSelectRole('cashier', session.sandboxId, session.studioName)}
                    className="w-full py-2.5 rounded-xl bg-[#102538] hover:bg-amber-600 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>Open Cashier Desk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Contact CTA */}
            <div className="p-4 rounded-xl bg-[#071423] border border-[#1E3A4F] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-300 text-center sm:text-left">
                မိမိစတူဒီယိုတွင် တိုက်ရိုက် တပ်ဆင်အသုံးပြုလိုပါက သို့မဟုတ် မေးမြန်းလိုပါက ဆက်သွယ်နိုင်ပါသည်။
              </span>
              <div className="flex items-center space-x-2">
                <a
                  href="https://t.me/htoowai"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold flex items-center gap-1.5 border border-sky-500/40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram</span>
                </a>
                <a
                  href="https://m.me/ajaxclick"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold flex items-center gap-1.5 border border-indigo-500/40"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Messenger</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* -------------------------------------------------------------------
          FOOTER NOTE
      ------------------------------------------------------------------- */}
      <footer className="border-t border-[#1E3A4F] py-3 px-4 text-center text-[11px] text-slate-400 font-mono">
        AJ Studio Desk • Live Sandbox Environment • Data persists for 7 days
      </footer>
    </div>
  );
};

export default DemoPortal;
