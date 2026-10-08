import React from 'react';
import { Search, RefreshCw, Filter } from 'lucide-react';

interface AdminFilterBarProps {
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (val: string) => void;
  spaceFilter: string;
  onSpaceFilterChange: (val: string) => void;
  dateFilter: string;
  onDateFilterChange: (val: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const AdminFilterBar: React.FC<AdminFilterBarProps> = ({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  spaceFilter,
  onSpaceFilterChange,
  dateFilter,
  onDateFilterChange,
  onRefresh,
  isLoading,
}) => {
  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-[#071423] border border-[#1E3A4F] mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search ref, customer name, phone, or space..."
          className="w-full bg-[#030F1E] border border-[#1E3A4F] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
        />
      </div>

      {/* Select Dropdowns & Actions */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Booking Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-[#030F1E] border border-[#1E3A4F] rounded-lg px-2.5 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] font-mono cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="AWAITING_PAYMENT_REVIEW">Awaiting Review</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CHECKED_IN">Checked-In</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Payment Status Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => onPaymentFilterChange(e.target.value)}
          className="bg-[#030F1E] border border-[#1E3A4F] rounded-lg px-2.5 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] font-mono cursor-pointer"
        >
          <option value="ALL">All Payments</option>
          <option value="EVIDENCE_RECEIVED">Evidence Received</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
        </select>

        {/* Space Filter */}
        <select
          value={spaceFilter}
          onChange={(e) => onSpaceFilterChange(e.target.value)}
          className="bg-[#030F1E] border border-[#1E3A4F] rounded-lg px-2.5 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8] font-mono cursor-pointer"
        >
          <option value="ALL">All Spaces</option>
          <option value="BAY ALPHA-01">Bay Alpha-01</option>
          <option value="BAY BETA-02">Bay Beta-02</option>
          <option value="BAY GAMMA-03">Bay Gamma-03</option>
        </select>

        {/* Refresh Action */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg bg-[#030F1E] hover:bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] hover:text-[#F1F5F9] transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
