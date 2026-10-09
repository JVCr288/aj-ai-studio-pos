import { Router, Request, Response } from 'express';
import { broadcastStudioEvent } from '../events/sseBus.js';
import { PosTransaction, PosShiftRecord, PosZReport, PosStaffMember, PosStaffRole } from '../../types.js';
import { verifyStudioAdminMiddleware } from '../middleware/auth.js';
import { getDb } from '../../db/index.js';
import { posTransactions, posShifts, posStaff } from '../../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import {
  hashWithScrypt,
  verifyWithScrypt,
  createManagerOverrideToken,
  verifyAndConsumeOverrideToken,
  hashSha256,
} from '../utils/crypto.js';
import { isMemoryDemoAllowed, isDemoTenantSlug } from '../utils/storageMode.js';

export const posRouter = Router();

// Require authenticated Studio Admin Session on all POS routes
posRouter.use(verifyStudioAdminMiddleware);

// In-memory server fallback store for demo mode
const serverTransactions: PosTransaction[] = [];
const serverZReports: PosZReport[] = [];

// Server-side demo staff definitions with pre-calculated/hashed passwords (NOT sent to client bundle)
interface ServerStaffRecord {
  id: string;
  tenantId: string;
  name: string;
  myanmarName: string;
  role: PosStaffRole;
  pin: string; // Plaintext for demo fallback only
  pinHash?: string;
  badgeBarcode: string;
  avatarColor: string;
  isActive: boolean;
  failedAttempts: number;
  lockedUntil: Date | null;
}

