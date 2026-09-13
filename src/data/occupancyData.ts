import { StudioBayTelemetry, RealtimeSlotTelemetry } from '../types';

export const INITIAL_BAY_TELEMETRY: StudioBayTelemetry[] = [
  {
    bayId: 'alpha-01',
    bayName: 'BAY ALPHA-01',
    stageName: 'Fine-Art Portrait Cyc',
    allocatedPackageId: 'indoor-portrait-master',
    totalSlots: 6,
    bookedSlots: 2,
    occupancyPercent: 33,
    status: 'available',
    activeSessionSlot: '12:30 PM',
    lightingRig: 'Profoto B10X + 4ft Octa',
  },
  {
    bayId: 'beta-02',
    bayName: 'BAY BETA-02',
    stageName: 'Commercial Advertising Rig',
    allocatedPackageId: 'commercial-branding',
    totalSlots: 6,
    bookedSlots: 5,
    occupancyPercent: 83,
    status: 'high_occupancy',
    activeSessionSlot: '02:00 PM',
    lightingRig: 'Broncolor Para 133FB + Grid',
  },
  {
    bayId: 'omega-03',
    bayName: 'BAY OMEGA-03',
    stageName: 'Editorial High-Fashion Soundstage',
    allocatedPackageId: 'editorial-fashion-atelier',
    totalSlots: 6,
    bookedSlots: 6,
    occupancyPercent: 100,
    status: 'sold_out',
    activeSessionSlot: 'ALL SLOTS OCCUPIED',
    lightingRig: 'Profoto Pro-11 + Dual Strip',
  },
];

export const INITIAL_SLOT_TELEMETRY: RealtimeSlotTelemetry[] = [
  {
    id: 'slot-0930',
    time: '09:30 AM',
    status: 'open',
    totalBays: 3,
    availableBays: ['BAY ALPHA-01', 'BAY OMEGA-03'],
    occupiedBays: [
      {
        bayId: 'beta-02',
        bayName: 'BAY BETA-02',
        sessionType: 'Commercial Client Setup',
      },
    ],
    highlightNotice: '2 Bays Available',
  },
  {
    id: 'slot-1100',
    time: '11:00 AM',
    status: 'open',
    totalBays: 3,
    availableBays: ['BAY ALPHA-01', 'BAY BETA-02'],
    occupiedBays: [
      {
        bayId: 'omega-03',
        bayName: 'BAY OMEGA-03',
        sessionType: 'Vogue Myanmar Prep',
      },
    ],
    highlightNotice: 'Prime Atelier Slot • 2 Bays Free',
  },
  {
    id: 'slot-1230',
    time: '12:30 PM',
    status: 'sold_out',
    totalBays: 3,
    availableBays: [],
    occupiedBays: [
      {
        bayId: 'alpha-01',
        bayName: 'BAY ALPHA-01',
        sessionType: 'Celebrity Portrait Session',
      },
      {
        bayId: 'beta-02',
        bayName: 'BAY BETA-02',
        sessionType: 'Beverage Advertising Campaign',
      },
      {
        bayId: 'omega-03',
        bayName: 'BAY OMEGA-03',
        sessionType: 'Fashion Runway Testing',
      },
    ],
    highlightNotice: 'SOLD OUT • All Soundstages Reserved',
  },
  {
    id: 'slot-1400',
    time: '02:00 PM',
    status: 'sold_out',
    totalBays: 3,
    availableBays: [],
    occupiedBays: [
      {
        bayId: 'alpha-01',
        bayName: 'BAY ALPHA-01',
        sessionType: 'Private Portrait Commission',
      },
      {
        bayId: 'beta-02',
        bayName: 'BAY BETA-02',
        sessionType: 'Jewelry Macro Campaign',
      },
      {
        bayId: 'omega-03',
        bayName: 'BAY OMEGA-03',
        sessionType: 'Editorial Cover Shoot',
      },
    ],
    highlightNotice: 'SOLD OUT • Full Soundstage Lockout',
  },
  {
    id: 'slot-1530',
    time: '03:30 PM',
    status: 'limited',
    totalBays: 3,
    availableBays: ['BAY ALPHA-01'],
    occupiedBays: [
      {
        bayId: 'beta-02',
        bayName: 'BAY BETA-02',
        sessionType: 'Corporate Branding Portfolio',
      },
      {
        bayId: 'omega-03',
        bayName: 'BAY OMEGA-03',
        sessionType: 'Lookbook Production',
      },
    ],
    highlightNotice: 'URGENT: Only 1 Bay Left (Alpha-01)',
  },
  {
    id: 'slot-1700',
    time: '05:00 PM',
    status: 'open',
    totalBays: 3,
    availableBays: ['BAY ALPHA-01', 'BAY BETA-02'],
    occupiedBays: [
      {
        bayId: 'omega-03',
        bayName: 'BAY OMEGA-03',
        sessionType: 'Film Darkroom Processing',
      },
    ],
    highlightNotice: 'Sunset Golden Hour Session',
  },
];

export function fetchBayOccupancyTelemetry(dateStr: string): Promise<{
  bays: StudioBayTelemetry[];
  slots: RealtimeSlotTelemetry[];
  overallOccupancyPercent: number;
  lastSyncTimestamp: string;
}> {
  return new Promise((resolve) => {
    // Simulate real-time server network telemetry latency
    setTimeout(() => {
      // Vary slightly based on date string hash for realistic dynamic behavior
      const dayNum = parseInt(dateStr.replace(/\D/g, ''), 10) || 18;
      const isWeekend = dayNum === 21 || dayNum === 22;

      const dynamicBays: StudioBayTelemetry[] = INITIAL_BAY_TELEMETRY.map((bay, idx) => {
        let occ = bay.occupancyPercent;
        if (isWeekend) {
          occ = 100;
        } else {
          // Dynamic variance
          occ = Math.min(100, Math.max(15, (bay.occupancyPercent + (dayNum % 3) * 10 - idx * 5)));
        }
        return {
          ...bay,
          occupancyPercent: occ,
          bookedSlots: Math.round((occ / 100) * bay.totalSlots),
          status: occ >= 90 ? 'sold_out' : occ >= 65 ? 'high_occupancy' : 'available',
        };
      });

      const totalSlotsAllBays = dynamicBays.reduce((acc, b) => acc + b.totalSlots, 0);
      const totalBookedAllBays = dynamicBays.reduce((acc, b) => acc + b.bookedSlots, 0);
      const overall = Math.round((totalBookedAllBays / totalSlotsAllBays) * 100);

      const dynamicSlots: RealtimeSlotTelemetry[] = INITIAL_SLOT_TELEMETRY.map((s, idx) => {
        if (isWeekend) {
          return {
            ...s,
            status: 'sold_out',
            availableBays: [],
            highlightNotice: 'WEEKEND ATELIER SOLD OUT',
          };
        }
        // Slot 12:30 PM & 02:00 PM are always prominently sold out for realistic highlight
        if (s.id === 'slot-1230' || s.id === 'slot-1400') {
          return s;
        }
        if (dayNum % 2 === 0 && idx === 4) {
          return {
            ...s,
            status: 'sold_out',
            availableBays: [],
            highlightNotice: 'SOLD OUT • Fully Booked',
          };
        }
        return s;
      });

      const now = new Date();
      const timeString = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      resolve({
        bays: dynamicBays,
        slots: dynamicSlots,
        overallOccupancyPercent: isWeekend ? 100 : overall,
        lastSyncTimestamp: timeString,
      });
    }, 450);
  });
}
