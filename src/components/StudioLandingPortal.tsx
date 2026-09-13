import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getTenantConfig } from '../config/tenantConfig';
import { platformConfig } from '../config/platformConfig';
import { PHOTOGRAPHY_PACKAGES } from '../data/mockData';
import { INITIAL_EQUIPMENT_LIST } from '../data/equipmentData';
import { AtmosphereTheme } from '../types';
import {
  Camera,
  Calendar,
  Sparkles,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  Box,
  Sliders,
  ChevronRight,
  Send,
  Eye,
  X,
  ExternalLink,
} from 'lucide-react';

interface StudioLandingPortalProps {
  onEnterBooking: () => void;
  onOpenEquipment: () => void;
  atmosphere: AtmosphereTheme;
  onSelectAtmosphere: (theme: AtmosphereTheme) => void;
}

export const StudioLandingPortal: React.FC<StudioLandingPortalProps> = ({
  onEnterBooking,
  onOpenEquipment,
  atmosphere,
  onSelectAtmosphere,
}) => {
  const tenantConfig = getTenantConfig('proj-akk-studio-01');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState<boolean>(false);

  // Filter out system seed / placeholder packages from public view
  const publicPackages = PHOTOGRAPHY_PACKAGES.filter(
    (pkg) => (pkg as any).status !== 'PLACEHOLDER' && (pkg as any).enabled !== false
  );

  const galleryCategories = ['ALL', 'FASHION', 'COMMERCIAL', 'PORTRAIT', 'EDITORIAL'];
  const [activeGalleryTab, setActiveGalleryTab] = useState<string>('ALL');

  const galleryItems = [
    {
      id: 1,
      category: 'FASHION',
      title: 'Nocturne Autumn Editorial',
      bay: 'BAY ALPHA-01',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 2,
      category: 'COMMERCIAL',
      title: 'Cyberpunk Product Campaign',
      bay: 'BAY BETA-02',
      image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 3,
      category: 'PORTRAIT',
      title: 'High-Key Dramatic Portrait',
      bay: 'BAY ALPHA-01',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 4,
      category: 'EDITORIAL',
      title: 'Monochrome Silhouette Series',
      bay: 'BAY GAMMA-03',
      image: 'https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const filteredGallery =
    activeGalleryTab === 'ALL'
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeGalleryTab);

  return (
    <div className="w-full text-[#F1F5F9] font-sans selection:bg-[#38BDF8] selection:text-[#071423]">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[85vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-12 pt-16 pb-20 overflow-hidden">
        {/* Subtle Backdrop Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#030F1E]/80 via-[#07172A]/90 to-[#030F1E] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          {/* Platform & Pilot Identity Badges */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full surface-card border border-[#1E293B] shadow-lg backdrop-blur-md">
            <span className="text-[10px] font-mono-code tracking-wider text-[#38BDF8] uppercase font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
              {platformConfig.name}
            </span>
            <span className="text-[#334155]">•</span>
            <span className="text-xs font-semibold text-[#E2E8F0] tracking-wide">
              {tenantConfig.displayName}
            </span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-100 leading-[1.1]">
            Precision Photography Studio &{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC]">
              Creative Atelier
            </span>
          </h1>

          {/* Hero Description */}
          <p className="text-lg sm:text-xl text-[#94A3B8] max-w-3xl mx-auto leading-relaxed font-light">
            High-capacity cyclorama bays, pre-configured Profoto lighting rigs, tethered 4K capture displays, and instant automated Digital Pass delivery in downtown Yangon.
          </p>

          {/* Primary Calls-to-Action */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <button
              onClick={onEnterBooking}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-[#030F1E] font-bold text-base shadow-xl hover:shadow-[#38BDF8]/25 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Calendar className="w-5 h-5 text-[#030F1E]" />
              <span>Book Studio Session</span>
              <ArrowRight className="w-4 h-4 text-[#030F1E] group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setIsFloorPlanOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl surface-card border border-[#334155] hover:border-[#38BDF8] text-[#F1F5F9] font-medium text-base hover:bg-[#1E293B]/70 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="w-5 h-5 text-[#38BDF8]" />
              <span>Explore Studio Spaces</span>
            </button>
          </div>

          {/* Key Studio Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl surface-card border border-[#1E293B] text-center">
              <div className="text-2xl font-bold text-[#38BDF8] font-mono-code">3 BAYS</div>
              <div className="text-xs text-[#94A3B8] mt-1 font-sans">Acoustic Isolated Stages</div>
            </div>
            <div className="p-4 rounded-xl surface-card border border-[#1E293B] text-center">
              <div className="text-2xl font-bold text-[#38BDF8] font-mono-code">PROFOTO</div>
              <div className="text-xs text-[#94A3B8] mt-1 font-sans">Pre-Rigged Lighting</div>
            </div>
            <div className="p-4 rounded-xl surface-card border border-[#1E293B] text-center">
              <div className="text-2xl font-bold text-[#38BDF8] font-mono-code">4K DISPLAY</div>
              <div className="text-xs text-[#94A3B8] mt-1 font-sans">Tethered Client Monitor</div>
            </div>
            <div className="p-4 rounded-xl surface-card border border-[#1E293B] text-center">
              <div className="text-2xl font-bold text-[#38BDF8] font-mono-code">VAULT</div>
              <div className="text-xs text-[#94A3B8] mt-1 font-sans">Lossless Cloud Delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BRAND STORY & INTRODUCTION SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-12 border-t border-[#1E293B] surface-section">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider font-semibold">
              The Nocturne Atelier Standard
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 leading-tight">
              Engineered for Fashion, Commercial & Creative Art Direction
            </h2>
            <p className="text-[#94A3B8] leading-relaxed font-light">
              Located in Bahan Township, Yangon, {tenantConfig.displayName} provides commercial photographers, fashion brands, and agency creative teams with high-speed workflow infrastructure.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <span className="text-sm text-[#E2E8F0]">Automated turnstile Bay Pass & instant Telegram confirmation</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <span className="text-sm text-[#E2E8F0]">Gemini OCR instant deposit slip verification engine</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <span className="text-sm text-[#E2E8F0]">On-demand equipment inventory rental with instant bay delivery</span>
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-[#334155] shadow-2xl group">
            <img
              src="https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=1000&q=80"
              alt="Studio Bay Setup"
              className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030F1E] via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl surface-card/90 backdrop-blur-md border border-[#334155]">
              <div className="text-sm font-semibold text-white">BAY ALPHA-01 Commercial Stage</div>
              <div className="text-xs text-[#94A3B8] mt-1">25ft x 35ft Seamless Cyclorama • 14ft Ceiling Height</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PUBLIC PACKAGES SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-12 border-t border-[#1E293B]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <div className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider font-semibold">
              Published Studio Rates
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100">Photography & Production Packages</h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto text-sm font-light">
              Transparent, all-inclusive session rates including equipment allocation, bay access, and lossless cloud deliverables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {publicPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="p-8 rounded-2xl surface-card border border-[#1E293B] hover:border-[#38BDF8]/50 transition-all duration-300 flex flex-col justify-between relative group shadow-lg"
              >
                {pkg.recommended && (
                  <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-[#38BDF8] to-[#818CF8] text-[#030F1E] text-xs font-bold font-mono-code uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-100">{pkg.name}</h3>
                    <p className="text-xs text-[#94A3B8] mt-1 font-mono-code">{pkg.suiteAllocation}</p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-[#38BDF8] font-mono-code">
                      {pkg.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#94A3B8] font-mono-code uppercase">MMK / SESSION</span>
                  </div>

                  <p className="text-sm text-[#CBD5E1] font-light leading-relaxed">{pkg.description}</p>

                  <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                    <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Package Inclusions</div>
                    {pkg.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#E2E8F0]">
                        <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 mt-6 border-t border-[#1E293B]">
                  <button
                    onClick={onEnterBooking}
                    className="w-full py-3.5 rounded-xl bg-[#1E293B] hover:bg-[#38BDF8] text-[#F1F5F9] hover:text-[#030F1E] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Book This Package</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. RENTAL EQUIPMENT PREVIEW */}
      <section className="py-20 px-4 sm:px-6 lg:px-12 border-t border-[#1E293B] surface-section">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="space-y-2">
              <div className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider font-semibold">
                Studio Gear Inventory
              </div>
              <h2 className="text-3xl font-bold text-slate-100">Professional Lighting & Grip Rental</h2>
            </div>
            <button
              onClick={onOpenEquipment}
              className="px-5 py-2.5 rounded-lg border border-[#334155] hover:border-[#38BDF8] text-xs font-mono-code text-[#38BDF8] hover:bg-[#1E293B] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>View Full Inventory ({INITIAL_EQUIPMENT_LIST.length} Items)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {INITIAL_EQUIPMENT_LIST.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-xl surface-card border border-[#1E293B] space-y-4 hover:border-[#334155] transition-all"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono-code text-[#38BDF8] uppercase px-2.5 py-1 rounded bg-[#030F1E] border border-[#1E293B]">
                    {item.category}
                  </span>
                  <span className="text-xs font-mono-code font-bold text-slate-200">
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-100">{item.name}</h4>
                <p className="text-xs text-[#94A3B8] font-light leading-relaxed">{item.myanmarName}</p>
                <div className="text-[11px] text-[#64748B] font-mono-code">Specs: {item.specs[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. GALLERY / PORTFOLIO SHOWCASE */}
      <section className="py-20 px-4 sm:px-6 lg:px-12 border-t border-[#1E293B]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <div className="text-xs font-mono-code text-[#38BDF8] uppercase tracking-wider font-semibold">
              Portfolio & Work Showcase
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100">Captured at {tenantConfig.displayName}</h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center items-center gap-2 flex-wrap">
            {galleryCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveGalleryTab(cat)}
                className={`px-4 py-2 rounded-lg text-xs font-mono-code transition-all cursor-pointer ${
                  activeGalleryTab === cat
                    ? 'bg-[#38BDF8] text-[#030F1E] font-bold shadow-md'
                    : 'surface-card border border-[#1E293B] text-[#94A3B8] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredGallery.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden border border-[#1E293B] surface-card shadow-lg"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030F1E] via-transparent to-transparent opacity-90" />
                <div className="absolute bottom-4 left-4 right-4 space-y-1">
                  <span className="text-[9px] font-mono-code text-[#38BDF8] uppercase tracking-wider">
                    {item.bay}
                  </span>
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. LOCATION & CONTACT FOOTER CALLOUT */}
      <section className="py-16 px-4 sm:px-6 lg:px-12 border-t border-[#1E293B] surface-section">
        <div className="max-w-5xl mx-auto rounded-2xl surface-card border border-[#334155] p-8 sm:p-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#38BDF8]">
              <MapPin className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-mono-code">Studio Location</h4>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {tenantConfig.address}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#38BDF8]">
              <Phone className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-mono-code">Direct Contact</h4>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Phone: {tenantConfig.phone}<br />
              Telegram: {tenantConfig.telegramContact}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#38BDF8]">
              <Clock className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-mono-code">Operating Hours</h4>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              09:00 - 21:00 MMT Daily<br />
              Closed Days: None (7 Days Daily)
            </p>
          </div>
        </div>
      </section>

      {/* INTERACTIVE FLOOR PLAN MODAL */}
      <AnimatePresence>
        {isFloorPlanOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030F1E]/95 backdrop-blur-md p-4 sm:p-6 flex justify-center items-center">
            <div className="surface-card border border-[#334155] rounded-2xl max-w-4xl w-full p-6 space-y-6 relative">
              <button
                onClick={() => setIsFloorPlanOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-[#94A3B8] hover:text-white surface-card border border-[#334155] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-100">Studio Architectural Floor Plan</h3>
                <p className="text-xs text-[#94A3B8] font-mono-code">3 Acoustic Stages & Tethered Control Stations</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[#38BDF8]/40 surface-card space-y-2">
                  <div className="text-xs font-mono-code text-[#38BDF8] font-bold">BAY ALPHA-01</div>
                  <div className="text-sm font-semibold text-slate-200">Commercial Stage</div>
                  <div className="text-xs text-[#94A3B8]">25ft x 35ft Cyclorama • 14ft Ceiling • Overhead Rig</div>
                </div>
                <div className="p-4 rounded-xl border border-[#334155] surface-card space-y-2">
                  <div className="text-xs font-mono-code text-[#818CF8] font-bold">BAY BETA-02</div>
                  <div className="text-sm font-semibold text-slate-200">Fashion & Portrait</div>
                  <div className="text-xs text-[#94A3B8]">20ft x 25ft Stage • Seamless Wall • Prep Counter</div>
                </div>
                <div className="p-4 rounded-xl border border-[#334155] surface-card space-y-2">
                  <div className="text-xs font-mono-code text-[#C084FC] font-bold">BAY GAMMA-03</div>
                  <div className="text-sm font-semibold text-slate-200">Creative Direction</div>
                  <div className="text-xs text-[#94A3B8]">18ft x 22ft Stage • Blackout Curtains • Audio Rig</div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#1E293B]">
                <button
                  onClick={() => {
                    setIsFloorPlanOpen(false);
                    onEnterBooking();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#38BDF8] text-[#030F1E] font-bold text-xs font-mono-code hover:bg-[#0284C7] transition-all cursor-pointer"
                >
                  Proceed to Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