const demoServerStaffMap = new Map<string, ServerStaffRecord[]>([
  [
    'aj-ai-studio',
    [
      {
        id: 'stf-01',
        tenantId: 'aj-ai-studio',
        name: 'Aung Kyaw',
        myanmarName: 'အောင်ကျော်',
        role: 'CASHIER',
        pin: '1234',
        badgeBarcode: 'STAFF-AK-01',
        avatarColor: '#38BDF8',
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
      {
        id: 'stf-02',
        tenantId: 'aj-ai-studio',
        name: 'Su Myat',
        myanmarName: 'စုမြတ်',
        role: 'LEAD_CASHIER',
        pin: '2345',
        badgeBarcode: 'STAFF-SM-02',
        avatarColor: '#A855F7',
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
      {
        id: 'stf-03',
        tenantId: 'aj-ai-studio',
        name: 'Ko Zin',
        myanmarName: 'ကိုဇင် (မန်နေဂျာ)',
        role: 'STUDIO_MANAGER',
        pin: '9999',
        badgeBarcode: 'STAFF-KZ-03',
        avatarColor: '#F59E0B',
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
      {
        id: 'stf-04',
        tenantId: 'aj-ai-studio',
        name: 'Daw Khin',
        myanmarName: 'ဒေါ်ခင် (ဆိုင်ရှင်)',
        role: 'OWNER',
        pin: '8888',
        badgeBarcode: 'STAFF-DK-04',
        avatarColor: '#10B981',
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    ],
  ],
]);

function getDemoStaffForTenant(tenantId: string): ServerStaffRecord[] {
  // Demo roster is strictly restricted to allowed memory demo mode and recognized demo slugs
  if (!isMemoryDemoAllowed() || !isDemoTenantSlug(tenantId)) {
    return [];
  }
  let list = demoServerStaffMap.get(tenantId);
  if (!list) {
    const base = demoServerStaffMap.get('aj-ai-studio') || [];
    list = base.map((s) => ({ ...s, tenantId }));
    demoServerStaffMap.set(tenantId, list);
  }
  return list;
}

/**
 * GET /api/pos/transactions
 * Retrieve historical POS transactions for the authenticated session tenant.
 */
posRouter.get('/api/pos/transactions', async (req: Request, res: Response) => {
  const sessionTenantId = res.locals.tenantId as string;
  const db = getDb();

  if (db) {
    try {
      const rows = await db
        .select()
        .from(posTransactions)
        .where(eq(posTransactions.tenantId, sessionTenantId))
        .orderBy(desc(posTransactions.serverReceivedAt))
        .limit(100);

      const mapped: PosTransaction[] = rows.map((r) => ({
        id: r.id,
        orderReference: r.orderReference,
        tenantId: r.tenantId,
        terminalId: r.terminalId,
        cashierId: r.staffId,
        cashierName: r.staffId,
        lines: r.lines as any,
        items: (r.lines as any) || [],
        subtotalMMK: r.subtotalMmk,
        discountMMK: r.discountMmk,
        totalDueMMK: r.totalDueMmk,
        paymentMethod: 'CASH',
        payments: r.payments as any,
        status: r.status as any,
        transactionStatus: (r.status as any) || 'COMPLETED',
        timestamp: r.clientCreatedAt ? r.clientCreatedAt.toISOString() : r.serverReceivedAt.toISOString(),
      }));

      return res.json({
        success: true,
        count: mapped.length,
        transactions: mapped,
      });
    } catch (err) {
      console.warn('[POS] Database transaction query failed:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database query failed.',
      });
    }
  }

  // Memory Demo fallback allowed only under DEMO_MODE and for demo slugs
  if (!isMemoryDemoAllowed() || !isDemoTenantSlug(sessionTenantId)) {
    return res.status(503).json({
      success: false,
      code: 'STORAGE_UNAVAILABLE',
      retryable: true,
      error: 'STORAGE_UNAVAILABLE: Database connection is not configured.',
    });
  }

  // Demo fallback
  const filtered = serverTransactions.filter((tx) => tx.tenantId === sessionTenantId);
  return res.json({
    success: true,
    count: filtered.length,
    transactions: filtered.slice(0, 100),
  });
});

/**
 * POST /api/pos/transactions
 * Ingest single or bulk transactions with server-side validation and idempotency.
 */
posRouter.post('/api/pos/transactions', async (req: Request, res: Response) => {
  const sessionTenantId = res.locals.tenantId as string;
  const payload = req.body;
  const isArray = Array.isArray(payload);
  const items: PosTransaction[] = isArray ? payload : [payload];

  if (items.length === 0) {
    return res.status(400).json({ success: false, error: 'Empty transaction payload.' });
  }

  // 1. Validate tenant consistency across all items
  for (const tx of items) {
    if (tx.tenantId && tx.tenantId !== sessionTenantId) {
      return res.status(400).json({
        success: false,
        code: 'TENANT_MISMATCH',
        error: `TENANT_MISMATCH: Payload tenantId (${tx.tenantId}) does not match session tenant (${sessionTenantId})`,
      });
    }
  }

  // 2. Validate line items and recompute total server-side
  for (const tx of items) {
    if (!tx.id || typeof tx.id !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid transaction ID.' });
    }
    const lines = (tx.lines || tx.items) as any[];
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'LINES_EMPTY',
        error: 'LINES_EMPTY: Transaction must contain at least one line item.',
      });
    }

    let computedSubtotal = 0;
    for (const line of lines) {
      const qty = Math.round(Number(line.quantity));
      const price = Math.round(Number(line.unitPriceMMK));
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_LINE_ITEM',
          error: 'INVALID_LINE_ITEM: Line quantity must be positive and price non-negative integer MMK.',
        });
      }
      computedSubtotal += qty * price;
    }

    const discount = typeof tx.discountMMK === 'number' && !isNaN(tx.discountMMK) ? Math.round(tx.discountMMK) : 0;
    const computedTotalDue = Math.max(0, computedSubtotal - discount);

    if (Math.round(tx.totalDueMMK) !== computedTotalDue) {
      return res.status(400).json({
        success: false,
        code: 'TOTAL_DUE_MISMATCH',
        error: `TOTAL_DUE_MISMATCH: Client totalDueMMK (${tx.totalDueMMK}) does not match server computed total (${computedTotalDue})`,
      });
    }
  }

  const db = getDb();
  const results: Array<{ id: string; duplicate: boolean; status: string }> = [];
  const ingested: PosTransaction[] = [];

  if (db) {
    try {
      for (const tx of items) {
        const targetId = tx.id;
        const lines = (tx.lines || tx.items) as any[];

        // Atomic insert: ON CONFLICT (tenant_id, id) DO NOTHING RETURNING id
        const inserted = await db
          .insert(posTransactions)
          .values({
            id: targetId,
            tenantId: sessionTenantId,
            terminalId: tx.terminalId || 'TERM-01',
            staffId: tx.cashierId || tx.cashierName || 'unknown',
            orderReference: tx.orderReference || `ORD-${Date.now()}`,
            lines: lines,
            subtotalMmk: Math.round(tx.subtotalMMK || tx.totalDueMMK),
            discountMmk: Math.round(tx.discountMMK || 0),
            totalDueMmk: Math.round(tx.totalDueMMK),
            payments: tx.payments || [
              {
                method: tx.paymentMethod || 'CASH',
                amountMMK: tx.totalDueMMK,
                status: 'COMPLETED',
              },
            ],
            status: tx.status || tx.transactionStatus || 'COMPLETED',
            clientCreatedAt: tx.timestamp ? new Date(tx.timestamp) : new Date(),
          })
          .onConflictDoNothing({ target: [posTransactions.tenantId, posTransactions.id] })
          .returning({ id: posTransactions.id });

        const isDuplicate = inserted.length === 0;
        if (!isDuplicate) {
          ingested.push(tx);
        }

        results.push({
          id: targetId,
          duplicate: isDuplicate,
          status: isDuplicate ? 'already_persisted' : 'persisted',
        });
      }
    } catch (err) {
      console.error('[POS] Failed to persist transaction row:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database transaction write failed.',
      });
    }
  } else {
    // In-memory demo fallback allowed ONLY under DEMO_MODE for demo slugs
    if (!isMemoryDemoAllowed() || !isDemoTenantSlug(sessionTenantId)) {
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database connection is not configured.',
      });
    }

    for (const tx of items) {
      const targetId = tx.id;
      const exists = serverTransactions.some((t) => t.id === targetId && t.tenantId === sessionTenantId);
      if (exists) {
        results.push({
          id: targetId,
          duplicate: true,
          status: 'already_persisted',
        });
      } else {
        serverTransactions.unshift({ ...tx, tenantId: sessionTenantId });
        ingested.push(tx);
        results.push({
          id: targetId,
          duplicate: false,
          status: 'persisted',
        });
      }
    }
  }

  // Broadcast real-time SSE event for newly ingested transactions
  if (ingested.length > 0) {
    broadcastStudioEvent({
      id: `evt-pos-${Date.now()}`,
      tenantId: sessionTenantId,
      type: 'POS_TRANSACTION_SETTLED',
      payload: {
        count: ingested.length,
        lastOrderReference: ingested[0].orderReference,
        totalAmountMMK: ingested.reduce((sum, it) => sum + it.totalDueMMK, 0),
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (!isArray) {
    const singleResult = results[0];
    const statusCode = singleResult.duplicate ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      duplicate: singleResult.duplicate,
      message: singleResult.duplicate ? 'Transaction already persisted.' : 'Transaction persisted successfully.',
      ingestedCount: singleResult.duplicate ? 0 : 1,
      transaction: items[0],
    });
  }

  return res.status(201).json({
    success: true,
    message: `Processed ${items.length} transaction(s). Ingested: ${ingested.length}.`,
    ingestedCount: ingested.length,
    results,
  });
});

