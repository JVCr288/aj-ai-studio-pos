import React from 'react';
import { BookingSummaryCounts } from '../../services/serverBookingService';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

interface AdminSummaryCardsProps {
  summary: BookingSummaryCounts | null;
}

export const AdminSummaryCards: React.FC<AdminSummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Bookings */}
      <div className="p-4 rounded-xl bg-[#071423] border border-[#1E3A4F] flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase block truncate">Total Bookings</span>
          <span className="text-xl font-bold font-mono text-[#F1F5F9]">
            {summary ? summary.totalBookings : '—'}
          </span>
        </div>
      </div>

      {/* 2. Awaiting Payment Review */}
      <div className="p-4 rounded-xl bg-[#071423] border border-[#1E3A4F] flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase block truncate">Awaiting Review</span>
          <span className="text-xl font-bold font-mono text-amber-400">
            {summary ? summary.awaitingPaymentReview : '—'}
          </span>
        </div>
      </div>

      {/* 3. Confirmed & Active */}
      <div className="p-4 rounded-xl bg-[#071423] border border-[#1E3A4F] flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase block truncate">Confirmed Sessions</span>
          <span className="text-xl font-bold font-mono text-emerald-400">
            {summary ? summary.confirmedBookings : '—'}
          </span>
        </div>
      </div>

      {/* 4. Verified Revenue */}
      <div className="p-4 rounded-xl bg-[#071423] border border-[#1E3A4F] flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shrink-0">
          <DollarSign className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase block truncate">Verified Revenue</span>
          <span className="text-lg sm:text-xl font-bold font-mono text-[#38BDF8] truncate block">
            {summary ? `${summary.verifiedRevenueMMK.toLocaleString()} MMK` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
