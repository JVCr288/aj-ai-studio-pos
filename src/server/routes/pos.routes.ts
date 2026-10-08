import { Router, Request, Response } from 'express';
import { broadcastStudioEvent } from '../events/sseBus.js';
import { PosTransaction, PosShiftRecord, PosZReport } from '../../types.js';

export const posRouter = Router();

// In-memory server store for POS transactions and shift reports (dual-mode architecture)
const serverTransactions: PosTransaction[] = [];
const serverZReports: PosZReport[] = [];

/**
 * GET /api/pos/transactions
 * Retrieve historical POS transactions with optional tenantId filter.
 */
posRouter.get('/api/pos/transactions', (req: Request, res: Response) => {
  const tenantId = (req.query.tenantId as string) || undefined;
  const filtered = tenantId
    ? serverTransactions.filter((tx) => tx.tenantId === tenantId)
    : serverTransactions;
  res.json({
    success: true,
    count: filtered.length,
    transactions: filtered.slice(0, 100),
  });
});

/**
 * POST /api/pos/transactions
 * Ingest single or bulk transactions (supports offline sync batch).
 */
posRouter.post('/api/pos/transactions', (req: Request, res: Response) => {
  const payload = req.body;
  const items: PosTransaction[] = Array.isArray(payload) ? payload : [payload];

  const ingested: PosTransaction[] = [];

  for (const tx of items) {
    if (!tx.id || !tx.totalDueMMK) continue;

    // Deduplicate by ID
    const exists = serverTransactions.some((t) => t.id === tx.id);
    if (!exists) {
      serverTransactions.unshift(tx);
      ingested.push(tx);
    }
  }

  // Broadcast real-time SSE event for dashboard and live consoles
  if (ingested.length > 0) {
    broadcastStudioEvent({
      id: `evt-pos-${Date.now()}`,
      tenantId: ingested[0].tenantId || 'nocturne',
      type: 'POS_TRANSACTION_SETTLED',
      payload: {
        count: ingested.length,
        lastOrderReference: ingested[0].orderReference,
        totalAmountMMK: ingested.reduce((sum, it) => sum + it.totalDueMMK, 0),
      },
      timestamp: new Date().toISOString(),
    });
  }

  res.status(201).json({
    success: true,
    message: `Successfully ingested ${ingested.length} transaction(s).`,
    ingestedCount: ingested.length,
    totalServerTransactions: serverTransactions.length,
  });
});

/**
 * POST /api/pos/shifts
 * Ingest shift closure / Z-Report for persistent financial audit.
 */
posRouter.post('/api/pos/shifts', (req: Request, res: Response) => {
  const report = req.body as PosZReport;
  if (!report.reportId || !report.terminalId) {
    res.status(400).json({ success: false, error: 'Invalid shift report payload.' });
    return;
  }

  serverZReports.unshift(report);

  broadcastStudioEvent({
    id: `evt-shift-${Date.now()}`,
    tenantId: 'nocturne',
    type: 'NOTE_UPDATED',
    payload: {
      reportId: report.reportId,
      terminalId: report.terminalId,
      staffName: report.staffName,
      netSalesMMK: report.netSalesMMK,
    },
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: 'Shift Z-Report recorded successfully.',
    reportId: report.reportId,
  });
});