/**
 * POST /api/pos/shifts
 * Ingest shift closure / Z-Report with deduplication and manager override verification.
 */
posRouter.post('/api/pos/shifts', async (req: Request, res: Response) => {
  const sessionTenantId = res.locals.tenantId as string;
  const report = req.body as PosZReport;

  if (!report.reportId || !report.terminalId) {
    return res.status(400).json({ success: false, error: 'Invalid shift report payload.' });
  }

  // Manager Override Verification: check if cash drop > 50,000 MMK without manager authority
  const cashRecon = report.cashReconciliation;
  const hasLargeCashDrop =
    (typeof cashRecon?.totalCashDropsMMK === 'number' && cashRecon.totalCashDropsMMK > 50000) ||
    (Array.isArray(report.cashMovements) && report.cashMovements.some((m) => m.type === 'CASH_DROP' && m.amountMMK > 50000));

  if (hasLargeCashDrop) {
    const overrideHeader = req.headers['x-manager-override'] as string;
    if (!overrideHeader) {
      return res.status(403).json({
        success: false,
        code: 'OVERRIDE_REQUIRED',
        error: 'OVERRIDE_REQUIRED: Manager override token is required for cash drops exceeding 50,000 MMK.',
      });
    }
    const isValid = verifyAndConsumeOverrideToken(overrideHeader, sessionTenantId, 'CASH_DROP');
    if (!isValid) {
      return res.status(403).json({
        success: false,
        code: 'OVERRIDE_REQUIRED',
        error: 'OVERRIDE_REQUIRED: Manager override token for large cash drop is invalid or expired.',
      });
    }
  }

  const db = getDb();
  let isDuplicate = false;

  if (db) {
    try {
      // Atomic insert: ON CONFLICT (tenant_id, report_id) DO NOTHING RETURNING id
      const inserted = await db
        .insert(posShifts)
        .values({
          tenantId: sessionTenantId,
          shiftId: report.shiftId,
          reportId: report.reportId,
          terminalId: report.terminalId,
          staffName: report.staffName,
          status: report.status || 'CLOSED',
          openedAt: report.openedAt ? new Date(report.openedAt) : new Date(),
          closedAt: report.closedAt ? new Date(report.closedAt) : new Date(),
          startingFloatMmk: Math.round(cashRecon?.startingCashMMK || 0),
          cashSalesMmk: Math.round(cashRecon?.cashSalesMMK || 0),
          expectedCashMmk: Math.round(cashRecon?.expectedCashMMK || 0),
          actualCountedCashMmk: cashRecon?.actualCountedCashMMK ? Math.round(cashRecon.actualCountedCashMMK) : null,
          discrepancyMmk: Math.round(cashRecon?.discrepancyMMK || 0),
          discrepancyType: cashRecon?.discrepancyType,
          zReportSnapshot: report,
        })
        .onConflictDoNothing({ target: [posShifts.tenantId, posShifts.reportId] })
        .returning({ id: posShifts.id });

      if (inserted.length === 0) {
        isDuplicate = true;
      }
    } catch (err) {
      console.error('[POS] Failed to persist shift row:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database shift write failed.',
      });
    }
  } else {
    // In-memory demo fallback allowed ONLY under DEMO_MODE for demo slugs
    if (!isMemoryDemoAllowed() || !isDemoTenantSlug(sessionTenantId)) {
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database connection is not configured.',
      });
    }

    const exists = serverZReports.some((r) => r.reportId === report.reportId && r.tenantId === sessionTenantId);
    if (exists) {
      isDuplicate = true;
    } else {
      serverZReports.unshift({ ...report, tenantId: sessionTenantId });
    }
  }

  if (isDuplicate) {
    return res.status(200).json({
      success: true,
      duplicate: true,
      message: 'Shift Z-Report already recorded.',
      reportId: report.reportId,
    });
  }

  broadcastStudioEvent({
    id: `evt-shift-${Date.now()}`,
    tenantId: sessionTenantId,
    type: 'NOTE_UPDATED',
    payload: {
      reportId: report.reportId,
      terminalId: report.terminalId,
      staffName: report.staffName,
      netSalesMMK: report.netSalesMMK,
    },
    timestamp: new Date().toISOString(),
  });

  return res.status(201).json({
    success: true,
    duplicate: false,
    message: 'Shift Z-Report recorded successfully.',
    reportId: report.reportId,
  });
});

