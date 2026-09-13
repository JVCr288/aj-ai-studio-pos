import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  Lock,
} from 'lucide-react';

interface MonthCalendarPickerProps {
  currentDateStr: string;
  currentMonthStr: string;
  onSelectDate: (dateStr: string, monthStr: string) => void;
}

const MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

const MONTH_SHORTS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const MonthCalendarPicker: React.FC<MonthCalendarPickerProps> = ({
  currentDateStr,
  currentMonthStr,
  onSelectDate,
}) => {
  // Parse initial year and month from currentDateStr (e.g. "18 NOV 2026")
  const initialDateParsed = useMemo(() => {
    const parts = currentDateStr.split(' ');
    let day = 18;
    let monthIdx = 10; // November default (0-indexed)
    let year = 2026;

    if (parts.length >= 3) {
      day = parseInt(parts[0], 10) || 18;
      const mStr = parts[1].toUpperCase();
      const foundIdx = MONTH_SHORTS.findIndex((m) => m === mStr);
      if (foundIdx !== -1) monthIdx = foundIdx;
      year = parseInt(parts[2], 10) || 2026;
    }
    return { day, monthIdx, year };
  }, [currentDateStr]);

  const [viewYear, setViewYear] = useState<number>(initialDateParsed.year);
  const [viewMonth, setViewMonth] = useState<number>(initialDateParsed.monthIdx);
  const [calendarMode, setCalendarMode] = useState<'month' | 'strip'>('month');

  // Navigate to previous month
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Jump to currently selected date's month
  const handleResetToSelected = () => {
    setViewYear(initialDateParsed.year);
    setViewMonth(initialDateParsed.monthIdx);
  };

  // Generate calendar days for viewMonth and viewYear
  const calendarGrid = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Monday = 0, Sunday = 6
    const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dayNum: number;
      monthType: 'prev' | 'current' | 'next';
      dateStr: string;
      monthStr: string;
      isSelectable: boolean;
      status: 'available' | 'limited' | 'sold_out' | 'darkroom_closed';
      statusLabel: string;
    }> = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        dayNum,
        monthType: 'prev',
        dateStr: `${dayNum} ${MONTH_SHORTS[prevMonthIdx]} ${prevYear}`,
        monthStr: `${MONTH_NAMES[prevMonthIdx]} ${prevYear}`,
        isSelectable: false,
        status: 'darkroom_closed',
        statusLabel: 'Previous Month',
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      // Day of week index (Monday = 0, Sunday = 6)
      const dayOfWeek = (new Date(viewYear, viewMonth, d).getDay() + 6) % 7;
      const dateString = `${d} ${MONTH_SHORTS[viewMonth]} ${viewYear}`;
      const monthString = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

      // Studio availability logic:
      // Mondays (0) & Tuesdays (1) are Darkroom Prep / Private Maintenance
      const isDarkroomPrep = dayOfWeek === 0 || dayOfWeek === 1;

      // Realistic booked dates: Saturday 21 Nov 2026, Saturday 28 Nov, or specific dates
      const isBooked =
        !isDarkroomPrep &&
        ((viewMonth === 10 && (d === 21 || d === 28)) ||
          (viewMonth === 11 && (d === 12 || d === 25 || d === 31)));

      // Limited capacity dates (Sundays or peak Fridays)
      const isLimited =
        !isDarkroomPrep &&
        !isBooked &&
        (dayOfWeek === 6 || (viewMonth === 10 && d === 20));

      let status: 'available' | 'limited' | 'sold_out' | 'darkroom_closed' = 'available';
      let statusLabel = 'Atelier Slots Open';

      if (isDarkroomPrep) {
        status = 'darkroom_closed';
        statusLabel = 'Darkroom Prep (Closed)';
      } else if (isBooked) {
        status = 'sold_out';
        statusLabel = 'Fully Booked';
      } else if (isLimited) {
        status = 'limited';
        statusLabel = 'Limited Bays Open';
      }

      cells.push({
        dayNum: d,
        monthType: 'current',
        dateStr: dateString,
        monthStr: monthString,
        isSelectable: !isDarkroomPrep && !isBooked,
        status,
        statusLabel,
      });
    }

    // Next month padding days to complete grid to 35 or 42
    const totalCurrentCells = cells.length;
    const targetLength = totalCurrentCells <= 35 ? 35 : 42;
    const remaining = targetLength - totalCurrentCells;

    for (let d = 1; d <= remaining; d++) {
      const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({
        dayNum: d,
        monthType: 'next',
        dateStr: `${d} ${MONTH_SHORTS[nextMonthIdx]} ${nextYear}`,
        monthStr: `${MONTH_NAMES[nextMonthIdx]} ${nextYear}`,
        isSelectable: false,
        status: 'darkroom_closed',
        statusLabel: 'Next Month',
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Selected date formatted breakdown
  const selectedDayNum = initialDateParsed.day;
  const isCurrentMonthViewed =
    viewYear === initialDateParsed.year && viewMonth === initialDateParsed.monthIdx;

  return (
    <div
      id="month-calendar-picker-component"
      className="glass-level-2 rounded-xl p-3.5 sm:p-4 space-y-2.5 select-none font-ui"
    >
      {/* Calendar Header with Month Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-[rgba(90,150,180,0.14)]">
        <div className="flex items-center space-x-2.5">
          <div className="p-1 rounded-md glass-recessed text-[#38BDF8]">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-ui font-semibold text-sm text-[#F1F5F9] tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>
            <p className="font-ui text-xs text-[#94A3B8]">
              Selected: <span className="text-[#38BDF8] font-semibold tabular-nums">{currentDateStr}</span>
            </p>
          </div>
        </div>

        {/* Navigation & Mode Controls */}
        <div className="flex items-center space-x-1.5">
          {!isCurrentMonthViewed && (
            <button
              type="button"
              onClick={handleResetToSelected}
              className="px-2.5 py-1 rounded-md bg-[#102538] hover:bg-[#142C44] border border-[rgba(90,150,180,0.18)] text-xs font-ui text-[#F1F5F9] flex items-center space-x-1 transition-colors cursor-pointer workstation-focus"
              title="Return to selected month"
            >
              <RotateCcw className="w-3 h-3 text-[#38BDF8]" />
              <span className="hidden sm:inline">Active</span>
            </button>
          )}

          {/* View Mode Toggle: Month Grid vs Strip */}
          <div className="flex items-center glass-recessed p-0.5 rounded-lg text-xs font-ui">
            <button
              type="button"
              onClick={() => setCalendarMode('month')}
              className={`px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                calendarMode === 'month'
                  ? 'bg-[#102538] text-[#38BDF8] font-semibold'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('strip')}
              className={`px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                calendarMode === 'strip'
                  ? 'bg-[#102538] text-[#38BDF8] font-semibold'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              Week
            </button>
          </div>

          <button
            type="button"
            id="cal-prev-month-btn"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-md bg-[#102538] hover:bg-[#142C44] border border-[rgba(90,150,180,0.18)] text-[#F1F5F9] transition-colors cursor-pointer workstation-focus"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            id="cal-next-month-btn"
            onClick={handleNextMonth}
            className="p-1.5 rounded-md bg-[#102538] hover:bg-[#142C44] border border-[rgba(90,150,180,0.18)] text-[#F1F5F9] transition-colors cursor-pointer workstation-focus"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {calendarMode === 'month' ? (
        /* FULL MONTH VIEW */
        <div className="space-y-1.5 font-ui">
          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 gap-1 font-ui text-xs text-[#7E8F9F] font-semibold text-center pb-0.5">
            {WEEKDAYS.map((wd, idx) => (
              <div
                key={wd}
                className={`py-0.5 ${
                  idx === 0 || idx === 1 ? 'text-[#7E8F9F]' : 'text-[#94A3B8]'
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Month Day Grid Cells */}
          <div className="grid grid-cols-7 gap-1 font-ui text-xs">
            {calendarGrid.map((cell, idx) => {
              const isSelected =
                cell.monthType === 'current' &&
                isCurrentMonthViewed &&
                cell.dayNum === selectedDayNum;

              // Outside current viewed month
              if (cell.monthType !== 'current') {
                return (
                  <div
                    key={`pad-${cell.monthType}-${cell.dayNum}-${idx}`}
                    className="h-9 sm:h-10 rounded flex flex-col items-center justify-center text-[#64748B]/30 select-none bg-transparent"
                  >
                    <span className="text-xs tabular-nums">{cell.dayNum}</span>
                  </div>
                );
              }

              // Darkroom closed (Mondays & Tuesdays)
              if (cell.status === 'darkroom_closed') {
                return (
                  <div
                    key={`day-${cell.dayNum}`}
                    className="h-9 sm:h-10 rounded bg-[rgba(6,14,24,0.6)] border border-transparent flex flex-col items-center justify-center text-[#64748B] cursor-not-allowed select-none group relative"
                    title={`${cell.dateStr}: Darkroom Prep (Studio Closed)`}
                  >
                    <span className="text-xs font-medium tabular-nums">{cell.dayNum}</span>
                    <span className="text-[9px] text-[#64748B] uppercase tracking-wider">Prep</span>
                  </div>
                );
              }

              // Fully Booked day
              if (cell.status === 'sold_out') {
                return (
                  <div
                    key={`day-${cell.dayNum}`}
                    className="h-9 sm:h-10 rounded border border-[#FB7185]/35 bg-[#FB7185]/10 flex flex-col items-center justify-center text-[#FB7185]/80 cursor-not-allowed select-none relative group"
                    title={`${cell.dateStr}: Fully Booked across all soundstages`}
                  >
                    <span className="text-xs font-medium line-through decoration-[#FB7185]/70 tabular-nums">
                      {cell.dayNum}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FB7185] mt-0.5" />
                  </div>
                );
              }

              // Selectable Days (Available or Limited)
              return (
                <button
                  key={`day-${cell.dayNum}`}
                  type="button"
                  onClick={() => onSelectDate(cell.dateStr, cell.monthStr)}
                  className={`h-9 sm:h-10 rounded flex flex-col items-center justify-center transition-all cursor-pointer select-none relative group workstation-focus ${
                    isSelected
                      ? 'bg-[#38BDF8] text-[#071423] font-bold border-2 border-[#38BDF8] shadow-[0_0_16px_rgba(56,189,248,0.35)] transform scale-[1.03] z-10'
                      : cell.status === 'limited'
                      ? 'border border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24] hover:border-[#FBBF24] hover:bg-[#FBBF24]/15'
                      : 'border border-[rgba(90,150,180,0.06)] bg-[rgba(8,20,32,0.45)] hover:bg-[rgba(16,38,58,0.70)] hover:border-[#38BDF8]/40 text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                  title={`${cell.dateStr}: ${cell.statusLabel} • Click to select`}
                >
                  <span className={`text-xs tabular-nums ${isSelected ? 'font-black' : 'font-semibold'}`}>
                    {cell.dayNum}
                  </span>

                  {/* Status Indicator Dot */}
                  <div className="flex items-center space-x-0.5 mt-0.5">
                    {isSelected ? (
                      <span className="text-[8px] font-black tracking-tight uppercase">Active</span>
                    ) : cell.status === 'limited' ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* COMPACT 7-DAY WEEK STRIP VIEW */
        <div className="space-y-2 font-ui">
          <div className="grid grid-cols-7 gap-1.5 font-ui text-xs text-center">
            {calendarGrid
              .filter((c) => c.monthType === 'current')
              .slice(15, 22)
              .map((cell) => {
                const isSelected =
                  isCurrentMonthViewed && cell.dayNum === selectedDayNum;
                const dayName = WEEKDAYS[(new Date(viewYear, viewMonth, cell.dayNum).getDay() + 6) % 7];

                if (cell.status === 'sold_out') {
                  return (
                    <div
                      key={`strip-${cell.dayNum}`}
                      className="h-10 flex flex-col items-center justify-center text-[#FB7185]/60 line-through rounded bg-[#030F1E] border border-[#FB7185]/30 cursor-not-allowed"
                      title="Fully Booked"
                    >
                      <span className="text-[10px]">{dayName}</span>
                      <span className="tabular-nums">{cell.dayNum}</span>
                    </div>
                  );
                }

                if (cell.status === 'darkroom_closed') {
                  return (
                    <div
                      key={`strip-${cell.dayNum}`}
                      className="h-10 flex flex-col items-center justify-center text-[#7E8F9F] rounded bg-[#030F1E] border border-[rgba(90,150,180,0.12)] cursor-not-allowed"
                      title="Darkroom Prep"
                    >
                      <span className="text-[10px]">{dayName}</span>
                      <span className="tabular-nums">{cell.dayNum}</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={`strip-${cell.dayNum}`}
                    type="button"
                    onClick={() => onSelectDate(cell.dateStr, cell.monthStr)}
                    className={`h-10 flex flex-col items-center justify-center rounded transition-all cursor-pointer workstation-focus ${
                      isSelected
                        ? 'bg-[#38BDF8] text-[#071423] font-bold border-2 border-[#38BDF8]'
                        : 'text-[#94A3B8] hover:bg-[#102538] hover:text-[#38BDF8] border border-[rgba(90,150,180,0.10)] bg-[rgba(8,20,32,0.45)]'
                    }`}
                  >
                    <span className="text-[10px] text-[#94A3B8]">{dayName}</span>
                    <span className="font-semibold tabular-nums">{cell.dayNum}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Calendar Bottom Legend Matching Approved Reference */}
      <div className="pt-2 border-t border-[rgba(90,150,180,0.14)] flex items-center justify-center gap-4 sm:gap-6 text-xs font-ui text-[#7E8F9F] flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#34D399]" />
          <span>Open</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FBBF24]" />
          <span>Limited</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FB7185]" />
          <span>Sold Out</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#64748B]" />
          <span>Prep (Mon/Tue)</span>
        </span>
      </div>
    </div>
  );
};
