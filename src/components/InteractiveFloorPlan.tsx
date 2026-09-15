import React, { useState } from 'react';
import { StudioBayTelemetry, PhotographyPackage } from '../types';
import { PHOTOGRAPHY_PACKAGES } from '../data/mockData';
import {
  Maximize2,
  Minimize2,
  Compass,
  Layers,
  Lightbulb,
  Radio,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
  MapPin,
  Eye,
  Sliders,
  Maximize,
  RefreshCw,
  AlertCircle,
  Camera,
  DoorOpen,
  Coffee,
  Shirt,
  ShieldCheck,
} from 'lucide-react';

export type FloorPlanLayer = 'blueprint' | 'lighting' | 'occupancy';

interface InteractiveFloorPlanProps {
  selectedBayAllocation: string;
  baysTelemetry: StudioBayTelemetry[];
  onSelectBayAllocation?: (bayName: string) => void;
  dateStr: string;
  timeSlot?: string;
  className?: string;
}

export interface StudioZoneDetails {
  id: string;
  code: string;
  name: string;
  categoryDescription: string;
  type: 'stage' | 'amenity' | 'tech';
  dimensions: string;
  areaSqFt: number;
  ceilingHeight: string;
  acousticRating: string;
  features: string[];
  lightingRig: string;
  allocatedPackageId?: string;
  powerSpecs: string;
  hvacZone: string;
}

export const STUDIO_ZONES: Record<string, StudioZoneDetails> = {
  'BAY ALPHA-01': {
    id: 'alpha-01',
    code: 'BAY ALPHA-01',
    name: 'Fine-Art Portrait Cyclorama',
    categoryDescription: 'High-Key Portrait & Infinity Cyclorama',
    type: 'stage',
    dimensions: '35 ft × 34 ft',
    areaSqFt: 1190,
    ceilingHeight: '16.5 ft (Clearance)',
    acousticRating: 'STC 58 Acoustic Damped',
    features: [
      'Seamless 2-Wall Infinity White Cyclorama',
      'Dual Ceiling Pantograph Tracks (No Floor C-Stands)',
      'Direct Tethered 32" 4K Calibration Station',
      'Dedicated Motorized Roller Backdrop System',
    ],
    lightingRig: 'Profoto B10X Plus (2x 500Ws) + Profoto 4ft Octa Softbox',
    allocatedPackageId: 'indoor-portrait-master',
    powerSpecs: '230V 32A Clean Dedicated Audio/Visual Phase',
    hvacZone: 'Zone A - Whisper Quiet (< 22 dBA)',
  },
  'BAY BETA-02': {
    id: 'beta-02',
    code: 'BAY BETA-02',
    name: 'Commercial & Advertising Stage',
    categoryDescription: 'Commercial Advertising & Product Rigging Stage',
    type: 'stage',
    dimensions: '30 ft × 32 ft',
    areaSqFt: 960,
    ceilingHeight: '16.0 ft (Clearance)',
    acousticRating: 'STC 55 Acoustic Damped',
    features: [
      'Heavy-Duty Product Shooting Table & Scrim Flags',
      'Overhead Pantograph Grid with Motorized Hoist',
      'Matte Industrial Grey Non-Reflective Epoxy Floor',
      'Food & Beverage Prep Counter with Ice Machine',
    ],
    lightingRig: 'Broncolor Para 133FB Reflector + Siros 800S Monolights',
    allocatedPackageId: 'commercial-branding',
    powerSpecs: '230V 63A 3-Phase Camlock Support',
    hvacZone: 'Zone B - Independent Climate Control',
  },
  'BAY OMEGA-03': {
    id: 'omega-03',
    code: 'BAY OMEGA-03',
    name: 'Editorial High-Fashion Atelier',
    categoryDescription: 'Runway High-Fashion & Editorial Drapes',
    type: 'stage',
    dimensions: '40 ft × 35 ft',
    areaSqFt: 1400,
    ceilingHeight: '17.0 ft (Clearance)',
    acousticRating: 'STC 60 Studio Grade',
    features: [
      '24 ft Polished Ebony Fashion Runway Line',
      'Full 360° Motorized Blackout Velvet Acoustic Drapes',
      'Dual High-Velocity Wind Fans (DMX Controlled)',
      'Direct Access to Wardrobe & Vanity Pods',
    ],
    lightingRig: 'Profoto Pro-11 2400Ws Generator + Dual 1x6ft Strip Softboxes',
    allocatedPackageId: 'editorial-fashion-atelier',
    powerSpecs: '230V 63A 3-Phase Industrial',
    hvacZone: 'Zone C - Rapid Cooling Air-Supply',
  },
  'LOUNGE': {
    id: 'lounge',
    code: 'LOUNGE',
    name: 'Client Hospitality & Briefing Lounge',
    categoryDescription: 'Guest Reception & Client Hospitality Suite',
    type: 'amenity',
    dimensions: '26 ft × 22 ft',
    areaSqFt: 572,
    ceilingHeight: '12.0 ft',
    acousticRating: 'Sound Isolated',
    features: [
      'Automated Turnstile QR Access Gate',
      'Espresso Bar & Complimentary Cold Refreshments',
      'High-Speed Wi-Fi 6 & iPad Production Review Deck',
      'Comfortable Italian Leather Seating Suite',
    ],
    lightingRig: 'Warm Ambient Architectural Lighting (2700K)',
    powerSpecs: '230V 13A Standard Domestic',
    hvacZone: 'Zone D - Comfort AC 22°C',
  },
  'WARDROBE': {
    id: 'wardrobe',
    code: 'WARDROBE',
    name: 'Styling, Makeup & Vanity Suite',
    categoryDescription: 'Hair, Styling & Daylight Vanity Suite',
    type: 'amenity',
    dimensions: '22 ft × 20 ft',
    areaSqFt: 440,
    ceilingHeight: '12.0 ft',
    acousticRating: 'Sound Isolated',
    features: [
      '4 Hollywood-Style Daylight 5500K CRI 98 Vanity Mirrors',
      '2 High-Pressure Commercial Garment Steamers',
      'Private Fitting Cubicles with Full-Length Mirrors',
      'Rolling Heavy-Duty Wardrobe Racks',
    ],
    lightingRig: 'High-CRI 98+ Daylight 5500K True-Color Vanity Bulbs',
    powerSpecs: '230V 32A Dual Steamer Safe Circuit',
    hvacZone: 'Zone E - Ventilated Make-up Studio',
  },
  'VAULT': {
    id: 'vault',
    code: 'VAULT',
    name: 'Equipment Vault & Tether Command',
    categoryDescription: 'Hardware Vault & Live Tether Station',
    type: 'tech',
    dimensions: '18 ft × 16 ft',
    areaSqFt: 288,
    ceilingHeight: '12.0 ft',
    acousticRating: 'Acoustic Isolated',
    features: [
      'Precision Lens Carts (Sony G-Master & Zeiss Otus)',
      'Biometric Secure Cage for High-End Cine Rigs',
      'Dual EIZO ColorEdge CG319X 4K Hardware-Calibrated Monitors',
      '10GbE High-Speed Fiber Ingest Server Station',
    ],
    lightingRig: 'Neutral Neutral 5000K Technical Inspection Flood',
    powerSpecs: 'Online Double-Conversion Battery UPS Protected',
    hvacZone: 'Zone F - Climate & Humidity Controlled 45% RH',
  },
};

