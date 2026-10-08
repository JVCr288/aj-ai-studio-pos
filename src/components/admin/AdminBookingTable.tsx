import React from 'react';
import { CustomerBookingRecord } from '../../services/serverBookingService';
import {
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  ArrowRight,
} from 'lucide-react';

interface AdminBookingTableProps {
  bookings: CustomerBookingRecord[];
  isLoading: boolean;
  onOpenDetails: (booking: CustomerBookingRecord) => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
}

export const AdminBookingTable: React.FC<AdminBookingTableProps> = ({
  bookings,
  isLoading,
  onOpenDetails,
  page,
  totalPages,
  totalCount,
  onPageChange,
}) => {
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

  return (
    <div className="rounded-xl bg-[#071423] border border-[#1E3A4F] overflow-hidden">
      {/* -------------------------------------------------------------------
          1. DESKTOP VIEW: High-Density Data Table (Visible on md+ viewports)
      ------------------------------------------------------------------- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-[#94A3B8]">
          <thead className="bg-[#030F1E] text-[11px] font-mono uppercase text-[#64748B] border-b border-[#1E3A4F]">
            <tr>
              <th className="py-3 px-4">Ref / Customer</th>
              <th className="py-3 px-4">Space &amp; Session</th>
              <th className="py-3 px-4">Date &amp; Time</th>
              <th className="py-3 px-4">Booking Status</th>
              <th className="py-3 px-4">Payment</th>
              <th className="py-3 px-4 text-right">Total (MMK)</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E3A4F]/60">
            {bookings.map((bk) => (
              <tr
                key={bk.id}
                onClick={() => onOpenDetails(bk)}
                className="hover:bg-[#102538]/50 transition-colors cursor-pointer group"
              >
                {/* Ref & Customer */}
                <td className="py-3 px-4">
                  <div className="font-mono font-bold text-[#F1F5F9] group-hover:text-[#38BDF8] transition-colors">
                    {bk.bookingReference}
                  </div>
                  <div className="text-[11px] text-[#64748B] flex items-center space-x-1 mt-0.5">
                    <User className="w-3 h-3 text-[#38BDF8]" />
                    <span className="text-[#94A3B8]">{bk.customerName}</span>
                    <span>• {bk.customerPhone}</span>
                  </div>
                </td>

                {/* Space */}
                <td className="py-3 px-4">
                  <div className="font-medium text-[#F1F5F9]">{bk.spaceSnapshot?.name || 'Studio Bay'}</div>
                  <div className="text-[11px] text-[#64748B] truncate max-w-[140px]">
                    {bk.packageSnapshot?.name}
                  </div>
                </td>

                {/* Schedule */}
                <td className="py-3 px-4 font-mono text-[11px]">
                  <div className="text-[#F1F5F9]">{bk.startDate}</div>
                  <div className="text-[#38BDF8]">{bk.timeSlot}</div>
                </td>

                {/* Booking Status */}
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getStatusBadge(
                      bk.bookingStatus
                    )}`}
                  >
                    {bk.bookingStatus.replace(/_/g, ' ')}
                  </span>
                </td>

                {/* Payment Status */}
                <td className="py-3 px-4 font-mono">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${getPaymentBadge(
                      bk.paymentStatus
                    )}`}
                  >
                    {bk.paymentStatus}
                  </span>
                  <div className="text-[10px] text-[#64748B] mt-0.5">{bk.paymentMethod}</div>
                </td>

                {/* Total & Deposit */}
                <td className="py-3 px-4 text-right font-mono">
                  <div className="font-bold text-[#F1F5F9]">{bk.totalAmount.toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-400">
                    Dep: {bk.verifiedPaidAmount.toLocaleString()}
                  </div>
                </td>

                {/* Action button */}
                <td className="py-3 px-4 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails(bk);
                    }}
                    className="p-1.5 rounded-lg bg-[#030F1E] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] transition-colors cursor-pointer"
                    title="View Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* -------------------------------------------------------------------
          2. MOBILE VIEW: Touch-Friendly Responsive Card List (Phase 2 Ergonomics)
      ------------------------------------------------------------------- */}
      <div className="md:hidden divide-y divide-[#1E3A4F]/60">
        {bookings.map((bk) => (
          <div
            key={bk.id}
            onClick={() => onOpenDetails(bk)}
            className="p-3.5 hover:bg-[#102538]/50 active:bg-[#102538] transition-colors cursor-pointer space-y-2.5"
          >
            {/* Header: Ref & Status Badges */}
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-[#38BDF8]">
                {bk.bookingReference}
              </span>
              <div className="flex items-center space-x-1.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${getStatusBadge(
                    bk.bookingStatus
                  )}`}
                >
                  {bk.bookingStatus.replace(/_/g, ' ')}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${getPaymentBadge(
                    bk.paymentStatus
                  )}`}
                >
                  {bk.paymentStatus}
                </span>
              </div>
            </div>

            {/* Customer & Space Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-semibold text-[#F1F5F9] truncate">{bk.customerName}</div>
                <div className="text-[11px] font-mono text-[#94A3B8]">{bk.customerPhone}</div>
              </div>
              <div className="text-right">
                <div className="text-[#F1F5F9] truncate">{bk.spaceSnapshot?.name}</div>
                <div className="text-[11px] font-mono text-[#38BDF8]">
                  {bk.startDate} • {bk.timeSlot}
                </div>
              </div>
            </div>

            {/* Financial Ledger & Quick Action */}
            <div className="pt-2 border-t border-[#1E3A4F]/40 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[#94A3B8]">Total: </span>
                <strong className="text-[#F1F5F9]">{bk.totalAmount.toLocaleString()} MMK</strong>
                <span className="text-[10px] text-emerald-400 ml-1.5">
                  (Paid: {bk.verifiedPaidAmount.toLocaleString()})
                </span>
              </div>

              <span className="text-[11px] text-[#38BDF8] flex items-center space-x-0.5 font-sans font-semibold">
                <span>Inspect</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {bookings.length === 0 && !isLoading && (
        <div className="p-12 text-center text-xs text-[#64748B] font-mono">
          No bookings match the current search or filters.
        </div>
      )}

      {/* Pagination Bar */}
      <div className="p-3.5 bg-[#030F1E] border-t border-[#1E3A4F] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-[#94A3B8]">
        <div>
          Showing page <strong>{page}</strong> of <strong>{totalPages || 1}</strong> ({totalCount} total bookings)
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-[#071423] border border-[#1E3A4F] hover:bg-[#102538] text-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Prev
          </button>
          <span className="px-2 text-xs font-bold text-[#38BDF8]">{page}</span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-[#071423] border border-[#1E3A4F] hover:bg-[#102538] text-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
