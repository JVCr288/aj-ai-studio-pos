import React, { useState, useEffect } from 'react';
import { PosShiftRecord, PosZReport, PosCashMovement } from '../../types';
import { TenantConfig } from '../../config/tenantConfig';
import { posService } from '../../services/posService';
import {
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileCheck,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Coins,
  Receipt,
  Plus,
} from 'lucide-react';
import { HelpTip } from '../ui/HelpTip';

interface PosShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftRecord: PosShiftRecord;
  tenant: TenantConfig;
  countedCashInput: string;
  onCountedCashChange: (val: string) => void;
  activeZReport: PosZReport | null;
  shiftClosureNotes: string;
  onShiftClosureNotesChange: (val: string) => void;
  startingFloatInput: string;
  onStartingFloatInputChange: (val: string) => void;
  onStartNewShift: () => void;
  onPrintXReport: () => void;
  onFinalizeZReport: () => void;
  onRecordCashMovement: (params: {
    type: 'CASH_DROP' | 'CASH_IN';
    amountMMK: number;
    reason: string;
  }) => void;
  onReprintHistoricalShift?: (shift: PosShiftRecord) => void;
  isClosingShift: boolean;
}

export const PosShiftModal: React.FC<PosShiftModalProps> = ({
  isOpen,
  onClose,
  shiftRecord,
  tenant,
  countedCashInput,
  onCountedCashChange,
  activeZReport,
  shiftClosureNotes,
  onShiftClosureNotesChange,
  startingFloatInput,
  onStartingFloatInputChange,
  onStartNewShift,
  onPrintXReport,
  onFinalizeZReport,
  onRecordCashMovement,
  onReprintHistoricalShift,
  isClosingShift,
}) => {
  const [modalTab, setModalTab] = useState<'reconcile' | 'movements' | 'history'>('reconcile');

  // Cash movement form state
  const [movementType, setMovementType] = useState<'CASH_DROP' | 'CASH_IN'>('CASH_DROP');
  const [movementAmountInput, setMovementAmountInput] = useState<string>('50000');
  const [movementReasonInput, setMovementReasonInput] = useState<string>('Vault Safe Deposit');
  const [movementFeedback, setMovementFeedback] = useState<string | null>(null);

  // Historical shifts state
  const [historicalShifts, setHistoricalShifts] = useState<PosShiftRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistoricalShifts(posService.getShiftHistory());
    }
  }, [isOpen, modalTab]);

  if (!isOpen) return null;

  // Real-time calculations
  const totalDrops = shiftRecord.totalCashDropsMMK || 0;
  const totalCashIn = shiftRecord.totalCashInMMK || 0;
  const expectedCashInDrawerMMK =
    shiftRecord.startingCashMMK + shiftRecord.totalCashSalesMMK + totalCashIn - totalDrops;

  const countedVal = parseInt(countedCashInput.replace(/,/g, ''), 10) || 0;
  const liveDiscrepancyMMK = countedVal - expectedCashInDrawerMMK;
  const liveDiscrepancyType: 'BALANCED' | 'SHORTAGE' | 'OVERAGE' =
    liveDiscrepancyMMK === 0 ? 'BALANCED' : liveDiscrepancyMMK < 0 ? 'SHORTAGE' : 'OVERAGE';

  const handleAddMovement = () => {
    const amt = parseInt(movementAmountInput.replace(/,/g, ''), 10) || 0;
    if (amt <= 0) return;
    if (!movementReasonInput.trim()) return;

    onRecordCashMovement({
      type: movementType,
      amountMMK: amt,
      reason: movementReasonInput.trim(),
    });

    setMovementFeedback(
      `Recorded ${movementType === 'CASH_DROP' ? 'Cash Drop' : 'Cash In'}: ${amt.toLocaleString()} MMK (${movementReasonInput})`
    );
    setTimeout(() => setMovementFeedback(null), 4000);
    setMovementAmountInput('50000');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#071423] border border-[#1E3A4F] rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E3A4F]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-[#38BDF8]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Register Shift &amp; Cash Reconciliation
              </h2>
              <p className="text-xs text-slate-400">
                {tenant.displayName} • {shiftRecord.terminalId} • {shiftRecord.staffName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#102538] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-[#030F1E] p-1 rounded-xl border border-[#1E3A4F]">
          <button
            type="button"
            onClick={() => setModalTab('reconcile')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              modalTab === 'reconcile'
                ? 'bg-[#38BDF8] text-[#071423] shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Shift &amp; Z-Report</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('movements')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              modalTab === 'movements'
                ? 'bg-[#38BDF8] text-[#071423] shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Cash Drops &amp; In ({(shiftRecord.cashMovements || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('history')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              modalTab === 'history'
                ? 'bg-[#38BDF8] text-[#071423] shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Shifts ({historicalShifts.length})</span>
          </button>
        </div>

        {/* TAB 1: RECONCILE & SHIFT CLOSURE */}
        {modalTab === 'reconcile' && (
          <div className="space-y-4">
            {/* Shift Status & Time Details */}
            <div className="flex items-center justify-between bg-[#030F1E] border border-[#1E3A4F] rounded-xl px-4 py-2.5 text-xs">
              <div>
                <span className="text-slate-400">Shift Opened: </span>
                <span className="font-mono text-slate-200">
                  {new Date(shiftRecord.openedAt).toLocaleTimeString()} ({new Date(shiftRecord.openedAt).toLocaleDateString()})
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                  shiftRecord.status === 'CLOSED'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {shiftRecord.status === 'CLOSED' ? 'Shift Closed' : 'Shift Active'}
              </span>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#102538]/60 border border-[#1E3A4F] rounded-xl p-3">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between mb-1">
                  <span>Starting Float</span>
                  <HelpTip tipId="pos-starting-float" />
                </span>
                <span className="font-mono font-bold text-xs text-slate-200">
                  {shiftRecord.startingCashMMK.toLocaleString()} MMK
                </span>
              </div>

              <div className="bg-[#102538]/60 border border-[#1E3A4F] rounded-xl p-3">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Cash Sales</span>
                <span className="font-mono font-bold text-xs text-emerald-400">
                  +{shiftRecord.totalCashSalesMMK.toLocaleString()} MMK
                </span>
              </div>

              <div className="bg-[#102538]/60 border border-[#1E3A4F] rounded-xl p-3">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Cash Movements</span>
                <span className="font-mono font-bold text-xs text-amber-400">
                  {totalDrops > 0 ? `-${totalDrops.toLocaleString()}` : '0'} MMK
                </span>
              </div>

              <div className="bg-[#102538]/60 border border-[#1E3A4F] rounded-xl p-3">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Expected in Drawer</span>
                <span className="font-mono font-bold text-xs text-[#38BDF8]">
                  {expectedCashInDrawerMMK.toLocaleString()} MMK
                </span>
              </div>
            </div>

            {/* Cash Drawer Count & Discrepancy Engine */}
            {shiftRecord.status === 'OPEN' ? (
              <div className="space-y-3 bg-[#030F1E] border border-[#1E3A4F] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    Physical Counted Cash in Drawer
                  </label>
                  <button
                    type="button"
                    onClick={() => onCountedCashChange(expectedCashInDrawerMMK.toString())}
                    className="text-[11px] text-[#38BDF8] hover:underline cursor-pointer font-mono"
                  >
                    Match Expected ({expectedCashInDrawerMMK.toLocaleString()} MMK)
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={countedCashInput}
                    onChange={(e) => onCountedCashChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-3.5 py-2.5 text-base font-mono text-slate-100 font-bold focus:outline-none focus:border-[#38BDF8]"
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-slate-400 font-mono">MMK</span>
                </div>

                {/* Discrepancy Live Indicator */}
                <div
                  className={`p-3 rounded-lg text-xs flex items-center justify-between font-medium ${
                    liveDiscrepancyType === 'BALANCED'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : liveDiscrepancyType === 'OVERAGE'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {liveDiscrepancyType === 'BALANCED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>
                      {liveDiscrepancyType === 'BALANCED'
                        ? 'Cash Drawer is Balanced (0 MMK Discrepancy)'
                        : liveDiscrepancyType === 'OVERAGE'
                        ? `Drawer Overage: +${liveDiscrepancyMMK.toLocaleString()} MMK`
                        : `Drawer Shortage: ${liveDiscrepancyMMK.toLocaleString()} MMK`}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] uppercase font-bold flex items-center gap-1">
                    <span>{liveDiscrepancyType}</span>
                    <HelpTip tipId="pos-discrepancy" />
                  </span>
                </div>

                {/* Shift Closure Notes */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Shift Closure Notes (Optional explanation for discrepancy / petty cash)
                  </label>
                  <textarea
                    rows={2}
                    value={shiftClosureNotes}
                    onChange={(e) => onShiftClosureNotesChange(e.target.value)}
                    placeholder="Enter notes or explanation for discrepancies..."
                    className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>
            ) : (
              /* When Shift is Already Closed: Show details and Open New Shift section */
              <div className="space-y-4">
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-rose-400" />
                    <span>This shift was closed at {shiftRecord.closedAt ? new Date(shiftRecord.closedAt).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div className="text-[11px] text-rose-200/80">
                    Counted Cash: {shiftRecord.actualCashInDrawerMMK?.toLocaleString()} MMK • Discrepancy: {shiftRecord.cashDiscrepancyMMK?.toLocaleString()} MMK
                  </div>
                </div>

                <div className="bg-[#030F1E] border border-[#1E3A4F] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-200">Start Next Register Shift</h3>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-400 block mb-1">Opening Cash Float (MMK)</label>
                      <input
                        type="text"
                        value={startingFloatInput}
                        onChange={(e) => onStartingFloatInputChange(e.target.value)}
                        className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={onStartNewShift}
                      className="self-end py-2 px-4 rounded-lg bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#071423] font-bold text-xs transition-colors cursor-pointer"
                    >
                      Open New Shift
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-2 border-t border-[#1E3A4F]">
              <button
                type="button"
                onClick={onPrintXReport}
                className="flex-1 py-2.5 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-slate-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                title="Print mid-shift snapshot without closing the shift"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Print X-Report (Audit)</span>
                <HelpTip tipId="pos-x-report" />
              </button>

              {shiftRecord.status === 'OPEN' && (
                <button
                  type="button"
                  onClick={onFinalizeZReport}
                  disabled={isClosingShift}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  title="Close shift, cut paper, kick drawer, and print official Z-Report"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{isClosingShift ? 'Closing...' : 'Close Shift & Print Z-Report'}</span>
                  <HelpTip tipId="pos-z-report" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CASH MOVEMENTS (DROPS & FLOAT IN) */}
        {modalTab === 'movements' && (
          <div className="space-y-4">
            {/* Movement Recording Form */}
            <div className="bg-[#030F1E] border border-[#1E3A4F] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Record Drawer Cash Movement</span>
              </h3>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setMovementType('CASH_DROP')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                    movementType === 'CASH_DROP'
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold'
                      : 'bg-[#102538] text-slate-400'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Cash Drop (Out to Safe/Petty)</span>
                  <HelpTip tipId="pos-cash-drop" />
                </button>

                <button
                  type="button"
                  onClick={() => setMovementType('CASH_IN')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                    movementType === 'CASH_IN'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold'
                      : 'bg-[#102538] text-slate-400'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Cash In (Float Top-up)</span>
                  <HelpTip tipId="pos-cash-in" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Amount (MMK)</label>
                  <input
                    type="text"
                    value={movementAmountInput}
                    onChange={(e) => setMovementAmountInput(e.target.value)}
                    placeholder="50,000"
                    className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-3 py-1.5 font-mono text-slate-100 font-bold focus:outline-none focus:border-[#38BDF8]"
                  />
                  <div className="flex items-center space-x-1 mt-1 overflow-x-auto">
                    {[20000, 50000, 100000, 200000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setMovementAmountInput(amt.toLocaleString())}
                        className="px-1.5 py-0.5 rounded bg-[#102538] hover:bg-[#1E3A4F] text-[10px] font-mono text-slate-300 cursor-pointer shrink-0"
                      >
                        {amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Reason / Purpose</label>
                  <input
                    type="text"
                    value={movementReasonInput}
                    onChange={(e) => setMovementReasonInput(e.target.value)}
                    placeholder="e.g. Vault Safe Deposit, Ice/Petty Cash"
                    className="w-full bg-[#071423] border border-[#1E3A4F] rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-[#38BDF8]"
                  />
                  <div className="flex items-center space-x-1 mt-1 overflow-x-auto">
                    {['Vault Safe Deposit', 'Petty Cash: Coffee/Ice', 'Change Float Top-up'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setMovementReasonInput(r)}
                        className="px-1.5 py-0.5 rounded bg-[#102538] hover:bg-[#1E3A4F] text-[10px] text-slate-300 cursor-pointer shrink-0 truncate max-w-[120px]"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddMovement}
                className="w-full py-2 rounded-lg bg-[#38BDF8] hover:bg-[#0284C7] text-[#071423] font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-md shadow-[#38BDF8]/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Movement</span>
              </button>

              {movementFeedback && (
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono text-center">
                  {movementFeedback}
                </div>
              )}
            </div>

            {/* List of Movements for Active Shift */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Shift Movements Ledger ({(shiftRecord.cashMovements || []).length})
              </span>

              {(shiftRecord.cashMovements || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-[#1E3A4F] rounded-xl">
                  No cash movements recorded yet for this active shift.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {(shiftRecord.cashMovements || []).map((mov) => (
                    <div
                      key={mov.id}
                      className="p-2.5 rounded-lg bg-[#030F1E] border border-[#1E3A4F] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center space-x-2">
                        {mov.type === 'CASH_DROP' ? (
                          <div className="p-1 rounded bg-rose-500/20 text-rose-400">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-200 block">{mov.reason}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(mov.timestamp).toLocaleTimeString()} • {mov.performedBy}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`font-bold ${
                          mov.type === 'CASH_DROP' ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {mov.type === 'CASH_DROP' ? '-' : '+'}
                        {mov.amountMMK.toLocaleString()} MMK
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PAST SHIFTS & Z-REPORTS HISTORY */}
        {modalTab === 'history' && (
          <div className="space-y-3">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider block">
              Historical Closed Shifts &amp; Audits ({historicalShifts.length})
            </span>

            {historicalShifts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-[#1E3A4F] rounded-xl">
                No archived shifts found in system history.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {historicalShifts.map((hShift, idx) => (
                  <div
                    key={hShift.shiftId || idx}
                    className="p-3 rounded-xl bg-[#030F1E] border border-[#1E3A4F] hover:border-[#38BDF8]/40 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-200">{hShift.shiftId}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {hShift.staffName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Closed: {hShift.closedAt ? new Date(hShift.closedAt).toLocaleString() : 'N/A'} • {hShift.totalTransactionsCount || 0} transactions
                      </p>
                      <div className="text-[11px] font-mono space-x-2">
                        <span className="text-slate-300">Sales: {(hShift.totalCashSalesMMK + hShift.totalDigitalSalesMMK).toLocaleString()} MMK</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-300">Drawer: {hShift.actualCashInDrawerMMK?.toLocaleString() || 'N/A'} MMK</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          (hShift.cashDiscrepancyMMK || 0) === 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : (hShift.cashDiscrepancyMMK || 0) > 0
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {(hShift.cashDiscrepancyMMK || 0) === 0
                          ? 'BALANCED'
                          : (hShift.cashDiscrepancyMMK || 0) > 0
                          ? `+${hShift.cashDiscrepancyMMK?.toLocaleString()} MMK`
                          : `${hShift.cashDiscrepancyMMK?.toLocaleString()} MMK`}
                      </span>

                      {onReprintHistoricalShift && (
                        <button
                          type="button"
                          onClick={() => onReprintHistoricalShift(hShift)}
                          className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#071423] text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Reprint Z-Report Slip"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Reprint Slip</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
