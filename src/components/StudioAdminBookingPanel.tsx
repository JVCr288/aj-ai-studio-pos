import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  ChevronRight,
  ChevronDown,
  X,
  Plus,
  Eye,
  LogOut,
  Lock,
  MessageSquare,
  Building,
  Check,
  Slash,
  ArrowRight,
  Layers,
  Activity,
  Edit3,
  ArrowLeft,
} from 'lucide-react';
import { CustomerBookingRecord, BookingSummaryCounts, BookingEventRecord, BookingStatus, PaymentStatus } from '../services/serverBookingService';
import {
  fetchAdminBookingSummary,
  fetchAdminBookings,
  fetchBookingDetails,
  reviewBookingPayment,
  updateAdminBookingStatus,
  rescheduleAdminBooking,
  updateAdminPrivateNotes,
  loginStudioAdmin,
  fetchStudioAdminSession,
  logoutStudioAdmin,
  ApiError,
} from '../services/adminBookingClientService';

interface StudioAdminBookingPanelProps {
  onClose?: () => void;
  defaultTenantId?: string;
}

export type ConnectionStatusType = 'CONNECTED' | 'RECONNECTING' | 'LOCAL_DEV_PERSISTENCE' | 'DATABASE_UNAVAILABLE' | 'UNAUTHORIZED';

