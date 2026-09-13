import React from 'react';
import { StudioBayTelemetry } from '../types';
import {
  Activity,
  RefreshCw,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface StudioBayOccupancyIndicatorProps {
  bays: StudioBayTelemetry[];
  overallOccupancyPercent: number;
  lastSyncTimestamp: string;
  isFetching: boolean;
  selectedBayAllocation: string;
  onRefresh: () => void;
  dateStr: string;
}

export const StudioBayOccupancyIndicator: React.FC<StudioBayOccupancyIndicatorProps> = ({
  bays,
  overallOccupancyPercent,
  lastSyncTimestamp,
  isFetching,
  selectedBayAllocation,
  onRefresh,
  dateStr,
}) => {
  return (
    <div
      id="studio-bay-occupancy-indicator"
      className="bg-[#0B1B2B] rounded-lg p-4 border border-[#1E3A4F] space-y-3.5 relative overflow-hidden"
    >
      {/* Top Telemetry Header */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 border-b border-[#1E3A4F] pb-3">
        <div className="flex items-center space-x-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-[#34D399]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-xs tracking-wider text-[#F1F5F9] uppercase">
                Studio Bay Telemetry
              </span>
              <span className="font-telemetry text-[9px] px-1.5 py-0.5 rounded bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399] font-semibold">
                LIVE
              </span>
            </div>
            <p className="font-telemetry text-[10px] text-[#94A3B8] mt-0.5">
              Target Date: <span className="text-[#38BDF8] font-medium">{dateStr}</span>
            </p>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center space-x-2 self-end xs:self-auto">
          <span className="font-telemetry text-[10px] text-[#7E8F9F] hidden sm:inline">
            Sync: {lastSyncTimestamp || 'Just now'}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            title="Fetch latest occupancy telemetry"
            className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#142C44] border border-[#1E3A4F] text-[11px] font-telemetry text-[#F1F5F9] flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 workstation-focus"
          >
            <RefreshCw
              className={`w-3 h-3 text-[#38BDF8] ${
                isFetching ? 'animate-spin' : ''
              }`}
            />
            <span className="text-[10px]">
              {isFetching ? 'Syncing...' : 'Sync'}
            </span>
          </button>
        </div>
      </div>

      {/* Aggregate Studio Occupancy Meter */}
      <div className="bg-[#030F1E] rounded p-2.5 border border-[#1E3A4F] font-telemetry">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <div className="flex items-center space-x-1.5 text-[#F1F5F9]">
            <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="font-semibold text-xs">Total Soundstage Load</span>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`font-bold ${
                overallOccupancyPercent >= 90
                  ? 'text-[#FB7185]'
                  : overallOccupancyPercent >= 60
                  ? 'text-[#FBBF24]'
                  : 'text-[#34D399]'
              }`}
            >
              {overallOccupancyPercent}% OCCUPIED
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#071423] h-2 rounded overflow-hidden flex border border-[#1E3A4F]">
          <div
            className={`h-full transition-all duration-500 ${
              overallOccupancyPercent >= 90
                ? 'bg-[#FB7185]'
                : overallOccupancyPercent >= 60
                ? 'bg-[#FBBF24]'
                : 'bg-[#34D399]'
            }`}
            style={{ width: `${overallOccupancyPercent}%` }}
          />
        </div>
      </div>

      {/* 3 Studio Bay Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {bays.map((bay) => {
          const isSelectedBay = selectedBayAllocation.toUpperCase().includes(bay.bayName.toUpperCase()) ||
            bay.bayName.toUpperCase().includes(selectedBayAllocation.toUpperCase());

          const isSoldOut = bay.status === 'sold_out' || bay.occupancyPercent >= 90;
          const isHighDemand = bay.status === 'high_occupancy';

          return (
            <div
              key={bay.bayId}
              className={`rounded p-2.5 border font-telemetry transition-all relative ${
                isSelectedBay
                  ? 'bg-[#102538] border-2 border-[#38BDF8] shadow-sm'
                  : 'bg-[#101C2C] border-[#1E3A4F] hover:border-[#38BDF8]/50'
              }`}
            >
              {/* Selected Bay Badge indicator */}
              {isSelectedBay && (
                <div className="absolute -top-2 right-2 px-1.5 py-0.5 rounded bg-[#38BDF8] text-[#071423] text-[9px] font-bold tracking-wider uppercase">
                  SELECTED
                </div>
              )}

              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="font-semibold text-xs text-[#F1F5F9] block">
                    {bay.bayName}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] block truncate max-w-[120px]">
                    {bay.stageName}
                  </span>
                </div>

                {isSoldOut ? (
                  <span className="px-1.5 py-0.5 rounded bg-[#FB7185]/15 border border-[#FB7185]/40 text-[#FB7185] text-[9px] font-bold flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    FULL
                  </span>
                ) : isHighDemand ? (
                  <span className="px-1.5 py-0.5 rounded bg-[#FBBF24]/15 border border-[#FBBF24]/40 text-[#FBBF24] text-[9px] font-bold">
                    HIGH
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-[#34D399]/15 border border-[#34D399]/40 text-[#34D399] text-[9px] font-bold">
                    OPEN
                  </span>
                )}
              </div>

              {/* Bay Occupancy Meter */}
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#94A3B8]">Load:</span>
                  <span
                    className={`font-semibold ${
                      isSoldOut
                        ? 'text-[#FB7185]'
                        : isHighDemand
                        ? 'text-[#FBBF24]'
                        : 'text-[#34D399]'
                    }`}
                  >
                    {bay.occupancyPercent}% ({bay.bookedSlots}/{bay.totalSlots})
                  </span>
                </div>

                <div className="w-full bg-[#071423] h-1.5 rounded overflow-hidden flex border border-[#1E3A4F]">
                  <div
                    className={`h-full ${
                      isSoldOut
                        ? 'bg-[#FB7185]'
                        : isHighDemand
                        ? 'bg-[#FBBF24]'
                        : 'bg-[#34D399]'
                    }`}
                    style={{ width: `${bay.occupancyPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