// ----------------------------------------------------------------------------
// SERVER-SIDE POS STAFF AUTHENTICATION & PIN MANAGEMENT (FIXES F5)
// ----------------------------------------------------------------------------

/**
 * GET /api/pos/staff
 * Retrieve active staff list for the authenticated session tenant (NEVER exposes PINs or hashes).
 */
posRouter.get('/api/pos/staff', async (req: Request, res: Response) => {
  const sessionTenantId = res.locals.tenantId as string;
  const db = getDb();

  if (db) {
    try {
      const rows = await db
        .select()
        .from(posStaff)
        .where(and(eq(posStaff.tenantId, sessionTenantId), eq(posStaff.isActive, true)));

      const staffList: PosStaffMember[] = rows.map((r) => {
        const isLocked = r.lockedUntil ? new Date(r.lockedUntil) > new Date() : false;
        return {
          id: r.id,
          name: r.name,
          myanmarName: r.myanmarName || undefined,
          role: r.role as PosStaffRole,
          // FIX R8: NEVER expose badgeBarcodeHash or badgeBarcode to client
          avatarColor: r.avatarColor || '#38BDF8',
          isActive: r.isActive,
          isLocked,
        };
      });

      return res.json({ success: true, staff: staffList });
    } catch (err) {
      console.error('[Staff] Database staff query failed:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database staff query failed.',
      });
    }
  }

  // Memory Demo fallback allowed only under DEMO_MODE for demo slugs
  if (!isMemoryDemoAllowed() || !isDemoTenantSlug(sessionTenantId)) {
    return res.status(503).json({
      success: false,
      code: 'STORAGE_UNAVAILABLE',
      retryable: true,
      error: 'STORAGE_UNAVAILABLE: Database connection is not configured.',
    });
  }

  // Demo fallback staff (NEVER exposes PINs or badge barcode hashes to client)
  const demoList = getDemoStaffForTenant(sessionTenantId).map((s) => ({
    id: s.id,
    name: s.name,
    myanmarName: s.myanmarName,
    role: s.role,
    avatarColor: s.avatarColor,
    isActive: s.isActive,
    isLocked: s.lockedUntil ? new Date(s.lockedUntil) > new Date() : false,
  }));

  return res.json({ success: true, staff: demoList });
});