export function StudioAdminBookingPanel({ onClose, defaultTenantId = 'akk-photo-studio' }: StudioAdminBookingPanelProps) {
  const [tenantId, setTenantId] = useState<string>(defaultTenantId);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('STUDIO_ADMIN');
  const [userName, setUserName] = useState<string>('Studio Operations Desk');
  const [loginAdminKey, setLoginAdminKey] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Connection & API state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>('UNAUTHORIZED');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [spaceFilter, setSpaceFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Data states
  const [summary, setSummary] = useState<BookingSummaryCounts | null>(null);
  const [bookings, setBookings] = useState<CustomerBookingRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Selected Booking Drawer/Modal state
  const [selectedBooking, setSelectedBooking] = useState<CustomerBookingRecord | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<BookingEventRecord[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Sub-modals
  const [isPaymentReviewOpen, setIsPaymentReviewOpen] = useState<boolean>(false);
  const [paymentDecision, setPaymentDecision] = useState<'VERIFY' | 'REJECT'>('VERIFY');
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentNoteInput, setPaymentNoteInput] = useState<string>('');

  const [isRescheduleOpen, setIsRescheduleOpen] = useState<boolean>(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>('19 NOV 2026');
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('02:00 PM');
  const [rescheduleSpace, setRescheduleSpace] = useState<string>('BAY ALPHA-01');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  const [adminNotesInput, setAdminNotesInput] = useState<string>('');
  const [isNotesEditing, setIsNotesEditing] = useState<boolean>(false);

  // Load Admin Session on Mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const session = await fetchStudioAdminSession();
    if (session) {
      setIsAuthenticated(true);
      setTenantId(session.tenantId);
      setUserRole(session.userRole);
      setUserName(session.userName);
      setConnectionStatus('CONNECTED');
    } else {
      setIsAuthenticated(false);
      setConnectionStatus('UNAUTHORIZED');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await loginStudioAdmin(loginAdminKey, tenantId);
      setIsAuthenticated(true);
      setUserRole(res.userRole);
      setUserName(res.userName);
      setLoginAdminKey('');
      setConnectionStatus('CONNECTED');
      loadData();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credential');
      setConnectionStatus('UNAUTHORIZED');
    }
  };

  const handleLogout = async () => {
    await logoutStudioAdmin();
    setIsAuthenticated(false);
    setConnectionStatus('UNAUTHORIZED');
  };

  // Load Data function
  const loadData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [sum, res] = await Promise.all([
        fetchAdminBookingSummary(tenantId),
        fetchAdminBookings({
          tenantId,
          query: searchQuery,
          status: statusFilter,
          paymentStatus: paymentFilter,
          space: spaceFilter,
          date: dateFilter,
          page,
          pageSize: 15,
        }),
      ]);

      setSummary(sum);
      setBookings(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setConnectionStatus('CONNECTED');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        setIsAuthenticated(false);
        setConnectionStatus('UNAUTHORIZED');
        setLoginError('Admin session expired. Please re-authenticate.');
      } else if (err instanceof ApiError && err.status === 503) {
        setConnectionStatus('DATABASE_UNAVAILABLE');
        setApiError('DATABASE_UNAVAILABLE: Booking persistence service unreachable.');
      } else {
        setConnectionStatus('DATABASE_UNAVAILABLE');
        setApiError(err.message || 'Failed to fetch booking operations data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [tenantId, searchQuery, statusFilter, paymentFilter, spaceFilter, dateFilter, page, isAuthenticated]);

  const openBookingDetails = async (booking: CustomerBookingRecord) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    setAdminNotesInput(booking.privateAdminNotes || '');
    try {
      const res = await fetchBookingDetails(booking.id, tenantId);
      setSelectedBooking(res.booking);
      setSelectedEvents(res.events);
    } catch (err: any) {
      console.warn('Failed to refresh details:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleExecutePaymentReview = async () => {
    if (!selectedBooking) return;
    try {
      const parsedAmount = paymentAmountInput ? parseInt(paymentAmountInput, 10) : undefined;
      const updated = await reviewBookingPayment(
        selectedBooking.id,
        paymentDecision,
        parsedAmount,
        paymentNoteInput,
        tenantId
      );
      setSelectedBooking(updated);
      setIsPaymentReviewOpen(false);
      setNoticeMessage(`Payment review completed: Status set to ${updated.bookingStatus} (${updated.paymentStatus})`);
      loadData();
    } catch (err: any) {
      setApiError(`Payment Review Error: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (targetStatus: BookingStatus, reason?: string) => {
    if (!selectedBooking) return;
    try {
      const updated = await updateAdminBookingStatus(
        selectedBooking.id,
        targetStatus,
        reason,
        selectedBooking.revision,
        tenantId
      );
      setSelectedBooking(updated);
      setNoticeMessage(`Booking status updated to ${targetStatus}`);
      loadData();
    } catch (err: any) {
      if (err.message?.includes('STALE_REVISION')) {
        setApiError('CONCURRENT_UPDATE_CONFLICT: Another admin modified this booking. Reloading latest state.');
        openBookingDetails(selectedBooking);
      } else {
        setApiError(`Status Update Error: ${err.message}`);
      }
    }
  };

  const handleExecuteReschedule = async () => {
    if (!selectedBooking) return;
    setRescheduleError(null);
    try {
      const updated = await rescheduleAdminBooking(
        selectedBooking.id,
        rescheduleDate,
        rescheduleSlot,
        rescheduleSpace,
        tenantId
      );
      setSelectedBooking(updated);
      setIsRescheduleOpen(false);
      setNoticeMessage(`Booking rescheduled to ${updated.startDate} at ${updated.timeSlot}`);
      loadData();
    } catch (err: any) {
      setRescheduleError(err.message || 'Slot conflict detected. Please select another slot.');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedBooking) return;
    try {
      const updated = await updateAdminPrivateNotes(selectedBooking.id, adminNotesInput, tenantId);
      setSelectedBooking(updated);
      setIsNotesEditing(false);
      setNoticeMessage('Private admin notes updated');
    } catch (err: any) {
      setApiError(`Notes Update Error: ${err.message}`);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1E3A4F] text-[#94A3B8] border border-[#334155]">SUBMITTED</span>;
      case 'AWAITING_PAYMENT_REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">AWAITING REVIEW</span>;
      case 'CONFIRMED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">CONFIRMED</span>;
      case 'CHECKED_IN':
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">IN PROGRESS</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">CANCELLED</span>;
      case 'NO_SHOW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/30">NO SHOW</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1E3A4F] text-[#94A3B8]">{status}</span>;
    }
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">VERIFIED</span>;
      case 'EVIDENCE_RECEIVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">SLIP UPLOADED</span>;
      case 'PENDING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/30">PENDING</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">REJECTED</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1E3A4F] text-[#94A3B8]">{status}</span>;
    }
  };

  const renderConnectionBadge = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center space-x-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected</span>
          </span>
        );
      case 'RECONNECTING':
        return (
          <span className="inline-flex items-center space-x-1.5 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
            <span>Reconnecting...</span>
          </span>
        );
      case 'LOCAL_DEV_PERSISTENCE':
        return (
          <span className="inline-flex items-center space-x-1.5 text-[10px] font-medium text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Local Dev Adapter</span>
          </span>
        );
      case 'DATABASE_UNAVAILABLE':
        return (
          <span className="inline-flex items-center space-x-1.5 text-[10px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Database Unavailable</span>
          </span>
        );
      case 'UNAUTHORIZED':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 text-[10px] font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <Lock className="w-3 h-3 text-amber-300" />
            <span>Unauthorized</span>
          </span>
        );
    }
  };

  // Render Unauthenticated Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#030F1E] text-slate-100 flex flex-col items-center justify-center p-4 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 px-3 py-1.5 bg-[#0B1B2B] border border-[#1E3A4F] hover:border-[#38BDF8] text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#38BDF8]" />
            <span>Return to Studio</span>
          </button>
        )}

        <div className="w-full max-w-md bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center space-x-3 border-b border-[#1E3A4F] pb-4">
            <div className="p-2.5 bg-[#38BDF8]/10 rounded-lg border border-[#38BDF8]/30">
              <Shield className="w-6 h-6 text-[#38BDF8]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Studio Admin Access</h2>
              <p className="text-xs text-slate-400">AJ AI Studio Platform • Booking Operations Desk</p>
            </div>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Studio Tenant</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#38BDF8]"
              >
                <option value="akk-photo-studio">AKK Photo Studio (Pilot Tenant)</option>
                <option value="neutral-studio-tenant">Neutral Partner Studio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Access Key</label>
              <input
                type="password"
                value={loginAdminKey}
                onChange={(e) => setLoginAdminKey(e.target.value)}
                placeholder="Enter admin access key..."
                className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#38BDF8]"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Use the configured local Admin credential.</p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#071423] font-bold rounded-lg text-sm transition-colors shadow-lg shadow-[#38BDF8]/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Authenticate Operations Desk</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030F1E] text-slate-100 font-sans flex flex-col">
      {/* ------------------------------------------------------------------- */}
      {/* TOP ADMIN HEADER BAR */}
      {/* ------------------------------------------------------------------- */}
      <header className="bg-[#0B1B2B] border-b border-[#1E3A4F] px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 bg-[#1E3A4F]/60 hover:bg-[#1E3A4F] border border-[#334155] rounded-lg text-slate-300 transition-colors text-xs flex items-center space-x-1"
              title="Return to Main Studio View"
            >
              <ArrowLeft className="w-4 h-4 text-[#38BDF8]" />
              <span className="hidden sm:inline">Studio Shell</span>
            </button>
          )}

          <div className="p-2 bg-[#38BDF8]/10 rounded-lg border border-[#38BDF8]/30">
            <Shield className="w-5 h-5 text-[#38BDF8]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-100">Booking Operations Desk</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30">
                {tenantId === 'akk-photo-studio' ? 'AKK Photo Studio' : 'Neutral Tenant'}
              </span>
              {renderConnectionBadge()}
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
              <span>{userName} ({userRole})</span>
              <span>•</span>
              <span>18 NOV 2026 (+06:30 MM-DST)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-end sm:self-auto">
          {/* Tenant Switcher for Testing Isolation */}
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="bg-[#071423] border border-[#1E3A4F] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#38BDF8]"
            title="Switch Tenant for Multi-Tenant Isolation Testing"
          >
            <option value="akk-photo-studio">AKK Photo Studio</option>
            <option value="neutral-studio-tenant">Neutral Second Tenant</option>
          </select>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 bg-[#1E3A4F]/60 hover:bg-[#1E3A4F] border border-[#334155] rounded-lg text-slate-300 transition-colors flex items-center space-x-1 text-xs"
            title="Manual Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#38BDF8]' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg transition-colors text-xs flex items-center space-x-1"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Notice & API Error Notifications */}
      {noticeMessage && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button onClick={() => setNoticeMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {apiError && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-6 py-2.5 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="font-semibold">{apiError}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded font-semibold text-[11px]"
          >
            Retry API
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUMMARY STATS BAR */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total</span>
            <div className="text-xl font-bold text-slate-100">{summary?.total ?? 0}</div>
            <span className="text-[10px] text-slate-500 block">Tenant records</span>
          </div>

          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Today</span>
            <div className="text-xl font-bold text-sky-400">{summary?.today ?? 0}</div>
            <span className="text-[10px] text-slate-500 block">18 NOV 2026</span>
          </div>

          <div className="bg-[#0B1B2B] border border-amber-500/30 bg-amber-500/5 rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block">Awaiting Review</span>
            <div className="text-xl font-bold text-amber-400">{summary?.awaitingPaymentReview ?? 0}</div>
            <span className="text-[10px] text-amber-400/70 block">Slips needing desk review</span>
          </div>

          <div className="bg-[#0B1B2B] border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider block">Confirmed</span>
            <div className="text-xl font-bold text-emerald-400">{summary?.confirmed ?? 0}</div>
            <span className="text-[10px] text-emerald-400/70 block">Verified &amp; Accepted</span>
          </div>

          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">In Progress</span>
            <div className="text-xl font-bold text-sky-400">{summary?.inProgress ?? 0}</div>
            <span className="text-[10px] text-slate-500 block">Active sessions</span>
          </div>

          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Completed</span>
            <div className="text-xl font-bold text-purple-400">{summary?.completed ?? 0}</div>
            <span className="text-[10px] text-slate-500 block">Finished shoots</span>
          </div>

          <div className="col-span-2 sm:col-span-3 lg:col-span-1 bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-[#38BDF8] uppercase tracking-wider block">Verified Revenue</span>
            <div className="text-lg font-bold text-emerald-400 truncate">
              {(summary?.verifiedRevenueMMK ?? 0).toLocaleString()} <span className="text-xs font-medium text-slate-400">MMK</span>
            </div>
            <span className="text-[9px] text-slate-400 block italic">Verified deposits/payments only. Unverified slips excluded.</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* FILTERS & SEARCH TOOLBAR */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reference (#AKK-BK...), customer name, phone, email, or Telegram handle..."
                className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-[#071423] border border-[#1E3A4F] p-1 rounded-lg self-end md:self-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  viewMode === 'list' ? 'bg-[#1E3A4F] text-[#38BDF8]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  viewMode === 'calendar' ? 'bg-[#1E3A4F] text-[#38BDF8]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-[#1E3A4F]">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Booking Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#38BDF8]"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="AWAITING_PAYMENT_REVIEW">AWAITING REVIEW</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CHECKED_IN">CHECKED IN</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="NO_SHOW">NO SHOW</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Payment Status</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#38BDF8]"
              >
                <option value="ALL">All Payments</option>
                <option value="EVIDENCE_RECEIVED">SLIP UPLOADED</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="PENDING">PENDING</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Studio Space</label>
              <select
                value={spaceFilter}
                onChange={(e) => setSpaceFilter(e.target.value)}
                className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#38BDF8]"
              >
                <option value="ALL">All Studio Spaces</option>
                <option value="BAY ALPHA-01">BAY ALPHA-01</option>
                <option value="BAY BETA-02">BAY BETA-02</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Date Filter</label>
              <input
                type="text"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="e.g. 18 NOV 2026"
                className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* LIST / TABLE VIEW */}
        {/* ------------------------------------------------------------------- */}
        {viewMode === 'list' && (
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl overflow-hidden shadow-lg">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#38BDF8] mx-auto" />
                <p className="text-xs">Loading studio booking records...</p>
              </div>
            ) : apiError ? (
              <div className="p-12 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                <h3 className="text-sm font-bold text-rose-300">API Connection Error</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">{apiError}</p>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-[#38BDF8] text-[#071423] font-bold rounded-lg text-xs"
                >
                  Retry API Request
                </button>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-300">No Bookings Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No bookings match the selected tenant or search parameters. Try adjusting filters or submitting a test booking.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#071423] border-b border-[#1E3A4F] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Reference &amp; Date</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Package &amp; Space</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4">Financials</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E3A4F]">
                      {bookings.map((b) => (
                        <tr
                          key={b.id}
                          className="hover:bg-[#1E3A4F]/30 transition-colors group cursor-pointer"
                          onClick={() => openBookingDetails(b)}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#38BDF8]">
                            <div>{b.bookingReference}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Submitted: {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-100">{b.customerName}</div>
                            <div className="text-[11px] text-slate-400">{b.customerPhone}</div>
                            {b.telegramHandle && (
                              <div className="text-[10px] text-sky-400">{b.telegramHandle}</div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">{b.packageSnapshot.name}</div>
                            <div className="text-[11px] text-[#38BDF8]">{b.spaceSnapshot.name}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">{b.startDate}</div>
                            <div className="text-[11px] text-slate-400">{b.timeSlot}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-100">{b.totalAmount.toLocaleString()} MMK</div>
                            <div className="text-[10px] text-slate-400">
                              Deposit: {b.depositAmount.toLocaleString()} MMK
                            </div>
                            {b.verifiedPaidAmount > 0 && (
                              <div className="text-[10px] text-emerald-400 font-semibold">
                                Paid: {b.verifiedPaidAmount.toLocaleString()} MMK
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">{getPaymentBadge(b.paymentStatus)}</td>

                          <td className="py-3 px-4">{getStatusBadge(b.bookingStatus)}</td>

                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openBookingDetails(b)}
                              className="px-2.5 py-1 bg-[#1E3A4F] hover:bg-[#38BDF8] hover:text-[#071423] text-slate-200 rounded text-[11px] font-semibold transition-colors flex items-center space-x-1 ml-auto"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Review</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden divide-y divide-[#1E3A4F]">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => openBookingDetails(b)}
                      className="p-4 space-y-2.5 hover:bg-[#1E3A4F]/30 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-[#38BDF8]">{b.bookingReference}</span>
                        {getStatusBadge(b.bookingStatus)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Customer</span>
                          <div className="font-semibold text-slate-100">{b.customerName}</div>
                          <div className="text-[11px] text-slate-400">{b.customerPhone}</div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Schedule &amp; Space</span>
                          <div className="font-semibold text-slate-200">{b.startDate} @ {b.timeSlot}</div>
                          <div className="text-[11px] text-[#38BDF8]">{b.spaceSnapshot.name}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#1E3A4F]/60 text-xs">
                        <div>
                          <span className="text-slate-400">Total: </span>
                          <span className="font-bold text-slate-100">{b.totalAmount.toLocaleString()} MMK</span>
                        </div>
                        <div>{getPaymentBadge(b.paymentStatus)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Bar */}
                <div className="bg-[#071423] border-t border-[#1E3A4F] px-4 py-3 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    Showing <span className="text-slate-200 font-semibold">{bookings.length}</span> of{' '}
                    <span className="text-slate-200 font-semibold">{totalCount}</span> bookings
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-2.5 py-1 bg-[#1E3A4F] border border-[#334155] rounded text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1E3A4F]/80"
                    >
                      Prev
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-2.5 py-1 bg-[#1E3A4F] border border-[#334155] rounded text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1E3A4F]/80"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* CALENDAR / SCHEDULE VIEW */}
        {/* ------------------------------------------------------------------- */}
        {viewMode === 'calendar' && (
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-[#38BDF8]" />
                  <span>Studio Space Schedule — 18 NOV 2026</span>
                </h3>
                <p className="text-xs text-slate-400">Real-time slot occupation across studio bays</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 text-[11px] text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>Confirmed</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-[11px] text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>Review Pending</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bay Alpha-01 Column */}
              <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-2">
                  <span className="font-bold text-xs text-[#38BDF8]">BAY ALPHA-01 (Commercial)</span>
                  <span className="text-[10px] text-slate-400">18 NOV 2026</span>
                </div>

                <div className="space-y-2">
                  {['09:00 AM', '11:00 AM', '02:00 PM', '04:30 PM'].map((slot) => {
                    const match = bookings.find(
                      (b) => b.spaceSnapshot.name.includes('ALPHA') && b.timeSlot === slot && b.bookingStatus !== 'CANCELLED'
                    );
                    return (
                      <div
                        key={slot}
                        onClick={() => match && openBookingDetails(match)}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                          match
                            ? 'bg-[#1E3A4F]/60 border-[#38BDF8]/40 cursor-pointer hover:border-[#38BDF8]'
                            : 'bg-[#030F1E] border-[#1E3A4F]/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-slate-200">{slot}</span>
                        </div>

                        {match ? (
                          <div className="flex items-center space-x-2 text-right">
                            <div>
                              <div className="font-semibold text-slate-100">{match.customerName}</div>
                              <div className="text-[10px] text-slate-400">{match.bookingReference}</div>
                            </div>
                            {getStatusBadge(match.bookingStatus)}
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400 uppercase font-semibold">Available</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bay Beta-02 Column */}
              <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-2">
                  <span className="font-bold text-xs text-purple-400">BAY BETA-02 (Portrait Nook)</span>
                  <span className="text-[10px] text-slate-400">18 NOV 2026</span>
                </div>

                <div className="space-y-2">
                  {['09:00 AM', '11:00 AM', '02:00 PM', '04:30 PM'].map((slot) => {
                    const match = bookings.find(
                      (b) => b.spaceSnapshot.name.includes('BETA') && b.timeSlot === slot && b.bookingStatus !== 'CANCELLED'
                    );
                    return (
                      <div
                        key={slot}
                        onClick={() => match && openBookingDetails(match)}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                          match
                            ? 'bg-[#1E3A4F]/60 border-purple-500/40 cursor-pointer hover:border-purple-400'
                            : 'bg-[#030F1E] border-[#1E3A4F]/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-slate-200">{slot}</span>
                        </div>

                        {match ? (
                          <div className="flex items-center space-x-2 text-right">
                            <div>
                              <div className="font-semibold text-slate-100">{match.customerName}</div>
                              <div className="text-[10px] text-slate-400">{match.bookingReference}</div>
                            </div>
                            {getStatusBadge(match.bookingStatus)}
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400 uppercase font-semibold">Available</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* BOOKING DETAIL DRAWER / MODAL */}
      {/* ------------------------------------------------------------------- */}
      {isDetailOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030F1E]/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-[#0B1B2B] border-l border-[#1E3A4F] min-h-screen p-5 sm:p-6 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-lg text-[#38BDF8]">
                      {selectedBooking.bookingReference}
                    </span>
                    {getStatusBadge(selectedBooking.bookingStatus)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tenant: {selectedBooking.tenantId} • Idempotency: {selectedBooking.idempotencyKey.slice(0, 16)}...
                  </p>
                </div>

                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 bg-[#1E3A4F] hover:bg-[#334155] text-slate-300 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer & Schedule Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-3.5 space-y-2">
                  <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider block">Customer Details</span>
                  <div className="font-bold text-sm text-slate-100">{selectedBooking.customerName}</div>
                  <div className="text-xs text-slate-300 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedBooking.customerPhone}</span>
                  </div>
                  {selectedBooking.customerEmail && (
                    <div className="text-xs text-slate-300 flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedBooking.customerEmail}</span>
                    </div>
                  )}
                  {selectedBooking.telegramHandle && (
                    <div className="text-xs text-sky-400 flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{selectedBooking.telegramHandle}</span>
                    </div>
                  )}
                </div>

                <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-3.5 space-y-2">
                  <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider block">Schedule &amp; Space</span>
                  <div className="font-bold text-sm text-slate-100">{selectedBooking.startDate} @ {selectedBooking.timeSlot}</div>
                  <div className="text-xs text-[#38BDF8] font-semibold">{selectedBooking.spaceSnapshot.name}</div>
                  <div className="text-xs text-slate-400">{selectedBooking.packageSnapshot.name}</div>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-4 space-y-3">
                <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider block">Financial Snapshot</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Total Price</span>
                    <span className="font-bold text-slate-100">{selectedBooking.totalAmount.toLocaleString()} MMK</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Required Deposit</span>
                    <span className="font-bold text-slate-100">{selectedBooking.depositAmount.toLocaleString()} MMK</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Verified Paid</span>
                    <span className="font-bold text-emerald-400">{selectedBooking.verifiedPaidAmount.toLocaleString()} MMK</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Outstanding Balance</span>
                    <span className="font-bold text-amber-400">{selectedBooking.outstandingBalance.toLocaleString()} MMK</span>
                  </div>
                </div>
              </div>

              {/* Payment Evidence & Desk Review Action */}
              <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-2">
                  <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider">
                    Payment Evidence Review
                  </span>
                  {getPaymentBadge(selectedBooking.paymentStatus)}
                </div>

                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Payment Gateway:</span>
                    <span className="font-semibold text-slate-100">{selectedBooking.paymentMethod}</span>
                  </div>

                  {selectedBooking.uploadedSlipName && (
                    <div className="flex items-center justify-between bg-[#030F1E] p-2 rounded border border-[#1E3A4F]">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-[#38BDF8]" />
                        <div>
                          <div className="font-medium text-slate-200">{selectedBooking.uploadedSlipName}</div>
                          <div className="text-[10px] text-slate-500">{selectedBooking.uploadedSlipSize || '2.1 MB'}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono font-semibold">Slip Attached</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => {
                      setPaymentDecision('VERIFY');
                      setPaymentAmountInput(String(selectedBooking.depositAmount));
                      setIsPaymentReviewOpen(true);
                    }}
                    className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Verify Deposit Payment</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentDecision('REJECT');
                      setIsPaymentReviewOpen(true);
                    }}
                    className="py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Reject Slip</span>
                  </button>
                </div>
              </div>

              {/* Status Action Toolbar */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Admin Lifecycle Actions</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    onClick={() => handleUpdateStatus('CONFIRMED')}
                    disabled={selectedBooking.bookingStatus === 'CONFIRMED'}
                    className="py-2 bg-[#1E3A4F] hover:bg-[#38BDF8] hover:text-[#071423] disabled:opacity-40 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Confirm Booking
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('CHECKED_IN')}
                    disabled={selectedBooking.bookingStatus === 'CHECKED_IN' || selectedBooking.bookingStatus === 'CANCELLED'}
                    className="py-2 bg-[#1E3A4F] hover:bg-[#38BDF8] hover:text-[#071423] disabled:opacity-40 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Check In Guest
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('COMPLETED')}
                    disabled={selectedBooking.bookingStatus === 'COMPLETED'}
                    className="py-2 bg-[#1E3A4F] hover:bg-[#38BDF8] hover:text-[#071423] disabled:opacity-40 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Mark Complete
                  </button>

                  <button
                    onClick={() => setIsRescheduleOpen(true)}
                    className="py-2 bg-[#1E3A4F] hover:bg-[#38BDF8] hover:text-[#071423] rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Reschedule
                  </button>
                </div>

                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    disabled={selectedBooking.bookingStatus === 'CANCELLED'}
                    className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 disabled:opacity-40 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel Booking
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('NO_SHOW')}
                    disabled={selectedBooking.bookingStatus === 'NO_SHOW'}
                    className="py-1.5 px-3 bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 border border-gray-500/30 disabled:opacity-40 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    No Show
                  </button>
                </div>
              </div>

              {/* Private Admin Notes */}
              <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider">Private Studio Notes</span>
                  <button
                    onClick={() => setIsNotesEditing(!isNotesEditing)}
                    className="text-xs text-[#38BDF8] hover:underline flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isNotesEditing ? 'Cancel' : 'Edit Notes'}</span>
                  </button>
                </div>

                {isNotesEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={adminNotesInput}
                      onChange={(e) => setAdminNotesInput(e.target.value)}
                      placeholder="Add private studio desk notes..."
                      className="w-full h-20 bg-[#030F1E] border border-[#1E3A4F] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-[#38BDF8]"
                    />
                    <button
                      onClick={handleSaveNotes}
                      className="px-3 py-1.5 bg-[#38BDF8] text-[#071423] text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Save Internal Notes
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 whitespace-pre-wrap italic">
                    {selectedBooking.privateAdminNotes || 'No private admin notes recorded.'}
                  </p>
                )}
              </div>

              {/* Immutable Audit Timeline */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Immutable Audit History</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedEvents.map((evt) => (
                    <div key={evt.id} className="bg-[#071423] border border-[#1E3A4F]/60 rounded-lg p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-sky-400">{evt.eventType}</span>
                        <span>{new Date(evt.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-200">{evt.message}</p>
                      <div className="text-[10px] text-slate-500">Actor: {evt.actorId} ({evt.actorRole})</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT REVIEW SUB-MODAL */}
      {isPaymentReviewOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-3">
              <h3 className="text-sm font-bold text-slate-100">
                {paymentDecision === 'VERIFY' ? 'Verify Deposit Payment' : 'Reject Payment Evidence'}
              </h3>
              <button onClick={() => setIsPaymentReviewOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {paymentDecision === 'VERIFY' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount Verified (MMK)</label>
                  <input
                    type="number"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-100 focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Admin Verification Note / Reason</label>
                <textarea
                  value={paymentNoteInput}
                  onChange={(e) => setPaymentNoteInput(e.target.value)}
                  placeholder={paymentDecision === 'VERIFY' ? 'e.g. Verified via KBZPay statement TRX88219' : 'e.g. Incomplete transfer receipt screenshot'}
                  className="w-full h-20 bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-100 focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <button
                onClick={handleExecutePaymentReview}
                className={`w-full py-2.5 font-bold rounded-lg transition-colors cursor-pointer ${
                  paymentDecision === 'VERIFY'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-[#071423]'
                    : 'bg-rose-500 hover:bg-rose-400 text-[#071423]'
                }`}
              >
                {paymentDecision === 'VERIFY' ? 'Confirm & Verify Payment' : 'Reject Payment Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE SUB-MODAL */}
      {isRescheduleOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-3">
              <h3 className="text-sm font-bold text-slate-100">Reschedule Session</h3>
              <button onClick={() => setIsRescheduleOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {rescheduleError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-300">
                {rescheduleError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Date</label>
                <input
                  type="text"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  placeholder="e.g. 19 NOV 2026"
                  className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-100 focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Time Slot</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-100 focus:outline-none focus:border-[#38BDF8]"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Studio Space</label>
                <select
                  value={rescheduleSpace}
                  onChange={(e) => setRescheduleSpace(e.target.value)}
                  className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-100 focus:outline-none focus:border-[#38BDF8]"
                >
                  <option value="BAY ALPHA-01">BAY ALPHA-01</option>
                  <option value="BAY BETA-02">BAY BETA-02</option>
                </select>
              </div>

              <button
                onClick={handleExecuteReschedule}
                className="w-full py-2.5 bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#071423] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Recheck Conflict &amp; Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION SUB-MODAL */}
      {isCancelModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B1B2B] border border-rose-500/30 rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-3">
              <h3 className="text-sm font-bold text-rose-400">Cancel Booking Confirmation</h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Are you sure you want to cancel booking <strong className="text-white">{selectedBooking.bookingReference}</strong> for {selectedBooking.customerName}?
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cancellation Reason (Required)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer requested cancellation via phone"
                  className="w-full h-20 bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-100 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2 bg-[#1E3A4F] text-slate-300 font-semibold rounded-lg cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  onClick={() => {
                    handleUpdateStatus('CANCELLED', cancelReason);
                    setIsCancelModalOpen(false);
                  }}
                  disabled={!cancelReason.trim()}
                  className="flex-1 py-2 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-[#071423] font-bold rounded-lg cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
