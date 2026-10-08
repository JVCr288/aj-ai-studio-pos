import React from 'react';
import { PosCartLineItem } from '../../types';
import { PHOTOGRAPHY_PACKAGES } from '../../data/mockData';
import { INITIAL_CLIENT_PRODUCTS } from '../../data/clientProductsData';
import { INITIAL_EQUIPMENT_LIST } from '../../data/equipmentData';
import { OVERTIME_ADDON_PRESETS, OvertimeAddonPreset } from '../../services/posService';
import { CustomerBookingRecord } from '../../services/serverBookingService';
import {
  Search,
  CheckCircle2,
  Camera,
  Zap,
  Layers,
  Store,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';

export type PosActiveTab = 'checkin' | 'packages' | 'addons' | 'gear' | 'retail';

interface PosCatalogTabsProps {
  activeTab: PosActiveTab;
  onSelectTab: (tab: PosActiveTab) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  // Check-in Lookup
  checkInSearch: string;
  onCheckInSearchChange: (val: string) => void;
  onSearchCheckIn: () => void;
  isSearchingBookings: boolean;
  foundBookings: CustomerBookingRecord[];
  onSelectBookingForCheckin: (bk: CustomerBookingRecord) => void;
  // Filters
  gearCategoryFilter: string;
  onGearCategoryFilterChange: (cat: string) => void;
  retailCategoryFilter: string;
  onRetailCategoryFilterChange: (cat: string) => void;
  // Add to cart callback
  onAddToCart: (item: Omit<PosCartLineItem, 'id'>) => void;
}

export const PosCatalogTabs: React.FC<PosCatalogTabsProps> = ({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchQueryChange,
  checkInSearch,
  onCheckInSearchChange,
  onSearchCheckIn,
  isSearchingBookings,
  foundBookings,
  onSelectBookingForCheckin,
  gearCategoryFilter,
  onGearCategoryFilterChange,
  retailCategoryFilter,
  onRetailCategoryFilterChange,
  onAddToCart,
}) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#030F1E] overflow-hidden">
      {/* Search & Top Action Bar */}
      <div className="p-3 sm:p-4 border-b border-[#1E3A4F] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search packages, add-ons, gear, or retail items..."
            className="w-full bg-[#071423] border border-[#1E3A4F] rounded-xl pl-9 pr-4 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 bg-[#071423] p-1 rounded-xl border border-[#1E3A4F] overflow-x-auto">
          {[
            { id: 'checkin', label: 'Check-In', icon: CheckCircle2 },
            { id: 'packages', label: 'Packages', icon: Camera },
            { id: 'addons', label: 'Overtime & Addons', icon: Zap },
            { id: 'gear', label: 'Gear', icon: Layers },
            { id: 'retail', label: 'Retail', icon: Store },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id as PosActiveTab)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#38BDF8] text-[#071423] font-bold shadow'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#102538]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Display Area */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
        {/* 1. CHECK-IN LOOKUP TAB */}
        {activeTab === 'checkin' && (
          <div className="space-y-4 max-w-2xl">
            <div className="p-4 rounded-xl bg-[#071423] border border-[#1E3A4F] space-y-3">
              <h4 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center space-x-2">
                <Search className="w-4 h-4 text-[#38BDF8]" />
                <span>Customer Booking Check-In &amp; Deposit Lookup</span>
              </h4>
              <p className="text-xs text-[#94A3B8]">
                Search customer name, phone number, or booking reference to pull their reserved session and settle balance.
              </p>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={checkInSearch}
                  onChange={(e) => onCheckInSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearchCheckIn()}
                  placeholder="e.g. Elena Rostova or +95 9 792 108 421 or #NOCT"
                  className="flex-1 bg-[#030F1E] border border-[#1E3A4F] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
                />
                <button
                  type="button"
                  onClick={onSearchCheckIn}
                  disabled={isSearchingBookings}
                  className="px-4 py-2 rounded-lg bg-[#38BDF8] hover:bg-[#0284C7] text-[#071423] font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSearchingBookings ? 'animate-spin' : ''}`} />
                  <span>Lookup</span>
                </button>
              </div>
            </div>

            {/* Found Bookings Results */}
            {foundBookings.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono text-[#94A3B8]">MATCHING RESERVATIONS ({foundBookings.length})</span>
                {foundBookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-3.5 rounded-xl bg-[#071423] border border-[#1E3A4F] hover:border-[#38BDF8] transition-all flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-[#F1F5F9]">{bk.customerName}</span>
                        <span className="font-mono text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">
                          {bk.bookingReference}
                        </span>
                        <span className="text-[10px] font-mono text-[#94A3B8]">{bk.startDate} • {bk.timeSlot}</span>
                      </div>
                      <div className="text-xs text-[#94A3B8] flex items-center space-x-3">
                        <span>Space: <strong className="text-slate-300">{bk.spaceSnapshot?.name}</strong></span>
                        <span>Deposit: <strong className="text-emerald-400">{bk.depositAmount.toLocaleString()} MMK</strong></span>
                        <span>Balance Due: <strong className="text-amber-400">{bk.outstandingBalance.toLocaleString()} MMK</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectBookingForCheckin(bk)}
                      className="px-3 py-1.5 rounded-lg bg-[#102538] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Check-In &amp; Settle
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. PACKAGES TAB */}
        {activeTab === 'packages' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PHOTOGRAPHY_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="p-4 rounded-xl bg-[#071423] border border-[#1E3A4F] hover:border-[#38BDF8] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#38BDF8]">
                    <span>{pkg.category}</span>
                    <span className="text-emerald-400">{pkg.price.toLocaleString()} MMK</span>
                  </div>
                  <h4 className="font-bold text-sm text-[#F1F5F9] mt-1">{pkg.name}</h4>
                  <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">{pkg.description}</p>

                  <div className="mt-3 space-y-1">
                    {pkg.features.slice(0, 3).map((feat, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5 text-[11px] text-[#94A3B8]">
                        <CheckCircle2 className="w-3 h-3 text-[#38BDF8] shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onAddToCart({
                      category: 'PHOTOGRAPHY_PACKAGE',
                      title: pkg.name,
                      myanmarTitle: pkg.name,
                      unitPriceMMK: pkg.price,
                      quantity: 1,
                      referenceId: pkg.id,
                      notes: `${pkg.category} Session`,
                    })
                  }
                  className="mt-4 w-full py-2 rounded-lg bg-[#102538] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] font-semibold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Ticket</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 3. OVERTIME & ADDONS TAB */}
        {activeTab === 'addons' && (
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
              STUDIO OVERTIME &amp; SHOOTING ADD-ON PRESETS
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {OVERTIME_ADDON_PRESETS.map((addon) => (
                <div
                  key={addon.id}
                  className="p-3.5 rounded-xl bg-[#071423] border border-[#1E3A4F] hover:border-[#38BDF8] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 font-bold">
                        {addon.badge || addon.category}
                      </span>
                    </div>

                    <h5 className="font-semibold text-xs text-[#F1F5F9] mt-2">{addon.title}</h5>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">{addon.myanmarTitle}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#1E3A4F]/60 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#F1F5F9]">
                      {addon.unitPriceMMK.toLocaleString()} MMK
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onAddToCart({
                          category: 'OVERTIME_ADDON',
                          title: addon.title,
                          myanmarTitle: addon.myanmarTitle,
                          unitPriceMMK: addon.unitPriceMMK,
                          quantity: 1,
                          referenceId: addon.id,
                        })
                      }
                      className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. GEAR & EQUIPMENT TAB */}
        {activeTab === 'gear' && (
          <div className="space-y-3">
            <div className="flex space-x-1 overflow-x-auto pb-1">
              {['all', 'camera', 'lighting', 'modifier', 'grip_support'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onGearCategoryFilterChange(cat)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors cursor-pointer ${
                    gearCategoryFilter === cat
                      ? 'bg-[#38BDF8] text-[#071423] font-bold'
                      : 'bg-[#071423] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#1E3A4F]'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {INITIAL_EQUIPMENT_LIST.filter(
                (g) => gearCategoryFilter === 'all' || g.category === gearCategoryFilter
              ).map((gear) => (
                <div
                  key={gear.id}
                  className="p-3.5 rounded-xl bg-[#071423] border border-[#1E3A4F] hover:border-[#38BDF8] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                      <span>{gear.allocatedBay || 'Studio Floor'}</span>
                      <span className="text-emerald-400 capitalize">{gear.condition}</span>
                    </div>
                    <h5 className="font-semibold text-xs text-[#F1F5F9] mt-1 line-clamp-1">{gear.name}</h5>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">{gear.myanmarName}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#1E3A4F]/60 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#F1F5F9]">
                      25,000 MMK/hr
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onAddToCart({
                          category: 'GEAR_RENTAL',
                          title: gear.name,
                          myanmarTitle: gear.myanmarName,
                          unitPriceMMK: 25000,
                          quantity: 1,
                          referenceId: gear.id,
                        })
                      }
                      className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. RETAIL PRODUCTS TAB */}
        {activeTab === 'retail' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {INITIAL_CLIENT_PRODUCTS.map((prod) => (
              <div
                key={prod.id}
                className="p-3.5 rounded-xl bg-[#071423] border border-[#1E3A4F] hover:border-[#38BDF8] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                    <span className="text-[#38BDF8]">{prod.sku}</span>
                    <span>Stock: {prod.stockCount}</span>
                  </div>
                  <h5 className="font-semibold text-xs text-[#F1F5F9] mt-1.5 line-clamp-1">{prod.name}</h5>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">{prod.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#1E3A4F]/60 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#F1F5F9]">
                    {prod.priceMMK.toLocaleString()} MMK
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onAddToCart({
                        category: 'RETAIL_PRODUCT',
                        title: prod.name,
                        myanmarTitle: prod.name,
                        unitPriceMMK: prod.priceMMK,
                        quantity: 1,
                        referenceId: prod.id,
                      })
                    }
                    className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