/**
 * POST /api/pos/staff/verify-pin
 * Server-side PIN verification with 5-failure 5-minute lockout.
 */
posRouter.post('/api/pos/staff/verify-pin', async (req: Request, res: Response) => {
  const sessionTenantId = res.locals.tenantId as string;
  const { pin, staffId, badgeBarcode } = req.body || {};

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ success: false, error: 'PIN is required.' });
  }

  const cleanPin = pin.trim();
  const db = getDb();

  if (db) {
    try {
      // Find candidate staff row in DB
      let candidateQuery = db.select().from(posStaff).where(eq(posStaff.tenantId, sessionTenantId));
      const allStaff = await candidateQuery;
      let matchedStaff = staffId ? allStaff.find((s) => s.id === staffId && s.isActive) : null;

      if (!matchedStaff && badgeBarcode) {
        // Hash scanned barcode server-side and compare (Fixes R8)
        const scannedHash = hashSha256(badgeBarcode.trim().toUpperCase());
        matchedStaff = allStaff.find((s) => s.badgeBarcodeHash === scannedHash && s.isActive);
      }

      if (!matchedStaff && !staffId && !badgeBarcode) {
        // Global search across active staff in this tenant
        for (const s of allStaff) {
          if (!s.isActive) continue;
          if (s.lockedUntil && new Date(s.lockedUntil) > new Date()) continue;
          const isMatch = await verifyWithScrypt(cleanPin, s.pinHash);
          if (isMatch) {
            matchedStaff = s;
            break;
          }
        }
      }

      // With DB configured: not found in DB means NOT FOUND. Return 401. Never fall through to demo!
      if (!matchedStaff) {
        return res.status(401).json({ success: false, code: 'INVALID_PIN', error: 'Incorrect PIN.' });
      }

      // Check lockout
      if (matchedStaff.lockedUntil && new Date(matchedStaff.lockedUntil) > new Date()) {
        return res.status(423).json({
          success: false,
          code: 'STAFF_LOCKED',
          isLocked: true,
          error: 'Staff account is locked due to too many failed attempts. Please wait 5 minutes.',
          lockedUntil: matchedStaff.lockedUntil,
        });
      }

      const isPinCorrect = await verifyWithScrypt(cleanPin, matchedStaff.pinHash);

      if (isPinCorrect) {
        // Reset failed attempts
        await db
          .update(posStaff)
          .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
          .where(eq(posStaff.id, matchedStaff.id));

        return res.json({
          success: true,
          staff: {
            id: matchedStaff.id,
            name: matchedStaff.name,
            myanmarName: matchedStaff.myanmarName || undefined,
            role: matchedStaff.role as PosStaffRole,
            avatarColor: matchedStaff.avatarColor || '#38BDF8',
          },
        });
      } else {
        // Increment failed attempts
        const attempts = (matchedStaff.failedAttempts || 0) + 1;
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 5 * 60 * 1000) : null;

        await db
          .update(posStaff)
          .set({ failedAttempts: attempts, lockedUntil, updatedAt: new Date() })
          .where(eq(posStaff.id, matchedStaff.id));

        const isLocked = attempts >= 5;
        return res.status(isLocked ? 423 : 401).json({
          success: false,
          code: isLocked ? 'STAFF_LOCKED' : 'INVALID_PIN',
          error: isLocked ? 'Account locked for 5 minutes due to 5 failed attempts.' : 'Incorrect PIN.',
          failedAttempts: attempts,
          isLocked,
        });
      }
    } catch (err) {
      console.error('[Staff] DB PIN verification failed:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database PIN verification failed.',
      });
    }
  }

  // Memory Demo fallback verification
  if (!isMemoryDemoAllowed() || !isDemoTenantSlug(sessionTenantId)) {
    return res.status(503).json({
      success: false,
      code: 'STORAGE_UNAVAILABLE',
      retryable: true,
      error: 'STORAGE_UNAVAILABLE: Database connection is not configured.',
    });
  }

  const demoList = getDemoStaffForTenant(sessionTenantId);
  let targetStaff = staffId ? demoList.find((s) => s.id === staffId && s.isActive) : null;

  if (!targetStaff && badgeBarcode) {
    targetStaff = demoList.find((s) => s.badgeBarcode === badgeBarcode && s.isActive);
  }

  if (!targetStaff && !staffId && !badgeBarcode) {
    targetStaff = demoList.find((s) => s.pin === cleanPin && s.isActive) || null;
  }

  if (!targetStaff) {
    return res.status(401).json({ success: false, code: 'INVALID_PIN', error: 'Incorrect PIN.' });
  }

  // Check lockout on demo staff
  if (targetStaff.lockedUntil && new Date(targetStaff.lockedUntil) > new Date()) {
    return res.status(423).json({
      success: false,
      code: 'STAFF_LOCKED',
      isLocked: true,
      error: 'Staff account is locked due to too many failed attempts. Please wait 5 minutes.',
      lockedUntil: targetStaff.lockedUntil,
    });
  }

  if (targetStaff.pin === cleanPin) {
    targetStaff.failedAttempts = 0;
    targetStaff.lockedUntil = null;
    return res.json({
      success: true,
      staff: {
        id: targetStaff.id,
        name: targetStaff.name,
        myanmarName: targetStaff.myanmarName,
        role: targetStaff.role,
        avatarColor: targetStaff.avatarColor,
      },
    });
  } else {
    targetStaff.failedAttempts += 1;
    const isLocked = targetStaff.failedAttempts >= 5;
    if (isLocked) {
      targetStaff.lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    }
    return res.status(isLocked ? 423 : 401).json({
      success: false,
      code: isLocked ? 'STAFF_LOCKED' : 'INVALID_PIN',
      error: isLocked ? 'Account locked for 5 minutes.' : 'Incorrect PIN.',
      failedAttempts: targetStaff.failedAttempts,
      isLocked,
    });
  }
});

