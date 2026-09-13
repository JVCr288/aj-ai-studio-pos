import React, { useState, useMemo, useEffect } from 'react';
import {
  EquipmentItem,
  EquipmentCategory,
  EquipmentStatus,
  EquipmentCondition,
  BookingState,
  WorkspaceView,
} from '../types';
import {
  EQUIPMENT_CATEGORIES,
  INITIAL_EQUIPMENT_LIST,
} from '../data/equipmentData';
import {
  Camera,
  Aperture,
  Zap,
  Sliders,
  Layers,
  Image as ImageIcon,
  Monitor,
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Barcode,
  X,
  RotateCcw,
  Check,
  Copy,
  ChevronRight,
  ShieldCheck,
  Package,
  Wrench,
  Info,
  ShoppingBag,
} from 'lucide-react';
import { ClientRetailShop } from './ClientRetailShop';

interface EquipmentInventoryScreenProps {
  bookingState: BookingState;
  onNavigateToBooking: () => void;
  initialTab?: 'gear' | 'retail';
  workspaceView?: WorkspaceView;
}

const STORAGE_KEY = 'akk_studio_equipment_inventory_v1';

export const EquipmentInventoryScreen: React.FC<EquipmentInventoryScreenProps> = ({
  bookingState,
  onNavigateToBooking,
  initialTab = 'gear',
  workspaceView = 'compact',
}) => {
  const [inventoryTab, setInventoryTab] = useState<'gear' | 'retail'>(initialTab);

  // Load equipment from localStorage or fallback to initial list
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_EQUIPMENT_LIST;
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equipmentList));
  }, [equipmentList]);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [onlyCurrentSessionBay, setOnlyCurrentSessionBay] = useState(false);

  // Modals state
  const [selectedItemForDetail, setSelectedItemForDetail] =
    useState<EquipmentItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedAssetCode, setCopiedAssetCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Equipment Form State
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    myanmarName: '',
    category: 'lighting' as EquipmentCategory,
    assetCode: `AKK-EQ-${Math.floor(100 + Math.random() * 900)}`,
    serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
    status: 'available' as EquipmentStatus,
    allocatedBay: 'EQUIPMENT VAULT A',
    condition: 'mint' as EquipmentCondition,
    quantity: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1520690214124-2405c5217036?q=80&w=800&auto=format&fit=crop',
    specs: '',
    notes: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedAssetCode(code);
    showToast(`Copied ${code} to clipboard`);
    setTimeout(() => setCopiedAssetCode(null), 2000);
  };

  // Quick status toggle
  const handleUpdateStatus = (
    id: string,
    newStatus: EquipmentStatus,
    newBay?: string
  ) => {
    setEquipmentList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: newStatus,
            allocatedBay:
              newBay !== undefined
                ? newBay
                : newStatus === 'available'
                ? 'EQUIPMENT VAULT A'
                : newStatus === 'in_use'
                ? bookingState.bayAllocation || 'BAY ALPHA-01'
                : 'MAINTENANCE WORKSHOP',
            lastChecked: 'Today (Manual Audit)',
          };
        }
        return item;
      })
    );
    showToast('Equipment status updated successfully');
    if (selectedItemForDetail?.id === id) {
      setSelectedItemForDetail((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              allocatedBay:
                newBay !== undefined
                  ? newBay
                  : newStatus === 'available'
                  ? 'EQUIPMENT VAULT A'
                  : newStatus === 'in_use'
                  ? bookingState.bayAllocation || 'BAY ALPHA-01'
                  : 'MAINTENANCE WORKSHOP',
            }
          : null
      );
    }
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Reset equipment inventory back to initial studio factory register?'
      )
    ) {
      setEquipmentList(INITIAL_EQUIPMENT_LIST);
      localStorage.removeItem(STORAGE_KEY);
      showToast('Inventory reset to initial studio manifest');
    }
  };

  const handleCreateEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipment.name.trim()) return;

    const specsArray = newEquipment.specs
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const createdItem: EquipmentItem = {
      id: `eq-custom-${Date.now()}`,
      name: newEquipment.name,
      myanmarName: newEquipment.myanmarName || undefined,
      category: newEquipment.category,
      assetCode: newEquipment.assetCode,
      serialNumber: newEquipment.serialNumber,
      status: newEquipment.status,
      allocatedBay: newEquipment.allocatedBay,
      condition: newEquipment.condition,
      quantity: Number(newEquipment.quantity) || 1,
      imageUrl:
        newEquipment.imageUrl ||
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop',
      specs:
        specsArray.length > 0
          ? specsArray
          : ['Professional studio certified hardware', 'Checked & calibrated'],
      notes: newEquipment.notes || 'Added to studio asset catalog.',
      lastChecked: 'Just Now',
    };

    setEquipmentList((prev) => [createdItem, ...prev]);
    setIsAddModalOpen(false);
    showToast(`Registered "${createdItem.name}" to inventory`);

    // Reset form
    setNewEquipment({
      name: '',
      myanmarName: '',
      category: 'lighting',
      assetCode: `AKK-EQ-${Math.floor(100 + Math.random() * 900)}`,
      serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'available',
      allocatedBay: 'EQUIPMENT VAULT A',
      condition: 'mint',
      quantity: 1,
      imageUrl:
        'https://images.unsplash.com/photo-1520690214124-2405c5217036?q=80&w=800&auto=format&fit=crop',
      specs: '',
      notes: '',
    });
  };

  // Filtered equipment list
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }
      // Only Current Session Bay filter
      if (
        onlyCurrentSessionBay &&
        !item.allocatedBay
          .toLowerCase()
          .includes(bookingState.bayAllocation.toLowerCase())
      ) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesBurmese =
          item.myanmarName?.toLowerCase().includes(query) || false;
        const matchesCode = item.assetCode.toLowerCase().includes(query);
        const matchesSerial = item.serialNumber.toLowerCase().includes(query);
        const matchesBay = item.allocatedBay.toLowerCase().includes(query);
        const matchesSpecs = item.specs.some((spec) =>
          spec.toLowerCase().includes(query)
        );
        return (
          matchesName ||
          matchesBurmese ||
          matchesCode ||
          matchesSerial ||
          matchesBay ||
          matchesSpecs
        );
      }
      return true;
    });
  }, [
    equipmentList,
    selectedCategory,
    selectedStatus,
    onlyCurrentSessionBay,
    searchQuery,
    bookingState.bayAllocation,
  ]);

  // Inventory telemetry counts
  const stats = useMemo(() => {
    const total = equipmentList.length;
    const available = equipmentList.filter((i) => i.status === 'available').length;
    const inUse = equipmentList.filter((i) => i.status === 'in_use').length;
    const maintenance = equipmentList.filter(
      (i) => i.status === 'maintenance'
    ).length;
    const bayAlphaCount = equipmentList.filter((i) =>
      i.allocatedBay.includes(bookingState.bayAllocation || 'BAY ALPHA-01')
    ).length;

    return { total, available, inUse, maintenance, bayAlphaCount };
  }, [equipmentList, bookingState.bayAllocation]);

  // Category Icon helper
  const getCategoryIcon = (cat: EquipmentCategory) => {
    switch (cat) {
      case 'camera':
        return <Camera className="w-4 h-4 text-[#38bdf8]" />;
      case 'lens':
        return <Aperture className="w-4 h-4 text-emerald-400" />;
      case 'lighting':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'modifier':
        return <Sliders className="w-4 h-4 text-pink-400" />;
      case 'grip_support':
        return <Layers className="w-4 h-4 text-sky-300" />;
      case 'backdrop':
        return <ImageIcon className="w-4 h-4 text-indigo-400" />;
      case 'tether_tech':
        return <Monitor className="w-4 h-4 text-[#38bdf8]" />;
      case 'wardrobe':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  if (inventoryTab === 'retail') {
    return (
      <div className="w-full flex-1 flex flex-col">
        {/* Top Tab Switcher Bar */}
        <div className="border-b border-[#1E3A4F] bg-[#0B1B2B]">
          <div
            className={`w-full mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3 transition-[max-width] duration-300 ${
              workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
            }`}
          >
            <div className="inline-flex p-1 rounded-xl bg-[#030F1E] border border-[#1E3A4F] font-mono text-xs">
              <button
                type="button"
                onClick={() => setInventoryTab('gear')}
                className="px-3.5 py-2 rounded-lg text-[#7E8F9F] hover:text-[#F1F5F9] flex items-center space-x-2 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              >
                <Package className="w-4 h-4 text-[#7E8F9F]" />
                <span>စတူဒီယိုသုံး ပစ္စည်းများ (STUDIO GEAR)</span>
              </button>
              <button
                type="button"
                onClick={() => setInventoryTab('retail')}
                className="px-3.5 py-2 rounded-lg bg-[#38BDF8] text-[#071423] font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Client ရောင်းချသော ပစ္စည်းများ (CLIENT RETAIL SHOP)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onNavigateToBooking}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#1E3A4F] font-mono text-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              <span>← BOOKING SUITE</span>
            </button>
          </div>
        </div>

        <ClientRetailShop
          bookingState={bookingState}
          onNavigateToBooking={onNavigateToBooking}
          onNavigateToStudioGear={() => setInventoryTab('gear')}
          workspaceView={workspaceView}
        />
      </div>
    );
  }

  return (
    <div
      className={`w-full flex-1 mx-auto px-4 sm:px-6 py-6 pb-20 transition-[max-width] duration-300 ${
        workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 right-6 z-50 bg-[#0B1B2B] border border-[#38BDF8]/60 text-[#F1F5F9] text-xs font-mono px-4 py-2.5 rounded-lg shadow-2xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#38BDF8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Tab Switcher */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[#1E3A4F]">
        <div className="inline-flex p-1 rounded-xl bg-[#0B1B2B] border border-[#1E3A4F] font-mono text-xs">
          <button
            type="button"
            onClick={() => setInventoryTab('gear')}
            className="px-3.5 py-2 rounded-lg bg-[#38BDF8] text-[#071423] font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
          >
            <Package className="w-4 h-4" />
            <span>စတူဒီယိုသုံး ပစ္စည်းများ (STUDIO GEAR)</span>
          </button>
          <button
            type="button"
            onClick={() => setInventoryTab('retail')}
            className="px-3.5 py-2 rounded-lg text-[#7E8F9F] hover:text-[#F1F5F9] hover:bg-[#102538] flex items-center space-x-2 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
          >
            <ShoppingBag className="w-4 h-4 text-[#38BDF8]" />
            <span>Client ရောင်းချသော ပစ္စည်းများ (CLIENT RETAIL SHOP)</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs font-ui text-[#7E8F9F]">
          <span className="hidden sm:inline">View Mode:</span>
          <span className="text-[#38BDF8] font-semibold">Studio Gear &amp; Lighting Registry</span>
        </div>
      </div>

      {/* Screen Title & Navigation Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E3A4F] pb-5 mb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-ui text-[#38BDF8] mb-1.5">
            <span className="px-2 py-0.5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 font-medium">
              Module 06 • Atelier Hardware
            </span>
            <span>•</span>
            <span className="text-[#7E8F9F]">စတူဒီယို ပစ္စည်းစာရင်း</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-ui font-bold text-[#F1F5F9] tracking-tight flex items-center gap-3">
            <span>Studio Equipment Inventory</span>
            <span className="text-xs font-ui font-medium px-2.5 py-1 rounded-full bg-[#102538] border border-[#1E3A4F] text-[#94A3B8]">
              {stats.total} items audited
            </span>
          </h1>
          <p className="text-sm text-[#7E8F9F] mt-1 max-w-2xl font-normal">
            Live equipment registry, lighting gear allocation, lens optics, and
            calibration logs for AKK Photo Studio.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateToBooking}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#1E3A4F] font-ui text-xs font-medium transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            title="Return to Atelier Booking Dashboard"
          >
            <span>← Booking Suite</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary-action !h-10 !text-xs font-ui font-semibold"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Equipment Item</span>
          </button>
        </div>
      </div>

      {/* Top Telemetry & Health Stat Banners */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 font-ui">
        {/* Total Assets */}
        <div
          onClick={() => {
            setSelectedStatus('all');
            setOnlyCurrentSessionBay(false);
          }}
          className={`p-3.5 sm:p-4 rounded-xl border bg-[#0B1B2B] cursor-pointer transition-all ${
            selectedStatus === 'all' && !onlyCurrentSessionBay
              ? 'border-[#38BDF8]/50 shadow-[0_0_15px_rgba(56,189,248,0.15)] bg-[#102538]'
              : 'border-[#1E3A4F] hover:border-[#38BDF8]/40'
          }`}
        >
          <div className="flex items-center justify-between text-[#7E8F9F] text-xs mb-1">
            <span>စုစုပေါင်း (Total)</span>
            <Package className="w-3.5 h-3.5 text-[#7E8F9F]" />
          </div>
          <div className="text-2xl font-ui font-bold text-[#F1F5F9] tabular-nums">
            {stats.total}
          </div>
          <div className="text-xs text-[#7E8F9F] mt-1">
            Full studio register
          </div>
        </div>

        {/* Ready / Available */}
        <div
          onClick={() => {
            setSelectedStatus('available');
            setOnlyCurrentSessionBay(false);
          }}
          className={`p-3.5 sm:p-4 rounded-xl border bg-[#0B1B2B] cursor-pointer transition-all ${
            selectedStatus === 'available'
              ? 'border-[#34D399]/60 shadow-[0_0_15px_rgba(52,211,153,0.15)] bg-[#102538]'
              : 'border-[#1E3A4F] hover:border-[#38BDF8]/40'
          }`}
        >
          <div className="flex items-center justify-between text-[#34D399] text-xs mb-1">
            <span>အဆင်သင့် (Available)</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-ui font-bold text-[#34D399] tabular-nums">
            {stats.available}
          </div>
          <div className="text-xs text-[#7E8F9F] mt-1">
            Storage Vault &amp; Ready
          </div>
        </div>

        {/* In Use in Bays */}
        <div
          onClick={() => {
            setSelectedStatus('in_use');
            setOnlyCurrentSessionBay(false);
          }}
          className={`p-3.5 sm:p-4 rounded-xl border bg-[#0B1B2B] cursor-pointer transition-all ${
            selectedStatus === 'in_use' && !onlyCurrentSessionBay
              ? 'border-[#38BDF8]/60 shadow-[0_0_15px_rgba(56,189,248,0.15)] bg-[#102538]'
              : 'border-[#1E3A4F] hover:border-[#38BDF8]/40'
          }`}
        >
          <div className="flex items-center justify-between text-[#38BDF8] text-xs mb-1">
            <span>သုံးနေဆဲ (In Bays)</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-ui font-bold text-[#38BDF8] tabular-nums">
            {stats.inUse}
          </div>
          <div className="text-xs text-[#7E8F9F] mt-1">
            Active in photo bays
          </div>
        </div>

        {/* Current Session Bay Filter (Elena Rostova / BAY ALPHA-01) */}
        <div
          onClick={() => {
            setOnlyCurrentSessionBay(!onlyCurrentSessionBay);
            setSelectedStatus('all');
          }}
          className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
            onlyCurrentSessionBay
              ? 'glass-plate-copper border-[#A87452] shadow-[0_0_20px_rgba(168,116,82,0.25)]'
              : 'glass-plate border-[rgba(120,165,190,0.16)] hover:border-[#38BDF8]/40'
          }`}
        >
          <div className="flex items-center justify-between text-[#38BDF8] text-xs mb-1">
            <span>{bookingState.bayAllocation || 'BAY ALPHA-01'}</span>
            <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <div className="text-2xl font-ui font-bold text-[#F1F5F9] tabular-nums">
            {stats.bayAlphaCount}
          </div>
          <div className="text-xs text-[#38BDF8]/90 mt-1 font-semibold">
            {onlyCurrentSessionBay ? 'Filter Applied ✓' : 'Current Booking Gear'}
          </div>
        </div>

        {/* Maintenance / Service */}
        <div
          onClick={() => {
            setSelectedStatus('maintenance');
            setOnlyCurrentSessionBay(false);
          }}
          className={`p-3.5 sm:p-4 rounded-xl border bg-[#0B1B2B] cursor-pointer transition-all col-span-2 lg:col-span-1 ${
            selectedStatus === 'maintenance'
              ? 'border-[#FBBF24]/60 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-[#102538]'
              : 'border-[#1E3A4F] hover:border-[#38BDF8]/40'
          }`}
        >
          <div className="flex items-center justify-between text-[#FBBF24] text-xs mb-1">
            <span>စစ်ဆေးဆဲ (Maint)</span>
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-ui font-bold text-[#FBBF24] tabular-nums">
            {stats.maintenance}
          </div>
          <div className="text-xs text-[#7E8F9F] mt-1">
            Workshop calibration
          </div>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="glass-plate hairline-copper-top border border-[rgba(120,165,190,0.16)] rounded-2xl p-4 sm:p-5 mb-6 space-y-4 font-ui">
        {/* Search Bar & Quick status filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7E8F9F] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ပစ္စည်းအမည်၊ ကုတ်နံပါတ် (AKK-...)၊ မော်ဒယ် သို့မဟုတ် Bay ရှာရန်..."
              className="w-full pl-10 pr-10 py-2.5 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-sm text-[#F1F5F9] placeholder:text-[#7E8F9F] font-ui outline-none transition-colors focus:ring-1 focus:ring-[#38BDF8]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E8F9F] hover:text-[#F1F5F9]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <div className="flex items-center space-x-2 font-ui text-xs">
            <span className="text-[#7E8F9F] hidden sm:inline">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] py-2 px-3 rounded-xl outline-none focus:border-[#38BDF8] cursor-pointer focus:ring-1 focus:ring-[#38BDF8]"
            >
              <option value="all">အားလုံး (All Statuses)</option>
              <option value="available">အဆင်သင့်ရှိ (Available)</option>
              <option value="in_use">ရိုက်ကူးရေးတွင်သုံးနေ (In Use)</option>
              <option value="maintenance">စစ်ဆေးပြင်ဆင်ဆဲ (Maintenance)</option>
            </select>

            {/* Reset Filter Button */}
            {(searchQuery ||
              selectedCategory !== 'all' ||
              selectedStatus !== 'all' ||
              onlyCurrentSessionBay) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setOnlyCurrentSessionBay(false);
                }}
                className="px-2.5 py-2 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] border border-[#1E3A4F] flex items-center space-x-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                title="Clear all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-ui">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
              selectedCategory === 'all'
                ? 'bg-[#38BDF8] text-[#071423] font-semibold shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'bg-[#102538] text-[#7E8F9F] hover:text-[#F1F5F9] hover:bg-[#1E3A4F] border border-[#1E3A4F]'
            }`}
          >
            အားလုံး (All {equipmentList.length})
          </button>

          {EQUIPMENT_CATEGORIES.map((cat) => {
            const count = equipmentList.filter(
              (i) => i.category === cat.id
            ).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                  isSelected
                    ? 'bg-[#38BDF8] text-[#071423] font-semibold shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                    : 'bg-[#102538] text-[#7E8F9F] hover:text-[#F1F5F9] hover:bg-[#1E3A4F] border border-[#1E3A4F]'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded ${
                    isSelected
                      ? 'bg-black/20 text-[#071423]'
                      : 'bg-[#030F1E] text-[#7E8F9F]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Session Bay Alert Bar */}
      {bookingState.packageId && (
        <div className="mb-6 p-3.5 sm:p-4 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-ui">
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-ping" />
            <div className="text-[#F1F5F9]">
              <span className="font-semibold text-[#38BDF8]">
                Active reservation allocation:
              </span>{' '}
              {bookingState.selectedPackage.name} in{' '}
              <span className="font-semibold text-[#F1F5F9]">
                {bookingState.bayAllocation}
              </span>{' '}
              for <span className="text-[#38BDF8]">{bookingState.guestName}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setOnlyCurrentSessionBay(!onlyCurrentSessionBay)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                onlyCurrentSessionBay
                  ? 'bg-[#38BDF8] text-[#071423] font-semibold'
                  : 'bg-[#102538] text-[#38BDF8] hover:bg-[#38BDF8]/20 border border-[#38BDF8]/40'
              }`}
            >
              {onlyCurrentSessionBay
                ? 'Showing Bay Gear Only (Click to show all)'
                : `Filter ${bookingState.bayAllocation} Gear (${stats.bayAlphaCount})`}
            </button>
          </div>
        </div>
      )}

      {/* Equipment Cards Grid */}
      {filteredEquipment.length === 0 ? (
        <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-2xl p-12 text-center text-[#7E8F9F] font-ui">
          <AlertTriangle className="w-10 h-10 text-[#FBBF24] mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-ui font-bold text-[#F1F5F9] mb-1">
            ပစ္စည်း မတွေ့ရှိပါ (No Equipment Found)
          </h3>
          <p className="text-xs text-[#7E8F9F] max-w-md mx-auto mb-4">
            No studio equipment matched &quot;{searchQuery}&quot; with the
            selected filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedStatus('all');
              setOnlyCurrentSessionBay(false);
            }}
            className="px-4 py-2 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-[#F1F5F9] border border-[#1E3A4F] text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEquipment.map((item) => {
            const isAllocatedToCurrent = item.allocatedBay.includes(
              bookingState.bayAllocation || 'BAY ALPHA-01'
            );

            return (
              <div
                key={item.id}
                className={`bg-[#0B1B2B] rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between group hover:border-[#38BDF8]/60 ${
                  isAllocatedToCurrent
                    ? 'border-[#38BDF8]/40 shadow-[0_0_15px_rgba(56,189,248,0.12)]'
                    : 'border-[#1E3A4F]'
                }`}
              >
                <div>
                  {/* Equipment Header / Image */}
                  <div className="relative h-48 w-full bg-[#030F1E] overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B2B] via-transparent to-black/60" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      {/* Category Badge */}
                      <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#030F1E]/85 backdrop-blur-md border border-[#1E3A4F] text-[11px] font-ui text-[#F1F5F9]">
                        {getCategoryIcon(item.category)}
                        <span className="capitalize">{item.category}</span>
                      </span>

                      {/* Status Badge */}
                      <div className="flex items-center space-x-1.5">
                        {item.status === 'available' && (
                          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#34D399]/20 backdrop-blur-md border border-[#34D399]/40 text-[#34D399] font-ui text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                            <span>Available</span>
                          </span>
                        )}

                        {item.status === 'in_use' && (
                          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#38BDF8]/20 backdrop-blur-md border border-[#38BDF8]/50 text-[#38BDF8] font-ui text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                            <span>In Use</span>
                          </span>
                        )}

                        {item.status === 'maintenance' && (
                          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#FBBF24]/20 backdrop-blur-md border border-[#FBBF24]/50 text-[#FBBF24] font-ui text-[11px] font-medium">
                            <Wrench className="w-3 h-3" />
                            <span>Maint</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Asset Tag Code Floating at bottom of image */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between font-ui text-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.assetCode);
                        }}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#030F1E]/90 border border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#38BDF8] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                        title="Copy Asset Code"
                      >
                        <Barcode className="w-3 h-3 text-[#38BDF8]" />
                        <span className="font-mono-code text-[11px]">{item.assetCode}</span>
                        {copiedAssetCode === item.assetCode ? (
                          <Check className="w-3 h-3 text-[#34D399]" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-[#7E8F9F]" />
                        )}
                      </button>

                      <span className="text-[10px] text-[#7E8F9F] bg-black/60 px-2 py-0.5 rounded">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 font-ui">
                    {/* Item Name & Myanmar Name */}
                    <div className="mb-2">
                      <h4 className="font-ui font-bold text-base text-[#F1F5F9] group-hover:text-[#38BDF8] transition-colors leading-snug">
                        {item.name}
                      </h4>
                      {item.myanmarName && (
                        <p className="text-xs text-[#7E8F9F] mt-0.5">
                          {item.myanmarName}
                        </p>
                      )}
                    </div>

                    {/* Bay Allocation Location */}
                    <div className="flex items-center space-x-1.5 text-xs text-[#7E8F9F] mb-3 bg-[#102538] px-2.5 py-1.5 rounded-lg border border-[#1E3A4F]">
                      <MapPin
                        className={`w-3.5 h-3.5 ${
                          isAllocatedToCurrent
                            ? 'text-[#38BDF8]'
                            : 'text-[#7E8F9F]'
                        }`}
                      />
                      <span className="text-xs truncate text-[#F1F5F9]">
                        {item.allocatedBay}
                      </span>
                      {isAllocatedToCurrent && (
                        <span className="ml-auto text-[9px] px-1.5 py-0.2 rounded bg-[#38BDF8]/20 text-[#38BDF8] font-medium border border-[#38BDF8]/30">
                          Session allocated
                        </span>
                      )}
                    </div>

                    {/* Specs Pills */}
                    <div className="space-y-1.5 mb-3">
                      {item.specs.slice(0, 2).map((spec, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-start space-x-1.5 text-xs text-[#7E8F9F] leading-relaxed"
                        >
                          <span className="text-[#38BDF8] text-[10px] mt-0.5">
                            ▸
                          </span>
                          <span className="truncate">{spec}</span>
                        </div>
                      ))}
                    </div>

                    {/* Serial and Condition */}
                    <div className="flex items-center justify-between text-xs text-[#7E8F9F] pt-2 border-t border-[#1E3A4F]">
                      <span>SN: <span className="font-mono-code">{item.serialNumber}</span></span>
                      <span className="capitalize px-1.5 py-0.2 rounded bg-[#102538] border border-[#1E3A4F] text-[#94A3B8]">
                        {item.condition}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 sm:p-5 pt-0 border-t border-[#1E3A4F]/50 mt-2 flex items-center justify-between gap-2 font-ui">
                  {/* Status Quick Changer Selector */}
                  <select
                    value={item.status}
                    onChange={(e) =>
                      handleUpdateStatus(
                        item.id,
                        e.target.value as EquipmentStatus
                      )
                    }
                    className="bg-[#102538] text-xs text-[#F1F5F9] py-1.5 px-2 rounded-lg border border-[#1E3A4F] focus:border-[#38BDF8] outline-none cursor-pointer hover:bg-[#1E3A4F] focus:ring-1 focus:ring-[#38BDF8]"
                    title="Change status"
                  >
                    <option value="available">✓ Available</option>
                    <option value="in_use">⚡ In Use ({bookingState.bayAllocation})</option>
                    <option value="maintenance">🔧 Maintenance</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setSelectedItemForDetail(item)}
                    className="btn-secondary-action !h-8 !py-1 !px-2.5 !text-xs font-ui font-medium"
                    title="View technical calibration and allocation specs"
                  >
                    <span>Edit / Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#38BDF8]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Studio Hardware Policy & Reset Register Footer */}
      <div className="mt-12 p-6 rounded-2xl bg-[#0B1B2B] border border-[#1E3A4F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-ui text-xs text-[#7E8F9F]">
        <div className="flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-[#34D399] shrink-0 mt-0.5" />
          <div>
            <div className="font-ui font-bold text-[#F1F5F9] text-sm">
              AKK Atelier Hardware Standard &amp; Calibration
            </div>
            <p className="text-[#7E8F9F] text-xs mt-0.5">
              All strobe units undergo 5600K daylight color temperature meter
              checks before every booking session.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#102538] hover:bg-rose-950/30 text-[#7E8F9F] hover:text-[#FB7185] border border-[#1E3A4F] hover:border-[#FB7185]/50 text-xs transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
          title="Restore original factory studio equipment catalog"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESTORE FACTORY INVENTORY</span>
        </button>
      </div>

      {/* =========================================================================
          MODAL 1: ITEM DETAIL & TECHNICAL SPECS MODAL
         ========================================================================= */}
      {selectedItemForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071423]/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedItemForDetail(null)}
        >
          <div
            className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedItemForDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-[#102538] border border-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-2 text-xs font-ui text-[#38BDF8] mb-2">
              <span className="px-2 py-0.5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 font-mono-code">
                {selectedItemForDetail.assetCode}
              </span>
              <span>•</span>
              <span className="capitalize">{selectedItemForDetail.category}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-ui font-bold text-[#F1F5F9] mb-1">
              {selectedItemForDetail.name}
            </h2>
            {selectedItemForDetail.myanmarName && (
              <p className="text-sm text-[#7E8F9F] mb-4 font-ui">
                {selectedItemForDetail.myanmarName}
              </p>
            )}

            {/* Photo & Key Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="h-52 rounded-xl overflow-hidden bg-[#030F1E] border border-[#1E3A4F] relative">
                <img
                  src={selectedItemForDetail.imageUrl}
                  alt={selectedItemForDetail.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="bg-[#102538] border border-[#1E3A4F] rounded-xl p-4 space-y-2.5 font-ui text-xs">
                <div className="flex justify-between py-1 border-b border-[#1E3A4F]">
                  <span className="text-[#7E8F9F]">Status:</span>
                  <span className="font-semibold text-[#F1F5F9] capitalize">
                    {selectedItemForDetail.status}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-[#1E3A4F]">
                  <span className="text-[#7E8F9F]">Location:</span>
                  <span className="text-[#38BDF8] font-semibold">
                    {selectedItemForDetail.allocatedBay}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-[#1E3A4F]">
                  <span className="text-[#7E8F9F]">Serial Number:</span>
                  <span className="text-[#94A3B8] font-mono-code">
                    {selectedItemForDetail.serialNumber}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-[#1E3A4F]">
                  <span className="text-[#7E8F9F]">Physical Condition:</span>
                  <span className="text-[#34D399] capitalize font-semibold">
                    {selectedItemForDetail.condition}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-[#7E8F9F]">Last Checked:</span>
                  <span className="text-[#94A3B8]">
                    {selectedItemForDetail.lastChecked || 'Active Session'}
                  </span>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="mb-5">
              <h4 className="text-xs font-ui font-semibold text-[#94A3B8] mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Technical Specifications &amp; Features</span>
              </h4>
              <div className="bg-[#030F1E] border border-[#1E3A4F] rounded-xl p-3.5 space-y-2 font-ui text-xs">
                {selectedItemForDetail.specs.map((spec, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-[#F1F5F9]">
                    <span className="text-[#38BDF8] mt-0.5 font-bold">✓</span>
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Notes */}
            {selectedItemForDetail.notes && (
              <div className="mb-6 bg-[#102538] border border-[#1E3A4F] rounded-xl p-3.5 text-xs text-[#7E8F9F] font-ui">
                <span className="text-[#F1F5F9] font-semibold">Studio Note: </span>
                {selectedItemForDetail.notes}
              </div>
            )}

            {/* Status Update Quick Action Controls in Modal */}
            <div className="pt-4 border-t border-[#1E3A4F] flex flex-wrap items-center justify-between gap-3 font-ui text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-[#7E8F9F]">Change Status:</span>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(selectedItemForDetail.id, 'available')
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#34D399]/15 hover:bg-[#34D399]/25 text-[#34D399] border border-[#34D399]/30 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  Set Available
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(
                      selectedItemForDetail.id,
                      'in_use',
                      bookingState.bayAllocation || 'BAY ALPHA-01'
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/30 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  Allocate to {bookingState.bayAllocation || 'BAY ALPHA-01'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(selectedItemForDetail.id, 'maintenance')
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#FBBF24]/15 hover:bg-[#FBBF24]/25 text-[#FBBF24] border border-[#FBBF24]/30 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  Set Maintenance
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemForDetail(null)}
                className="px-4 py-2 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-[#F1F5F9] border border-[#1E3A4F] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD NEW EQUIPMENT FORM MODAL (ပစ္စည်းအသစ် ထည့်သွင်းခြင်း)
         ========================================================================= */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071423]/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-[#102538] border border-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center space-x-2 text-xs font-mono text-[#38BDF8] mb-1">
              <Plus className="w-3.5 h-3.5" />
              <span>STUDIO ASSET REGISTRATION</span>
            </div>

            <h2 className="text-xl font-ui font-bold text-[#F1F5F9] mb-1">
              ပစ္စည်းအသစ် ထည့်သွင်းခြင်း (Add New Equipment)
            </h2>
            <p className="text-xs text-[#7E8F9F] mb-5 font-light font-ui">
              Register new studio hardware, lighting strobes, cameras, or optics
              into the active AKK Photo Studio inventory system.
            </p>

            <form onSubmit={handleCreateEquipment} className="space-y-4 font-ui text-xs">
              {/* Name & Myanmar Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] font-semibold mb-1">
                    Equipment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEquipment.name}
                    onChange={(e) =>
                      setNewEquipment({ ...newEquipment, name: e.target.value })
                    }
                    placeholder="e.g. Profoto A10 AirTTL Flash"
                    className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] placeholder:text-[#7E8F9F] outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] font-semibold mb-1">
                    မြန်မာအမည် (Myanmar Title)
                  </label>
                  <input
                    type="text"
                    value={newEquipment.myanmarName}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        myanmarName: e.target.value,
                      })
                    }
                    placeholder="e.g. ပရိုဖိုတို အလင်းဆိုင်း"
                    className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] placeholder:text-[#7E8F9F] outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] font-semibold mb-1">
                    Category *
                  </label>
                  <select
                    value={newEquipment.category}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        category: e.target.value as EquipmentCategory,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] outline-none cursor-pointer focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    {EQUIPMENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.myanmarName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#94A3B8] font-semibold mb-1">
                    Current Status
                  </label>
                  <select
                    value={newEquipment.status}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        status: e.target.value as EquipmentStatus,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] outline-none cursor-pointer focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <option value="available">အဆင်သင့်ရှိ (Available)</option>
                    <option value="in_use">ရိုက်ကူးရေးတွင်သုံးဆဲ (In Use)</option>
                    <option value="maintenance">စစ်ဆေးပြင်ဆင်ဆဲ (Maintenance)</option>
                  </select>
                </div>
              </div>

              {/* Asset Code & Serial Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] font-semibold mb-1">
                    Asset Code
                  </label>
                  <input
                    type="text"
                    value={newEquipment.assetCode}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        assetCode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] font-semibold mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={newEquipment.serialNumber}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        serialNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>
              </div>

              {/* Studio Bay Location & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#94A3B8] font-semibold mb-1">
                    Allocated Bay / Studio Storage
                  </label>
                  <input
                    type="text"
                    value={newEquipment.allocatedBay}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        allocatedBay: e.target.value,
                      })
                    }
                    placeholder="e.g. BAY ALPHA-01 or EQUIPMENT VAULT A"
                    className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] font-semibold mb-1">
                    Condition
                  </label>
                  <select
                    value={newEquipment.condition}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        condition: e.target.value as EquipmentCondition,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] outline-none cursor-pointer focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <option value="mint">Mint (Like New)</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good (Operational)</option>
                  </select>
                </div>
              </div>

              {/* Image URL with quick presets */}
              <div>
                <label className="block text-[#94A3B8] font-semibold mb-1">
                  Photo / Image URL
                </label>
                <input
                  type="url"
                  value={newEquipment.imageUrl}
                  onChange={(e) =>
                    setNewEquipment({
                      ...newEquipment,
                      imageUrl: e.target.value,
                    })
                  }
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] outline-none text-xs focus:ring-1 focus:ring-[#38BDF8]"
                />
                <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-[#7E8F9F]">
                  <span>Presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewEquipment({
                        ...newEquipment,
                        imageUrl:
                          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop',
                      })
                    }
                    className="hover:text-[#38BDF8] underline"
                  >
                    Camera
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewEquipment({
                        ...newEquipment,
                        imageUrl:
                          'https://images.unsplash.com/photo-1520690214124-2405c5217036?q=80&w=800&auto=format&fit=crop',
                      })
                    }
                    className="hover:text-[#38BDF8] underline"
                  >
                    Lighting
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewEquipment({
                        ...newEquipment,
                        imageUrl:
                          'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop',
                      })
                    }
                    className="hover:text-[#38BDF8] underline"
                  >
                    Lens
                  </button>
                </div>
              </div>

              {/* Technical Specifications (one per line) */}
              <div>
                <label className="block text-[#94A3B8] font-semibold mb-1">
                  Specifications (One per line)
                </label>
                <textarea
                  rows={3}
                  value={newEquipment.specs}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, specs: e.target.value })
                  }
                  placeholder="500Ws Flash output&#10;TTL &amp; HSS compatible&#10;Color temperature 5600K"
                  className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] placeholder:text-[#7E8F9F] outline-none focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>

              {/* Operational Notes */}
              <div>
                <label className="block text-[#94A3B8] font-semibold mb-1">
                  Studio Notes
                </label>
                <input
                  type="text"
                  value={newEquipment.notes}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, notes: e.target.value })
                  }
                  placeholder="e.g. Paired with softbox 4ft, calibrated 18 Nov 2026."
                  className="w-full px-3 py-2 bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] rounded-xl text-[#F1F5F9] placeholder:text-[#7E8F9F] outline-none focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-[#1E3A4F] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#1E3A4F] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-ui font-semibold transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  + Add to Studio Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
