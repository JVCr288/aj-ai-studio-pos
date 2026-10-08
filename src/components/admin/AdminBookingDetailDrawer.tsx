import React, { useState } from 'react';
import { CustomerBookingRecord, BookingEventRecord, BookingStatus } from '../../services/serverBookingService';
import {
  X,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  CheckCircle2,
  XCircle,
  Edit3,
} from 'lucide-react';

interface AdminBookingDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  booking: CustomerBookingRecord | null;
  events: BookingEventRecord[];
  isLoading: boolean;
  onUpdateStatus: (status: BookingStatus) => void;
  onReviewPayment: (decision: 'VERIFY' | 'REJECT', amount?: number, notes?: string) => Promise<void>;
  onReschedule: (newDate: string, newTime: string, newSpace: string) => Promise<void>;
  onCancel: (reason: string) => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
}

export const AdminBookingDetailDrawer: React.FC<AdminBookingDetailDrawerProps> = ({
  isOpen,
  onClose,
  booking,
  events,
  isLoading,
  onUpdateStatus,
  onReviewPayment,
  onReschedule,
  onCancel,
  onSaveNotes,
}) => {
  // Sub-modal states
  const [isPaymentReviewOpen, setIsPaymentReviewOpen] = useState(false);
  const [paymentDecision, setPaymentDecision] = useState<'VERIFY' | 'REJECT'>('VERIFY');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentNoteInput, setPaymentNoteInput] = useState('');

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('19 NOV 2026');
  const [rescheduleSlot, setRescheduleSlot] = useState('02:00 PM');
  const [rescheduleSpace, setRescheduleSpace] = useState('BAY ALPHA-01');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [adminNotesInput, setAdminNotesInput] = useState(booking?.privateAdminNotes || '');
  const [isNotesEditing, setIsNotesEditing] = useState(false);

  if (!isOpen || !booking) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'CHECKED_IN':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'AWAITING_PAYMENT_REVIEW':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'COMPLETED':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-emerald-500/20 text-emerald-300';
      case 'EVIDENCE_RECEIVED':
        return 'bg-sky-500/20 text-sky-300';
      case 'REJECTED':
        return 'bg-rose-500/20 text-rose-300';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const handleExecutePaymentReview = async () => {
    const amt = paymentAmountInput ? parseInt(paymentAmountInput, 10) : undefined;
    await onReviewPayment(paymentDecision, amt, paymentNoteInput);
    setIsPaymentReviewOpen(false);
  };

  const handleExecuteReschedule = async () => {
    setRescheduleError(null);
    try {
      await onReschedule(rescheduleDate, rescheduleSlot, rescheduleSpace);
      setIsRescheduleOpen(false);
    } catch (err: any) {
      setRescheduleError(err.message || 'Reschedule conflict detected');
    }
  };

  const handleExecuteCancel = async () => {
    await onCancel(cancelReason || 'Cancelled by Studio Desk');
    setIsCancelModalOpen(false);
  };

  const handleSaveNotesInternal = async () => {
    await onSaveNotes(adminNotesInput);
    setIsNotesEditing(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030F1E]/80 backdrop-blur-sm flex justify-end">
        <div className="w-full max-w-2xl bg-[#0B1B2B] border-l border-[#1E3A4F] min-h-screen p-4 sm:p-6 space-y-6 shadow-2xl flex flex-col justify-between">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-lg text-[#38BDF8]">
                    {booking.bookingReference}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getStatusBadge(booking.bookingStatus)}`}>
                    {booking.bookingStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Tenant: {booking.tenantId} • Idempotency: {booking.idempotencyKey.slice(0, 16)}...
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-[#1E3A4F] hover:bg-[#334155] text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Schedule Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-3.5 space-y-2">
                <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider block">Customer Details</span>
                <div className="font-bold text-sm text-slate-100">{booking.customerName}</div>
                <div className="text-xs text-slate-300 flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{booking.customerPhone}</span>
                </div>
                {booking.customerEmail && (
                  <div className="text-xs text-slate-300 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{booking.customerEmail}</span>
                  </div>
                )}
                {booking.telegramHandle && (
                  <div className="text-xs text-sky-400 flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{booking.telegramHandle}</span>
                  </div>
                )}
              </div>

              <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-3.5 space-y-2">
                <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider block">Schedule &amp; Space</span>
                <div className="font-bold text-sm text-slate-100">{booking.startDate} @ {booking.timeSlot}</div>
                <div className="text-xs text-[#38BDF8] font-semibold">{booking.spaceSnapshot.name}</div>
                <div className="text-xs text-slate-400">{booking.packageSnapshot.name}</div>
              </div>
            </div>

            {/* Financial Snapshot */}
            <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-4 space-y-3 font-mono">
              <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider block font-sans">Financial Snapshot</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-sans">Total Price</span>
                  <span className="font-bold text-slate-100">{booking.totalAmount.toLocaleString()} MMK</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Required Deposit</span>
                  <span className="font-bold text-slate-100">{booking.depositAmount.toLocaleString()} MMK</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Verified Paid</span>
                  <span className="font-bold text-emerald-400">{booking.verifiedPaidAmount.toLocaleString()} MMK</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Outstanding</span>
                  <span className="font-bold text-amber-400">{booking.outstandingBalance.toLocaleString()} MMK</span>
                </div>
              </div>
            </div>

            {/* Payment Evidence & Desk Review Action */}
            <div className="bg-[#071423] border border-[#1E3A4F] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E3A4F] pb-2">
                <span className="text-[10px] font-semibold text-[#38BDF8] uppercase tracking-wider">
                  Payment Evidence Review
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${getPaymentBadge(booking.paymentStatus)}`}>
                  {booking.paymentStatus}
                </span>
              </div>

              <div className="text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Payment Gateway:</span>
                  <span className="font-semibold text-slate-100">{booking.paymentMethod}</span>
                </div>

                {booking.uploadedSlipName && (
                  <div className="flex items-center justify-between bg-[#030F1E] p-2 rounded border border-[#1E3A4F]">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-[#38BDF8]" />
                      <div>
                        <div className="font-medium text-slate-200">{booking.uploadedSlipName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{booking.uploadedSlipSize || '2.1 MB'}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">Slip Attached</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentDecision('VERIFY');
                    setPaymentAmountInput(String(booking.depositAmount));
                    setIsPaymentReviewOpen(true);
                  }}
                  className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Verify Deposit Payment</span>
                </button>

                <button
                  type="button"
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
                  type="button"
                  onClick={() => onUpdateStatus('CONFIRMED')}
                  disabled={booking.bookingStatus === 'CONFIRMED'}
                  className="py-2 bg-[#1E3A4F] hover:bg-[#38BDF8] hover:text-[#071423] disabled:opacity-40 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Confirm Booking
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateStatus('CHECKED_IN')}
                  disabled={booking.bookingStatus === 'CHECKED_IN' || booking.bookingStatus === 'CANCELLED'}
                  className="py-2 bg-[#1E3A4F] hover:bg-[#38BDF8] hover:text-[#071423] disabled:opacity-40 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Check In Guest
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateStatus('COMPLETED')}
                  disabled={booking.bookingStatus === 'COMPLETED'}
                  className="py-2 bg-[#1E3A4F] hover:bg-[#38BDF8] hover:text-[#071423] disabled:opacity-40 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Mark Complete
                </button>

                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(true)}
                  className="py-2 bg-[#1E3A4F] hover:bg-[#38BDF8] hover:text-[#071423] rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Reschedule
                </button>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  disabled={booking.bookingStatus === 'CANCELLED'}
                  className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 disabled:opacity-40 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel Booking
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateStatus('NO_SHOW')}
                  disabled={booking.bookingStatus === 'NO_SHOW'}
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
                  type="button"
                  onClick={() => setIsNotesEditing(!isNotesEditing)}
                  className="text-xs text-[#38BDF8] hover:underline flex items-center space-x-1 cursor-pointer"
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
                    type="button"
                    onClick={handleSaveNotesInternal}
                    className="px-3 py-1.5 bg-[#38BDF8] text-[#071423] text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Save Internal Notes
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-300 whitespace-pre-wrap italic">
                  {booking.privateAdminNotes || 'No private admin notes recorded.'}
                </p>
              )}
            </div>

            {/* Immutable Audit Timeline */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Immutable Audit History</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {events.map((evt) => (
                  <div key={evt.id} className="bg-[#071423] border border-[#1E3A4F]/60 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="font-semibold text-sky-400">{evt.eventType}</span>
                      <span>{new Date(evt.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-200">{evt.message}</p>
                    <div className="text-[10px] text-slate-500 font-mono">Actor: {evt.actorId} ({evt.actorRole})</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT REVIEW SUB-MODAL */}
      {isPaymentReviewOpen && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100">Review Payment Evidence</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Decision</label>
                <select
                  value={paymentDecision}
                  onChange={(e) => setPaymentDecision(e.target.value as 'VERIFY' | 'REJECT')}
                  className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-200"
                >
                  <option value="VERIFY">VERIFY (Approve Deposit)</option>
                  <option value="REJECT">REJECT (Invalid Slip)</option>
                </select>
              </div>

              {paymentDecision === 'VERIFY' && (
                <div>
                  <label className="text-slate-400 block mb-1">Verified Amount (MMK)</label>
                  <input
                    type="number"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Desk Review Notes</label>
                <textarea
                  value={paymentNoteInput}
                  onChange={(e) => setPaymentNoteInput(e.target.value)}
                  placeholder="Notes explaining approval or rejection reason..."
                  className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentReviewOpen(false)}
                className="flex-1 py-2 bg-[#1E3A4F] hover:bg-[#334155] text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePaymentReview}
                className="flex-1 py-2 bg-[#38BDF8] hover:bg-[#0284C7] text-[#071423] rounded-lg text-xs font-bold cursor-pointer"
              >
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE SUB-MODAL */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100">Reschedule Session</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">New Date</label>
                <input
                  type="text"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">New Time Slot</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-200 font-mono"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Space</label>
                <select
                  value={rescheduleSpace}
                  onChange={(e) => setRescheduleSpace(e.target.value)}
                  className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-slate-200"
                >
                  <option value="BAY ALPHA-01">BAY ALPHA-01 (Commercial)</option>
                  <option value="BAY BETA-02">BAY BETA-02 (Portrait Nook)</option>
                </select>
              </div>

              {rescheduleError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs">
                  {rescheduleError}
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(false)}
                className="flex-1 py-2 bg-[#1E3A4F] hover:bg-[#334155] text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReschedule}
                className="flex-1 py-2 bg-[#38BDF8] hover:bg-[#0284C7] text-[#071423] rounded-lg text-xs font-bold cursor-pointer"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION SUB-MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#030F1E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-rose-400">Cancel Booking</h3>
            <p className="text-xs text-slate-400">
              Please enter the cancellation reason for the audit trail.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer requested cancellation due to travel schedule..."
              className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-xs text-slate-200"
            />
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-2 bg-[#1E3A4F] hover:bg-[#334155] text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteCancel}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
