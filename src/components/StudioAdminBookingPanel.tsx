import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  LogOut,
  X,
  BookOpen,
} from 'lucide-react';
import { StudioUserGuideModal } from './StudioUserGuideModal';
import { useStudioRealtimeEvents } from '../hooks/useStudioRealtimeEvents';
import {
  CustomerBookingRecord,
  BookingSummaryCounts,
  BookingEventRecord,
  BookingStatus,
} from '../services/serverBookingService';
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
import { AdminSummaryCards } from './admin/AdminSummaryCards';
import { AdminFilterBar } from './admin/AdminFilterBar';
import { AdminBookingTable } from './admin/AdminBookingTable';
import { AdminBookingDetailDrawer } from './admin/AdminBookingDetailDrawer';
import { AdminLoginModal } from './admin/AdminLoginModal';

interface StudioAdminBookingPanelProps {
  onClose?: () => void;
  defaultTenantId?: string;
}

export type ConnectionStatusType =
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'LOCAL_DEV_PERSISTENCE'
  | 'DATABASE_UNAVAILABLE'
  | 'UNAUTHORIZED';

export function StudioAdminBookingPanel({
  onClose,
  defaultTenantId = 'aj-ai-studio',
}: StudioAdminBookingPanelProps) {
  const [tenantId, setTenantId] = useState<string>(defaultTenantId);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('STUDIO_ADMIN');
  const [userName, setUserName] = useState<string>('Studio Operations Desk');
  const [loginAdminKey, setLoginAdminKey] = useState<string>('');
  const [loginUsername, setLoginUsername] = useState<string>('admin');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Connection & API state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>('UNAUTHORIZED');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [spaceFilter, setSpaceFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

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
      const res = await loginStudioAdmin(loginAdminKey, tenantId, loginUsername);
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

  const [realtimeNotice, setRealtimeNotice] = useState<string | null>(null);

  const { connectionStatus: sseStatus } = useStudioRealtimeEvents({
    tenantId,
    enabled: isAuthenticated,
    playChime: true,
    onEvent: (event) => {
      loadData();

      if (event.type === 'BOOKING_CREATED') {
        const ref = event.payload?.bookingReference || 'New Booking';
        const name = event.payload?.customerName || 'Customer';
        setRealtimeNotice(`⚡ Real-Time Live: New online booking from ${name} (${ref}) received!`);
        setTimeout(() => setRealtimeNotice(null), 8000);
      } else if (event.type === 'PAYMENT_VERIFIED') {
        const ref = event.payload?.bookingReference || 'Booking';
        setRealtimeNotice(`⚡ Real-Time Live: Payment verified for ${ref}!`);
        setTimeout(() => setRealtimeNotice(null), 6000);
      } else if (event.type === 'BOOKING_UPDATED') {
        const ref = event.payload?.bookingReference || 'Booking';
        setRealtimeNotice(`⚡ Real-Time Live: ${ref} status updated to ${event.payload?.bookingStatus}`);
        setTimeout(() => setRealtimeNotice(null), 5000);
      }
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [tenantId, searchQuery, statusFilter, paymentFilter, spaceFilter, dateFilter, page, isAuthenticated]);

  const openBookingDetails = async (booking: CustomerBookingRecord) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
    setIsDetailLoading(true);
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

  const handleExecutePaymentReview = async (
    decision: 'VERIFY' | 'REJECT',
    amountPaidMMK?: number,
    notes?: string
  ) => {
    if (!selectedBooking) return;
    try {
      const updated = await reviewBookingPayment(
        selectedBooking.id,
        decision,
        amountPaidMMK,
        notes,
        tenantId
      );
      setSelectedBooking(updated);
      setNoticeMessage(`Payment review completed: ${decision === 'VERIFY' ? 'VERIFIED' : 'REJECTED'}`);
      setTimeout(() => setNoticeMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(`Review Failed: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (targetStatus: BookingStatus) => {
    if (!selectedBooking) return;
    try {
      const updated = await updateAdminBookingStatus(
        selectedBooking.id,
        targetStatus,
        `Status transitioned to ${targetStatus} via Admin Console`,
        selectedBooking.revision,
        tenantId
      );
      setSelectedBooking(updated);
      setNoticeMessage(`Booking status updated to ${targetStatus}`);
      setTimeout(() => setNoticeMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleExecuteReschedule = async (
    newDateStr: string,
    newTimeSlot: string,
    newSpaceName: string
  ) => {
    if (!selectedBooking) return;
    const updated = await rescheduleAdminBooking(
      selectedBooking.id,
      newDateStr,
      newTimeSlot,
      newSpaceName,
      tenantId
    );
    setSelectedBooking(updated);
    setNoticeMessage(`Session rescheduled to ${newDateStr} @ ${newTimeSlot}`);
    setTimeout(() => setNoticeMessage(null), 4000);
    loadData();
  };

  const handleExecuteCancel = async (reason: string) => {
    if (!selectedBooking) return;
    const updated = await updateAdminBookingStatus(
      selectedBooking.id,
      'CANCELLED',
      reason,
      selectedBooking.revision,
      tenantId
    );
    setSelectedBooking(updated);
    setNoticeMessage('Booking cancelled successfully.');
    setTimeout(() => setNoticeMessage(null), 4000);
    loadData();
  };

  const handleSaveNotes = async (notes: string) => {
    if (!selectedBooking) return;
    const updated = await updateAdminPrivateNotes(selectedBooking.id, notes, tenantId);
    setSelectedBooking(updated);
    setNoticeMessage('Internal studio desk notes saved.');
    setTimeout(() => setNoticeMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#030F1E] text-[#F1F5F9] font-sans flex flex-col">
      {/* ---------------------------------------------------------------------
          TOP GLOBAL HEADER & TELEMETRY BAR
      --------------------------------------------------------------------- */}
      <header className="h-14 bg-[#071423] border-b border-[#1E3A4F] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h1 className="text-sm font-bold tracking-tight text-[#F1F5F9] truncate">
              Studio Admin Operations Panel
            </h1>
            <p className="text-[10px] text-[#94A3B8] font-mono truncate">
              Tenant: {tenantId} • Role: {userRole} ({userName})
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          {/* Live SSE Pulse Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#030F1E] border border-[#1E3A4F] text-[10px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                sseStatus === 'CONNECTED'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-[#94A3B8]">
              {sseStatus === 'CONNECTED' ? 'SSE Live Stream' : 'Connecting'}
            </span>
          </div>

          {/* User Guide Button */}
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-sky-500/15 to-indigo-500/15 hover:from-sky-500/25 hover:to-indigo-500/25 border border-sky-500/40 text-xs font-bold text-sky-400 transition-all cursor-pointer shadow-sm"
            title="Open Interactive System User Guide (EN / MM)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">User Guide (လမ်းညွှန်)</span>
            <span className="sm:hidden">Guide</span>
          </button>

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-[#102538] transition-colors cursor-pointer"
              title="Logout of admin panel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#102538] transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Real-time Toast Notifications */}
      {realtimeNotice && (
        <div className="bg-sky-500/20 border-b border-sky-500/40 px-4 py-2 text-xs font-mono text-sky-200 text-center animate-in fade-in duration-200">
          {realtimeNotice}
        </div>
      )}

      {noticeMessage && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-4 py-2 text-xs font-mono text-emerald-200 text-center animate-in fade-in duration-200">
          {noticeMessage}
        </div>
      )}

      {/* ---------------------------------------------------------------------
          BODY CONTENT
      --------------------------------------------------------------------- */}
      {!isAuthenticated ? (
        <AdminLoginModal
          tenantId={tenantId}
          onTenantChange={setTenantId}
          username={loginUsername}
          onUsernameChange={setLoginUsername}
          loginAdminKey={loginAdminKey}
          onLoginAdminKeyChange={setLoginAdminKey}
          onSubmit={handleLoginSubmit}
          loginError={loginError}
        />
      ) : (
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* KPI Summary Cards */}
          <AdminSummaryCards summary={summary} />

          {/* Search & Filter Toolbar */}
          <AdminFilterBar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            paymentFilter={paymentFilter}
            onPaymentFilterChange={setPaymentFilter}
            spaceFilter={spaceFilter}
            onSpaceFilterChange={setSpaceFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            onRefresh={loadData}
            isLoading={isLoading}
          />

          {/* Bookings Data Table & Mobile Cards */}
          <AdminBookingTable
            bookings={bookings}
            isLoading={isLoading}
            onOpenDetails={openBookingDetails}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
          />

          {/* Slide-over Inspection Drawer */}
          <AdminBookingDetailDrawer
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            booking={selectedBooking}
            events={selectedEvents}
            isLoading={isDetailLoading}
            onUpdateStatus={handleUpdateStatus}
            onReviewPayment={handleExecutePaymentReview}
            onReschedule={handleExecuteReschedule}
            onCancel={handleExecuteCancel}
            onSaveNotes={handleSaveNotes}
          />
        </main>
      )}

      {/* System Interactive User Guide Modal (EN / MM) */}
      <StudioUserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        defaultModule="overview"
      />
    </div>
  );
}