export const InteractiveFloorPlan: React.FC<InteractiveFloorPlanProps> = ({
  selectedBayAllocation,
  baysTelemetry,
  onSelectBayAllocation,
  dateStr,
  timeSlot,
  className = '',
}) => {
  const [activeLayer, setActiveLayer] = useState<FloorPlanLayer>('blueprint');
  const [inspectedZoneId, setInspectedZoneId] = useState<string>(
    selectedBayAllocation || 'BAY ALPHA-01'
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  // Sync inspection with external selectedBayAllocation change if inspected zone was equal to previous
  const activeZone = STUDIO_ZONES[inspectedZoneId] || STUDIO_ZONES['BAY ALPHA-01'];

  // Helper to get telemetry for a bay
  const getBayTelemetry = (bayName: string): StudioBayTelemetry | undefined => {
    return baysTelemetry.find(
      (b) => b.bayName.toLowerCase() === bayName.toLowerCase()
    );
  };

  const handleZoneClick = (zoneCode: string) => {
    setInspectedZoneId(zoneCode);
    if (
      onSelectBayAllocation &&
      (zoneCode === 'BAY ALPHA-01' ||
        zoneCode === 'BAY BETA-02' ||
        zoneCode === 'BAY OMEGA-03')
    ) {
      onSelectBayAllocation(zoneCode);
    }
  };

  const handleAllocateInspectedZone = () => {
    if (
      onSelectBayAllocation &&
      (inspectedZoneId === 'BAY ALPHA-01' ||
        inspectedZoneId === 'BAY BETA-02' ||
        inspectedZoneId === 'BAY OMEGA-03')
    ) {
      onSelectBayAllocation(inspectedZoneId);
    }
  };

  // Associated package
  const matchedPackage = PHOTOGRAPHY_PACKAGES.find(
    (p) => p.suiteAllocation === inspectedZoneId
  );

  return (
    <div
      id="interactive-floor-plan-card"
      className={`glass-level-2 rounded-xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'shadow-2xl ring-1 ring-[#38BDF8]/40' : ''
      } ${className}`}
    >
      {/* Blueprint Header */}
      <div className="p-4 border-b border-[rgba(90,150,180,0.14)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[rgba(10,24,38,0.7)]">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg glass-recessed flex items-center justify-center text-[#38BDF8]">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-ui font-semibold text-sm text-[#F1F5F9] tracking-normal">
                Interactive Studio Floor Plan
              </h3>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] font-medium">
                Schematic • FL-02
              </span>
            </div>
            <p className="font-ui text-xs text-[#94A3B8] mt-0.5">
              Interactive Studio Architectural Layout &amp; Lighting Stages • Yangon Flagship
            </p>
          </div>
        </div>

        {/* Layer Switcher & Expand Toggle */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto flex-wrap font-ui">
          {/* Layer toggles */}
          <div className="glass-recessed p-0.5 rounded flex items-center space-x-0.5 text-xs font-ui">
            <button
              type="button"
              onClick={() => setActiveLayer('blueprint')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1 cursor-pointer ${
                activeLayer === 'blueprint'
                  ? 'bg-[#38BDF8] text-[#071423] font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
              title="Architectural layout, stage dimensions, access points"
            >
              <Layers className="w-3 h-3" />
              <span>Blueprint</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('lighting')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1 cursor-pointer ${
                activeLayer === 'lighting'
                  ? 'bg-[#38BDF8] text-[#071423] font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
              title="Lighting rigs, softboxes, boom tracks & model marks"
            >
              <Lightbulb className="w-3 h-3" />
              <span>Lighting Rig</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('occupancy')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1 cursor-pointer ${
                activeLayer === 'occupancy'
                  ? 'bg-[#38BDF8] text-[#071423] font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
              title="Real-time occupancy status on target date"
            >
              <Radio className="w-3 h-3" />
              <span>Live Bays</span>
            </button>
          </div>

          {/* Expand / Minimize Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded bg-[#102538] border border-[rgba(90,150,180,0.18)] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#38BDF8] transition-colors cursor-pointer workstation-focus"
            title={isExpanded ? 'Collapse Floor Plan' : 'Expand Floor Plan View'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-[#38BDF8]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-[#94A3B8]" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Jump Bay Chips */}
      <div className="px-4 py-2 bg-[rgba(4,11,18,0.85)] border-b border-[rgba(90,150,180,0.12)] flex items-center justify-between gap-2 overflow-x-auto text-xs font-ui scrollbar-none">
        <div className="flex items-center space-x-1.5">
          <span className="text-[#7E8F9F] text-xs font-medium shrink-0">
            Jump to bay:
          </span>
          {(['BAY ALPHA-01', 'BAY BETA-02', 'BAY OMEGA-03', 'LOUNGE', 'WARDROBE', 'VAULT'] as const).map(
            (code) => {
              const isSelected = inspectedZoneId === code;
              const isCurrentAllocation = selectedBayAllocation === code;
              const telemetry = getBayTelemetry(code);

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleZoneClick(code)}
                  className={`px-2 py-0.5 rounded border transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-[#102538] text-[#38BDF8] border-[#38BDF8] font-semibold shadow-sm'
                      : 'glass-recessed text-[#94A3B8] border-[rgba(90,150,180,0.12)] hover:border-[#38BDF8] hover:text-[#F1F5F9]'
                  }`}
                >
                  {isCurrentAllocation && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                  )}
                  <span>{code.replace('BAY ', '')}</span>
                  {telemetry && (
                    <span
                      className={`text-[9px] px-1 rounded tabular-nums ${
                        telemetry.status === 'available'
                          ? 'bg-[#34D399]/20 text-[#34D399]'
                          : telemetry.status === 'high_occupancy'
                          ? 'bg-[#FBBF24]/20 text-[#FBBF24]'
                          : 'bg-[#FB7185]/20 text-[#FB7185]'
                      }`}
                    >
                      {telemetry.occupancyPercent}%
                    </span>
                  )}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Main Floor Plan Interactive Canvas */}
      <div className="relative glass-recessed p-3 sm:p-5 overflow-hidden select-none">
        {/* Architectural Grid Background */}
        <div
          className="w-full relative rounded-lg border border-[rgba(90,150,180,0.12)] bg-[#050C14] overflow-hidden shadow-inner"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
              linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px, 48px 48px, 48px 48px',
          }}
        >
          {/* Compass Rose Badge */}
          <div className="absolute top-3 right-3 z-10 bg-[#09090b]/85 backdrop-blur-md px-2 py-1 rounded border border-[#27272a] font-ui text-xs text-zinc-400 flex items-center space-x-1.5 shadow-sm">
            <span className="text-[#38bdf8] font-semibold">N ↑</span>
            <span>North Entry</span>
          </div>

          {/* Current Selection Floating Tag */}
          <div className="absolute top-3 left-3 z-10 bg-[#09090b]/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-[#27272a] font-ui text-xs text-zinc-300 flex items-center space-x-2">
            <span className="text-zinc-400">Active Suite:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {selectedBayAllocation}
            </span>
          </div>

          {/* Interactive SVG Studio Layout */}
          <svg
            viewBox="0 0 900 560"
            className="w-full h-auto block select-none cursor-crosshair"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Hatch pattern for occupied zones */}
              <pattern
                id="occupied-hatch"
                width="10"
                height="10"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="10"
                  stroke="rgba(244, 63, 94, 0.25)"
                  strokeWidth="2"
                />
              </pattern>

              {/* Grid pattern for lighting grid */}
              <pattern
                id="pantograph-grid"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 16 0 L 0 0 0 16"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.18)"
                  strokeWidth="1"
                />
              </pattern>

              {/* Glow filter for active/inspected rooms */}
              <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="emerald-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* EXTERIOR WALLS (Studio Boundary) */}
            <rect
              x="20"
              y="20"
              width="860"
              height="520"
              rx="12"
              fill="#0d1017"
              stroke="#2e384d"
              strokeWidth="4"
            />
            {/* Inner Wall double line */}
            <rect
              x="26"
              y="26"
              width="848"
              height="508"
              rx="8"
              fill="none"
              stroke="#1b2230"
              strokeWidth="1.5"
            />

            {/* ==================================================================== */}
            {/* ZONE 1: BAY ALPHA-01 (Top-Left Stage: Portrait Cyc)                   */}
            {/* Coordinates: x=30, y=30, w=400, h=250                               */}
            {/* ==================================================================== */}
            {(() => {
              const code = 'BAY ALPHA-01';
              const isSelected = inspectedZoneId === code;
              const isAllocated = selectedBayAllocation === code;
              const isHovered = hoveredZoneId === code;
              const telemetry = getBayTelemetry(code);

              let fillBg = '#121622';
              let strokeColor = '#2d3748';
              let strokeW = 2;

              if (isAllocated) {
                fillBg = isSelected ? '#152438' : '#10202e';
                strokeColor = '#10b981'; // Emerald for allocated
                strokeW = 3;
              } else if (isSelected) {
                fillBg = '#162236';
                strokeColor = '#38bdf8'; // Sky cyan for inspected
                strokeW = 3;
              } else if (isHovered) {
                fillBg = '#141c2c';
                strokeColor = '#60a5fa';
                strokeW = 2.5;
              }

              return (
                <g
                  id="svg-bay-alpha-01"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleZoneClick(code)}
                  onMouseEnter={() => setHoveredZoneId(code)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                >
                  {/* Room Container */}
                  <rect
                    x="30"
                    y="30"
                    width="400"
                    height="245"
                    rx="6"
                    fill={fillBg}
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    filter={isAllocated ? 'url(#emerald-glow)' : isSelected ? 'url(#cyan-glow)' : undefined}
                  />

                  {/* Infinity Cyc Curved Wall Representation (Top & Left corner) */}
                  <path
                    d="M 45 130 C 45 65, 65 45, 150 45 L 230 45"
                    fill="none"
                    stroke={isAllocated ? '#34d399' : '#38bdf8'}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* Cyc Curve shadow hatch lines */}
                  <path
                    d="M 48 100 Q 60 60 100 48"
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.3)"
                    strokeWidth="1.5"
                    strokeDasharray="2 3"
                  />
                  <text
                    x="56"
                    y="75"
                    fill="#38bdf8"
                    fontSize="9"
                    fontFamily="monospace"
                    opacity="0.8"
                  >
                    INFINITY CYCLORAMA WALL (WHITE)
                  </text>

                  {/* Ceiling Pantograph Lighting Tracks */}
                  {activeLayer === 'lighting' && (
                    <g opacity="0.85">
                      {/* Track Lines */}
                      <line x1="80" y1="90" x2="380" y2="90" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />
                      <line x1="80" y1="160" x2="380" y2="160" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />

                      {/* Key Light Fixture (Profoto B10X + Octa) */}
                      <circle cx="160" cy="130" r="14" fill="#f59e0b" fillOpacity="0.25" stroke="#f59e0b" strokeWidth="2" />
                      {/* Light cone representation */}
                      <path
                        d="M 160 130 L 210 160 L 195 190 Z"
                        fill="rgba(245, 158, 11, 0.12)"
                        stroke="rgba(245, 158, 11, 0.4)"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      <text x="145" y="122" fill="#fbbf24" fontSize="8" fontFamily="monospace">
                        KEY 45°
                      </text>

                      {/* Fill Light Fixture */}
                      <circle cx="280" cy="120" r="11" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="268" y="112" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                        FILL OCTA
                      </text>
                    </g>
                  )}

                  {/* Model Mark X (Center stage) */}
                  <g transform="translate(195, 170)">
                    <line x1="-8" y1="-8" x2="8" y2="8" stroke={isAllocated ? '#34d399' : '#38bdf8'} strokeWidth="2" />
                    <line x1="8" y1="-8" x2="-8" y2="8" stroke={isAllocated ? '#34d399' : '#38bdf8'} strokeWidth="2" />
                    <circle cx="0" cy="0" r="14" fill="none" stroke={isAllocated ? '#34d399' : '#38bdf8'} strokeWidth="1" strokeDasharray="2 2" />
                    <text x="18" y="4" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                      MODEL MARK (SWEET SPOT)
                    </text>
                  </g>

                  {/* Camera Tripod Position */}
                  <g transform="translate(195, 230)">
                    <polygon points="0,-6 -6,6 6,6" fill="#6366f1" />
                    <text x="12" y="2" fill="#818cf8" fontSize="8" fontFamily="monospace">
                      CAM α1 85MM
                    </text>
                  </g>

                  {/* Tether Workstation Cart (Bottom Left of room) */}
                  <rect x="45" y="195" width="40" height="26" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                  <text x="50" y="211" fill="#94a3b8" fontSize="7" fontFamily="monospace">
                    TETHER
                  </text>

                  {/* Acoustic Door swing (Bottom-Right of room) */}
                  <path d="M 390 275 A 35 35 0 0 0 425 240" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="390" y1="275" x2="425" y2="275" stroke="#94a3b8" strokeWidth="2" />

                  {/* Room Labels & Information */}
                  <g transform="translate(45, 100)">
                    <rect x="-6" y="-14" width="130" height="20" rx="4" fill="#09090b" fillOpacity="0.8" stroke="#334155" strokeWidth="1" />
                    <text x="0" y="0" fill="#ffffff" fontWeight="bold" fontSize="12" fontFamily="'Space Grotesk', sans-serif">
                      BAY ALPHA-01
                    </text>
                    <text x="0" y="15" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                      Fine-Art Portrait Cyc • 1,190 sq ft
                    </text>
                  </g>

                  {/* Active Allocation / Occupancy Status Badge */}
                  {isAllocated && (
                    <g transform="translate(270, 42)">
                      <rect x="0" y="0" width="150" height="20" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
                      <circle cx="10" cy="10" r="3" fill="#34d399" />
                      <text x="20" y="14" fill="#6ee7b7" fontWeight="bold" fontSize="9" fontFamily="monospace">
                        ★ YOUR RESERVED BAY
                      </text>
                    </g>
                  )}

                  {/* Occupancy Heatmap overlay */}
                  {activeLayer === 'occupancy' && telemetry && (
                    <g transform="translate(300, 70)">
                      <rect
                        x="0"
                        y="0"
                        width="120"
                        height="24"
                        rx="4"
                        fill="#09090b"
                        fillOpacity="0.9"
                        stroke={telemetry.status === 'available' ? '#10b981' : '#f59e0b'}
                        strokeWidth="1"
                      />
                      <text x="8" y="16" fill="#e2e8f0" fontSize="9" fontFamily="monospace">
                        OCCUPANCY: <tspan fontWeight="bold" fill="#38bdf8">{telemetry.occupancyPercent}%</tspan>
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

            {/* ==================================================================== */}
            {/* ZONE 2: BAY BETA-02 (Top-Right Stage: Commercial Rig)                */}
            {/* Coordinates: x=440, y=30, w=430, h=245                              */}
            {/* ==================================================================== */}
            {(() => {
              const code = 'BAY BETA-02';
              const isSelected = inspectedZoneId === code;
              const isAllocated = selectedBayAllocation === code;
              const isHovered = hoveredZoneId === code;
              const telemetry = getBayTelemetry(code);

              let fillBg = '#121622';
              let strokeColor = '#2d3748';
              let strokeW = 2;

              if (isAllocated) {
                fillBg = '#10202e';
                strokeColor = '#10b981';
                strokeW = 3;
              } else if (isSelected) {
                fillBg = '#162236';
                strokeColor = '#38bdf8';
                strokeW = 3;
              } else if (isHovered) {
                fillBg = '#141c2c';
                strokeColor = '#60a5fa';
                strokeW = 2.5;
              }

              return (
                <g
                  id="svg-bay-beta-02"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleZoneClick(code)}
                  onMouseEnter={() => setHoveredZoneId(code)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                >
                  <rect
                    x="440"
                    y="30"
                    width="430"
                    height="245"
                    rx="6"
                    fill={fillBg}
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    filter={isAllocated ? 'url(#emerald-glow)' : isSelected ? 'url(#cyan-glow)' : undefined}
                  />

                  {/* Ceiling Pantograph Grid Overlay (Overhead hoist) */}
                  <rect
                    x="480"
                    y="50"
                    width="260"
                    height="120"
                    fill="url(#pantograph-grid)"
                    stroke="rgba(56, 189, 248, 0.3)"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  <text x="490" y="65" fill="#64748b" fontSize="8" fontFamily="monospace">
                    OVERHEAD MOTORIZED RIGGING HOIST
                  </text>

                  {/* Product Table Station (Center) */}
                  <rect x="560" y="100" width="100" height="50" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                  <text x="575" y="128" fill="#e2e8f0" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    PRODUCT TABLE
                  </text>
                  <circle cx="610" cy="125" r="18" fill="none" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Lighting Fixtures for Commercial */}
                  {activeLayer === 'lighting' && (
                    <g>
                      {/* Overhead Para Reflector */}
                      <circle cx="610" cy="85" r="16" fill="#f59e0b" fillOpacity="0.3" stroke="#f59e0b" strokeWidth="2" />
                      <text x="585" y="80" fill="#fbbf24" fontSize="8" fontFamily="monospace">
                        PARA 133FB
                      </text>

                      {/* Scrim flag */}
                      <line x1="535" y1="100" x2="535" y2="150" stroke="#ef4444" strokeWidth="3" />
                      <text x="500" y="128" fill="#f87171" fontSize="7" fontFamily="monospace">
                        DIFFUSER
                      </text>

                      {/* Rim Light */}
                      <circle cx="680" cy="115" r="9" fill="#38bdf8" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="670" y="102" fill="#38bdf8" fontSize="7" fontFamily="monospace">
                        RIM
                      </text>
                    </g>
                  )}

                  {/* Prop Cart & Styling Station */}
                  <rect x="760" y="60" width="85" height="40" rx="3" fill="#1a202c" stroke="#334155" strokeWidth="1" />
                  <text x="768" y="84" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    PROPS &amp; STYLING
                  </text>

                  {/* Prep counter */}
                  <rect x="760" y="115" width="85" height="35" rx="3" fill="#1a202c" stroke="#334155" strokeWidth="1" />
                  <text x="772" y="136" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    ICE / BEV PREP
                  </text>

                  {/* Room Labels */}
                  <g transform="translate(460, 200)">
                    <rect x="-6" y="-14" width="130" height="20" rx="4" fill="#09090b" fillOpacity="0.8" stroke="#334155" strokeWidth="1" />
                    <text x="0" y="0" fill="#ffffff" fontWeight="bold" fontSize="12" fontFamily="'Space Grotesk', sans-serif">
                      BAY BETA-02
                    </text>
                    <text x="0" y="15" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                      Commercial &amp; Branding • 960 sq ft
                    </text>
                  </g>

                  {/* Allocation Badge if active */}
                  {isAllocated && (
                    <g transform="translate(710, 42)">
                      <rect x="0" y="0" width="150" height="20" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
                      <circle cx="10" cy="10" r="3" fill="#34d399" />
                      <text x="20" y="14" fill="#6ee7b7" fontWeight="bold" fontSize="9" fontFamily="monospace">
                        ★ YOUR RESERVED BAY
                      </text>
                    </g>
                  )}

                  {/* Occupancy Heatmap overlay */}
                  {activeLayer === 'occupancy' && telemetry && (
                    <g transform="translate(740, 190)">
                      <rect
                        x="0"
                        y="0"
                        width="120"
                        height="24"
                        rx="4"
                        fill="#09090b"
                        fillOpacity="0.9"
                        stroke={telemetry.status === 'high_occupancy' ? '#f59e0b' : '#10b981'}
                        strokeWidth="1"
                      />
                      <text x="8" y="16" fill="#e2e8f0" fontSize="9" fontFamily="monospace">
                        OCCUPANCY: <tspan fontWeight="bold" fill="#f59e0b">{telemetry.occupancyPercent}%</tspan>
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

            {/* ==================================================================== */}
            {/* CENTRAL CORRIDOR & SOUND-LOCK PASSAGEWAY                             */}
            {/* Coordinates: x=30, y=275, w=840, h=30                               */}
            {/* ==================================================================== */}
            <g id="svg-central-corridor">
              <rect x="30" y="278" width="840" height="24" fill="#0a0c12" stroke="#1e293b" strokeWidth="1" />
              <line x1="30" y1="290" x2="870" y2="290" stroke="#334155" strokeWidth="1" strokeDasharray="8 6" />
              <text x="400" y="294" fill="#475569" fontSize="8" fontFamily="monospace" letterSpacing="2">
                ACOUSTIC AIR-LOCK ACCESS CORRIDOR (STC 60)
              </text>
            </g>

            {/* ==================================================================== */}
            {/* ZONE 3: LOUNGE & BRIEFING (Bottom-Left: Hospitality)                  */}
            {/* Coordinates: x=30, y=305, w=230, h=225                              */}
            {/* ==================================================================== */}
            {(() => {
              const code = 'LOUNGE';
              const isSelected = inspectedZoneId === code;
              const isHovered = hoveredZoneId === code;

              return (
                <g
                  id="svg-lounge"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleZoneClick(code)}
                  onMouseEnter={() => setHoveredZoneId(code)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                >
                  <rect
                    x="30"
                    y="305"
                    width="230"
                    height="225"
                    rx="6"
                    fill={isSelected ? '#181d2a' : isHovered ? '#151924' : '#11141c'}
                    stroke={isSelected ? '#38bdf8' : '#272f3e'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />

                  {/* Main Entry Turnstile Door (Bottom-Left) */}
                  <g transform="translate(45, 510)">
                    <rect x="0" y="0" width="50" height="15" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                    <text x="5" y="11" fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                      QR TURNSTILE
                    </text>
                    <path d="M 50 15 A 25 25 0 0 1 75 -10" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" />
                  </g>

                  {/* Espresso Bar counter */}
                  <rect x="45" y="325" width="70" height="35" rx="4" fill="#1e2433" stroke="#334155" strokeWidth="1" />
                  <text x="52" y="346" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    ☕ ESPRESSO BAR
                  </text>

                  {/* Client Meeting Sofa Layout */}
                  <rect x="135" y="330" width="105" height="50" rx="6" fill="#1e2433" stroke="#334155" strokeWidth="1" />
                  <rect x="155" y="342" width="65" height="25" rx="3" fill="#2d3748" />
                  <text x="145" y="358" fill="#cbd5e1" fontSize="8" fontFamily="monospace">
                    BRIEFING LOUNGE
                  </text>

                  {/* Room Label */}
                  <g transform="translate(45, 435)">
                    <text x="0" y="0" fill="#ffffff" fontWeight="bold" fontSize="11" fontFamily="'Space Grotesk', sans-serif">
                      CLIENT LOUNGE
                    </text>
                    <text x="0" y="14" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                      Hospitality &amp; Briefing • 572 sq ft
                    </text>
                    <text x="0" y="28" fill="#38bdf8" fontSize="7" fontFamily="monospace">
                      Guest Reception &amp; Turnstile Gate
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* ==================================================================== */}
            {/* ZONE 4: WARDROBE & STYLING (Bottom-Center-Left: Vanity Suite)         */}
            {/* Coordinates: x=265, y=305, w=195, h=225                             */}
            {/* ==================================================================== */}
            {(() => {
              const code = 'WARDROBE';
              const isSelected = inspectedZoneId === code;
              const isHovered = hoveredZoneId === code;

              return (
                <g
                  id="svg-wardrobe"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleZoneClick(code)}
                  onMouseEnter={() => setHoveredZoneId(code)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                >
                  <rect
                    x="265"
                    y="305"
                    width="195"
                    height="225"
                    rx="6"
                    fill={isSelected ? '#181d2a' : isHovered ? '#151924' : '#11141c'}
                    stroke={isSelected ? '#38bdf8' : '#272f3e'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />

                  {/* 4 Vanity Mirrors with Daylight bulbs */}
                  <g transform="translate(280, 320)">
                    {[0, 38, 76, 114].map((offset, i) => (
                      <g key={i} transform={`translate(${offset}, 0)`}>
                        <rect x="0" y="0" width="30" height="24" rx="2" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
                        <circle cx="5" cy="5" r="2" fill="#fbbf24" />
                        <circle cx="25" cy="5" r="2" fill="#fbbf24" />
                        <circle cx="15" cy="20" r="1.5" fill="#fbbf24" />
                      </g>
                    ))}
                    <text x="25" y="36" fill="#f59e0b" fontSize="7" fontFamily="monospace">
                      4× 5500K CRI 98 VANITY STATIONS
                    </text>
                  </g>

                  {/* Fitting Pods / Private Cubicles */}
                  <rect x="280" y="375" width="65" height="50" rx="3" fill="#1e2433" stroke="#334155" strokeWidth="1" />
                  <text x="288" y="403" fill="#cbd5e1" fontSize="8" fontFamily="monospace">
                    FITTING POD 1
                  </text>

                  <rect x="355" y="375" width="65" height="50" rx="3" fill="#1e2433" stroke="#334155" strokeWidth="1" />
                  <text x="363" y="403" fill="#cbd5e1" fontSize="8" fontFamily="monospace">
                    FITTING POD 2
                  </text>

                  {/* Garment Steamers */}
                  <rect x="280" y="435" width="40" height="20" rx="2" fill="#262626" stroke="#404040" />
                  <text x="284" y="448" fill="#a3a3a3" fontSize="7" fontFamily="monospace">
                    STEAMER
                  </text>

                  {/* Label */}
                  <g transform="translate(280, 485)">
                    <text x="0" y="0" fill="#ffffff" fontWeight="bold" fontSize="11" fontFamily="'Space Grotesk', sans-serif">
                      VANITY &amp; WARDROBE
                    </text>
                    <text x="0" y="14" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                      Styling Suite • 440 sq ft
                    </text>
                    <text x="0" y="28" fill="#38bdf8" fontSize="7" fontFamily="monospace">
                      Hair &amp; Makeup Stations
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* ==================================================================== */}
            {/* ZONE 5: EQUIPMENT VAULT & TETHER LAB (Bottom-Center-Right)           */}
            {/* Coordinates: x=465, y=305, w=160, h=225                             */}
            {/* ==================================================================== */}
            {(() => {
              const code = 'VAULT';
              const isSelected = inspectedZoneId === code;
              const isHovered = hoveredZoneId === code;

              return (
                <g
                  id="svg-vault"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleZoneClick(code)}
                  onMouseEnter={() => setHoveredZoneId(code)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                >
                  <rect
                    x="465"
                    y="305"
                    width="160"
                    height="225"
                    rx="6"
                    fill={isSelected ? '#181d2a' : isHovered ? '#151924' : '#11141c'}
                    stroke={isSelected ? '#38bdf8' : '#272f3e'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />

                  {/* Master Lens Storage Carts */}
                  <g transform="translate(480, 325)">
                    <rect x="0" y="0" width="130" height="35" rx="3" fill="#1e2433" stroke="#475569" strokeWidth="1" />
                    <circle cx="20" cy="18" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.5" />
                    <circle cx="45" cy="18" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.5" />
                    <circle cx="70" cy="18" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.5" />
                    <circle cx="95" cy="18" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.5" />
                    <text x="18" y="32" fill="#38bdf8" fontSize="6" fontFamily="monospace">
                      GM 85 • 50 • 24-70 • 70-200
                    </text>
                  </g>

                  {/* Dual EIZO Color Grading Desk */}
                  <rect x="480" y="375" width="130" height="40" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                  <rect x="495" y="383" width="45" height="15" rx="2" fill="#0284c7" />
                  <rect x="550" y="383" width="45" height="15" rx="2" fill="#0284c7" />
                  <text x="492" y="410" fill="#94a3b8" fontSize="7" fontFamily="monospace">
                    EIZO COLOR CALIBRATION DECK
                  </text>

                  {/* Biometric Safe Icon */}
                  <circle cx="545" cy="445" r="14" fill="#09090b" stroke="#38bdf8" strokeWidth="1.2" />
                  <path d="M 540 445 Q 545 438 550 445 T 545 452" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                  <text x="510" y="470" fill="#94a3b8" fontSize="7" fontFamily="monospace">
                    BIOMETRIC VAULT
                  </text>

                  {/* Label */}
                  <g transform="translate(480, 492)">
                    <text x="0" y="0" fill="#ffffff" fontWeight="bold" fontSize="10" fontFamily="'Space Grotesk', sans-serif">
                      GEAR VAULT &amp; LAB
                    </text>
                    <text x="0" y="12" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                      Optical Tech • 288 sq ft
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* ==================================================================== */}
            {/* ZONE 6: BAY OMEGA-03 (Bottom-Right Stage: Fashion Atelier)            */}
            {/* Coordinates: x=630, y=305, w=240, h=225                             */}
            {/* ==================================================================== */}
            {(() => {
              const code = 'BAY OMEGA-03';
              const isSelected = inspectedZoneId === code;
              const isAllocated = selectedBayAllocation === code;
              const isHovered = hoveredZoneId === code;
              const telemetry = getBayTelemetry(code);

              let fillBg = '#121622';
              let strokeColor = '#2d3748';
              let strokeW = 2;

              if (isAllocated) {
                fillBg = '#10202e';
                strokeColor = '#10b981';
                strokeW = 3;
              } else if (isSelected) {
                fillBg = '#162236';
                strokeColor = '#38bdf8';
                strokeW = 3;
              } else if (isHovered) {
                fillBg = '#141c2c';
                strokeColor = '#60a5fa';
                strokeW = 2.5;
              }

              return (
                <g
                  id="svg-bay-omega-03"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleZoneClick(code)}
                  onMouseEnter={() => setHoveredZoneId(code)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                >
                  <rect
                    x="630"
                    y="305"
                    width="240"
                    height="225"
                    rx="6"
                    fill={fillBg}
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    filter={isAllocated ? 'url(#emerald-glow)' : isSelected ? 'url(#cyan-glow)' : undefined}
                  />

                  {/* 24ft Fashion Runway Line (Ebony wood finish visual) */}
                  <rect x="670" y="325" width="130" height="50" rx="3" fill="#0f172a" stroke="#6366f1" strokeWidth="1.5" />
                  <line x1="675" y1="350" x2="795" y2="350" stroke="#818cf8" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="690" y="345" fill="#a5b4fc" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    24 FT RUNWAY STAGE
                  </text>
                  <text x="705" y="362" fill="#6366f1" fontSize="7" fontFamily="monospace">
                    (POLISHED EBONY)
                  </text>

                  {/* Blackout Velvet Acoustic Drapes perimeter */}
                  <path
                    d="M 645 320 L 645 510 L 855 510"
                    fill="none"
                    stroke="#4338ca"
                    strokeWidth="3"
                    strokeDasharray="5 3"
                  />
                  <text x="652" y="495" fill="#818cf8" fontSize="7" fontFamily="monospace">
                    360° BLACKOUT DRAPES
                  </text>

                  {/* Lighting Fixtures for Fashion Runway */}
                  {activeLayer === 'lighting' && (
                    <g>
                      {/* Dual 5ft Octas */}
                      <circle cx="650" cy="350" r="14" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
                      <circle cx="820" cy="350" r="14" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
                      <text x="640" y="330" fill="#fbbf24" fontSize="7" fontFamily="monospace">
                        OCTA A
                      </text>
                      <text x="810" y="330" fill="#fbbf24" fontSize="7" fontFamily="monospace">
                        OCTA B
                      </text>

                      {/* Wind Fans */}
                      <circle cx="735" cy="315" r="8" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1" />
                      <text x="715" y="310" fill="#38bdf8" fontSize="6" fontFamily="monospace">
                        DMX WIND FAN
                      </text>
                    </g>
                  )}

                  {/* Camera Runway Position */}
                  <polygon points="735,400 728,415 742,415" fill="#6366f1" />
                  <text x="748" y="412" fill="#a5b4fc" fontSize="7" fontFamily="monospace">
                    RUNWAY CAM
                  </text>

                  {/* Room Label */}
                  <g transform="translate(645, 440)">
                    <rect x="-6" y="-14" width="135" height="20" rx="4" fill="#09090b" fillOpacity="0.8" stroke="#334155" strokeWidth="1" />
                    <text x="0" y="0" fill="#ffffff" fontWeight="bold" fontSize="12" fontFamily="'Space Grotesk', sans-serif">
                      BAY OMEGA-03
                    </text>
                    <text x="0" y="14" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                      Editorial High-Fashion • 1,400 sq ft
                    </text>
                  </g>

                  {/* Allocation Badge if active */}
                  {isAllocated && (
                    <g transform="translate(680, 512)">
                      <rect x="0" y="-12" width="150" height="20" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
                      <circle cx="10" cy="-2" r="3" fill="#34d399" />
                      <text x="20" y="2" fill="#6ee7b7" fontWeight="bold" fontSize="9" fontFamily="monospace">
                        ★ YOUR RESERVED BAY
                      </text>
                    </g>
                  )}

                  {/* Occupancy Heatmap overlay */}
                  {activeLayer === 'occupancy' && telemetry && (
                    <g transform="translate(745, 455)">
                      <rect
                        x="0"
                        y="0"
                        width="110"
                        height="24"
                        rx="4"
                        fill="#09090b"
                        fillOpacity="0.9"
                        stroke={telemetry.status === 'sold_out' ? '#ef4444' : '#10b981'}
                        strokeWidth="1"
                      />
                      <text x="8" y="16" fill="#e2e8f0" fontSize="9" fontFamily="monospace">
                        OCCUPANCY: <tspan fontWeight="bold" fill="#ef4444">{telemetry.occupancyPercent}%</tspan>
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

            {/* ==================================================================== */}
            {/* DIMENSION LINES & SCALE TICKS (Architectural Blueprint Mode)         */}
            {/* ==================================================================== */}
            {activeLayer === 'blueprint' && (
              <g opacity="0.6">
                {/* Top overall dimension line */}
                <line x1="30" y1="12" x2="870" y2="12" stroke="#64748b" strokeWidth="1" />
                <line x1="30" y1="8" x2="30" y2="16" stroke="#64748b" strokeWidth="1" />
                <line x1="870" y1="8" x2="870" y2="16" stroke="#64748b" strokeWidth="1" />
                <text x="410" y="10" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                  TOTAL FACILITY WIDTH: 105 FT (32 M)
                </text>

                {/* Left overall height dimension line */}
                <line x1="12" y1="30" x2="12" y2="530" stroke="#64748b" strokeWidth="1" />
                <line x1="8" y1="30" x2="16" y2="30" stroke="#64748b" strokeWidth="1" />
                <line x1="8" y1="530" x2="16" y2="530" stroke="#64748b" strokeWidth="1" />
                <text x="10" y="285" fill="#94a3b8" fontSize="8" fontFamily="monospace" transform="rotate(-90 10 285)">
                  DEPTH: 65 FT (20 M)
                </text>
              </g>
            )}
          </svg>

          {/* Interactive Legend / Map Key */}
          <div className="p-3 bg-[#0d0f16] border-t border-[#1f2430] flex flex-wrap items-center justify-between gap-3 text-xs font-ui">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" />
                <span className="text-zinc-300">Your Allocated Suite ({selectedBayAllocation})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-[#38bdf8]/20 border border-[#38bdf8]" />
                <span className="text-zinc-300">Selected / Inspected</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-zinc-400">Lighting Track / Rig</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                <span className="text-zinc-400">Camera / Model Mark</span>
              </div>
            </div>

            <div className="text-zinc-400 text-xs font-ui flex items-center space-x-1">
              <Info className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Click any bay on the floor plan to inspect dimensions &amp; re-allocate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Bay Technical Inspector Drawer */}
      <div className="p-4 sm:p-5 glass-level-2 border-t border-[rgba(90,150,180,0.18)] hairline-copper-top space-y-4 font-ui">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] font-bold">
                {activeZone.code}
              </span>
              {activeZone.code === selectedBayAllocation && (
                <span className="font-ui text-xs px-2 py-0.5 rounded bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Currently allocated to you
                </span>
              )}
              <span className="font-ui text-xs text-[#7E8F9F] capitalize">
                {activeZone.type}
              </span>
            </div>
            <h4 className="font-ui font-semibold text-lg text-[#F1F5F9]">
              {activeZone.name}
            </h4>
            <p className="font-ui text-xs text-[#94A3B8] mt-0.5">
              {activeZone.categoryDescription}
            </p>
          </div>

          {/* Quick Action Button */}
          {activeZone.allocatedPackageId && activeZone.code !== selectedBayAllocation && (
            <button
              type="button"
              id="switch-to-inspected-bay-btn"
              onClick={handleAllocateInspectedZone}
              className="btn-secondary-action !h-9 !py-1.5 !px-3.5 !text-xs tracking-normal font-ui font-medium self-start sm:self-auto shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Switch Booking to {activeZone.code}</span>
            </button>
          )}
        </div>

        {/* Spatial Specs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-ui">
          <div className="p-3 rounded-lg glass-recessed border border-[rgba(90,150,180,0.12)] space-y-1 min-w-0">
            <span className="text-xs text-[#7E8F9F] block truncate font-medium">Floor Dimensions</span>
            <span className="text-[#F1F5F9] font-semibold text-sm block truncate tabular-nums">{activeZone.dimensions}</span>
            <span className="text-xs text-[#94A3B8] block truncate tabular-nums">{activeZone.areaSqFt} sq ft ({Math.round(activeZone.areaSqFt * 0.0929)} m²)</span>
          </div>

          <div className="p-3 rounded-lg glass-recessed border border-[rgba(90,150,180,0.12)] space-y-1 min-w-0">
            <span className="text-xs text-[#7E8F9F] block truncate font-medium">Ceiling Clearance</span>
            <span className="text-[#38BDF8] font-semibold text-sm block truncate tabular-nums">{activeZone.ceilingHeight}</span>
            <span className="text-xs text-[#94A3B8] block truncate">Pantograph clearance</span>
          </div>

          <div className="p-3 rounded-lg glass-recessed border border-[rgba(90,150,180,0.12)] space-y-1 min-w-0">
            <span className="text-xs text-[#7E8F9F] block truncate font-medium">Acoustic Isolation</span>
            <span className="text-[#34D399] font-semibold text-sm block truncate">{activeZone.acousticRating}</span>
            <span className="text-xs text-[#94A3B8] block truncate">{activeZone.hvacZone}</span>
          </div>

          <div className="p-3 rounded-lg glass-recessed border border-[rgba(90,150,180,0.12)] space-y-1 min-w-0">
            <span className="text-xs text-[#7E8F9F] block truncate font-medium">Dedicated Power</span>
            <span className="text-[#FBBF24] font-semibold text-sm block truncate">{activeZone.powerSpecs}</span>
            <span className="text-xs text-[#94A3B8] block truncate">Clean Audio Ground</span>
          </div>
        </div>

        {/* Lighting & Rigging Specs */}
        <div className="p-3 glass-recessed rounded-lg border border-[rgba(90,150,180,0.12)] space-y-2 font-ui">
          <div className="flex items-center justify-between text-xs font-ui">
            <span className="text-[#94A3B8] flex items-center gap-1.5 font-medium">
              <Lightbulb className="w-3.5 h-3.5 text-[#FBBF24]" />
              <span>Standard Lighting Rigging:</span>
            </span>
            <span className="text-[#F1F5F9] font-semibold">{activeZone.lightingRig}</span>
          </div>

          {/* Features bullet list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-[rgba(90,150,180,0.10)] text-xs font-ui text-[#94A3B8]">
            {activeZone.features.map((feat, idx) => (
              <div key={idx} className="flex items-center space-x-1.5">
                <span className="w-1 h-1 rounded-full bg-[#38BDF8]" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Associated Package Link if applicable */}
        {matchedPackage && (
          <div className="p-3 glass-recessed rounded-lg border border-[#38BDF8]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-ui">
            <div>
              <span className="text-[#7E8F9F] text-xs font-medium">Default Package for this Bay:</span>
              <p className="text-[#F1F5F9] font-semibold">
                {matchedPackage.name} — <span className="text-[#38BDF8] tabular-nums font-semibold">{matchedPackage.price.toLocaleString()} MMK</span>
              </p>
            </div>
            <span className="text-xs text-[#94A3B8]">
              Includes {matchedPackage.features[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