/**
 * POST /api/pos/staff/manager-override
 * Server-side manager override authorization issuing single-use 2-minute token.
 */
posRouter.post('/api/pos/staff/manager-override', async (req: Request, res: Response) => {
  const sessionTenantId = res.locals.tenantId as string;
  const { pin, action } = req.body || {};

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ success: false, error: 'Manager PIN is required.' });
  }

  const cleanPin = pin.trim();
  const db = getDb();

  if (db) {
    try {
      const rows = await db
        .select()
        .from(posStaff)
        .where(and(eq(posStaff.tenantId, sessionTenantId), eq(posStaff.isActive, true)));

      let managerStaff: { id: string; name: string; role: PosStaffRole } | null = null;
      for (const s of rows) {
        if (s.role !== 'STUDIO_MANAGER' && s.role !== 'OWNER') continue;
        if (s.lockedUntil && new Date(s.lockedUntil) > new Date()) continue;
        const isMatch = await verifyWithScrypt(cleanPin, s.pinHash);
        if (isMatch) {
          managerStaff = { id: s.id, name: s.name, role: s.role as PosStaffRole };
          break;
        }
      }

      // With DB configured: no match in DB means 401 Unauthorized. Never fall through to demo!
      if (!managerStaff) {
        return res.status(401).json({
          success: false,
          authorized: false,
          error: 'Invalid manager PIN or insufficient role permissions.',
        });
      }

      const overrideToken = createManagerOverrideToken(sessionTenantId, managerStaff.id, action || 'MANAGER_OVERRIDE');
      return res.json({
        success: true,
        authorized: true,
        overrideToken,
        manager: managerStaff,
      });
    } catch (err) {
      console.error('[Staff] DB override verification failed:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database override verification failed.',
      });
    }
  }

  // Memory Demo fallback
  if (!isMemoryDemoAllowed() || !isDemoTenantSlug(sessionTenantId)) {
    return res.status(503).json({
      success: false,
      code: 'STORAGE_UNAVAILABLE',
      retryable: true,
      error: 'STORAGE_UNAVAILABLE: Database connection is not configured.',
    });
  }

  const demoList = getDemoStaffForTenant(sessionTenantId);
  const demoMatch = demoList.find(
    (s) => (s.role === 'STUDIO_MANAGER' || s.role === 'OWNER') && s.pin === cleanPin && s.isActive
  );
  if (!demoMatch) {
    return res.status(401).json({
      success: false,
      authorized: false,
      error: 'Invalid manager PIN or insufficient role permissions.',
    });
  }

  const managerStaff = { id: demoMatch.id, name: demoMatch.name, role: demoMatch.role };
  const overrideToken = createManagerOverrideToken(sessionTenantId, managerStaff.id, action || 'MANAGER_OVERRIDE');

  return res.json({
    success: true,
    authorized: true,
    overrideToken,
    manager: managerStaff,
  });
});

/**
 * POST /api/pos/staff (Create new staff member)
 */
posRouter.post('/api/pos/staff', async (req: Request, res: Response) => {
  const sessionTenantId = res.locals.tenantId as string;
  const { name, myanmarName, role, pin, avatarColor } = req.body || {};

  if (!name || !pin || !role) {
    return res.status(400).json({ success: false, error: 'Name, role, and 4-digit PIN are required.' });
  }

  const staffId = `stf-${Date.now().toString(36)}`;
  const pinHash = await hashWithScrypt(pin.trim());
  const db = getDb();

  if (db) {
    try {
      await db.insert(posStaff).values({
        id: staffId,
        tenantId: sessionTenantId,
        name,
        myanmarName,
        role,
        pinHash,
        avatarColor: avatarColor || '#38BDF8',
        isActive: true,
      });

      return res.status(201).json({
        success: true,
        staff: { id: staffId, name, myanmarName, role, avatarColor },
      });
    } catch (err) {
      console.error('[Staff] Failed to insert staff:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Failed to persist new staff member to database.',
      });
    }
  }

  // Demo store
  if (!isMemoryDemoAllowed() || !isDemoTenantSlug(sessionTenantId)) {
    return res.status(503).json({
      success: false,
      code: 'STORAGE_UNAVAILABLE',
      retryable: true,
      error: 'STORAGE_UNAVAILABLE: Database connection is not configured.',
    });
  }

  const list = getDemoStaffForTenant(sessionTenantId);
  list.push({
    id: staffId,
    tenantId: sessionTenantId,
    name,
    myanmarName: myanmarName || '',
    role,
    pin: pin.trim(),
    badgeBarcode: `STAFF-${staffId}`,
    avatarColor: avatarColor || '#38BDF8',
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
  });

  return res.status(201).json({
    success: true,
    staff: { id: staffId, name, myanmarName, role, avatarColor },
  });
});

/**
 * PATCH /api/pos/staff/:id (Update staff member, deactivate, or reset PIN)
 */
posRouter.patch('/api/pos/staff/:id', async (req: Request, res: Response) => {
  const sessionTenantId = res.locals.tenantId as string;
  const staffId = req.params.id;
  const { name, myanmarName, role, pin, isActive, avatarColor } = req.body || {};

  const db = getDb();
  if (db) {
    try {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (myanmarName !== undefined) updates.myanmarName = myanmarName;
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;
      if (avatarColor !== undefined) updates.avatarColor = avatarColor;
      if (pin) {
        updates.pinHash = await hashWithScrypt(pin.trim());
        updates.failedAttempts = 0;
        updates.lockedUntil = null;
      }

      await db
        .update(posStaff)
        .set(updates)
        .where(and(eq(posStaff.tenantId, sessionTenantId), eq(posStaff.id, staffId)));

      return res.json({ success: true, message: 'Staff member updated successfully.' });
    } catch (err) {
      console.error('[Staff] Failed to update staff in db:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Failed to update staff member in database.',
      });
    }
  }

  // Demo fallback
  if (!isMemoryDemoAllowed() || !isDemoTenantSlug(sessionTenantId)) {
    return res.status(503).json({
      success: false,
      code: 'STORAGE_UNAVAILABLE',
      retryable: true,
      error: 'STORAGE_UNAVAILABLE: Database connection is not configured.',
    });
  }

  const list = getDemoStaffForTenant(sessionTenantId);
  const found = list.find((s) => s.id === staffId);
  if (!found) {
    return res.status(404).json({ success: false, error: 'Staff member not found.' });
  }

  if (name !== undefined) found.name = name;
  if (myanmarName !== undefined) found.myanmarName = myanmarName;
  if (role !== undefined) found.role = role;
  if (isActive !== undefined) found.isActive = isActive;
  if (avatarColor !== undefined) found.avatarColor = avatarColor;
  if (pin) {
    found.pin = pin.trim();
    found.failedAttempts = 0;
    found.lockedUntil = null;
  }

  return res.json({ success: true, message: 'Staff member updated successfully.' });
});
