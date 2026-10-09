import crypto from 'crypto';
import { getDb } from '../../db/index.js';
import {
  productionStudios,
  adminUsers,
  posStaff,
  customerBookings,
  bookingEvents,
  posTransactions,
  posShifts,
  demoLeads,
  demoActivity,
  demoSandboxes,
  verifiedSlips,
} from '../../db/schema/index.js';
import { eq, and, desc, sql, lt, ne, asc } from 'drizzle-orm';
import { hashWithScrypt } from '../utils/crypto.js';
import { isMemoryDemoAllowed } from '../utils/storageMode.js';
import { INITIAL_CLIENT_PRODUCTS } from '../../data/clientProductsData.js';

// ----------------------------------------------------------------------------
// PHONE NORMALIZATION
// ----------------------------------------------------------------------------
export function normalizeMyanmarPhone(raw: string): string {
  if (!raw) return '';
  // Remove non-digit characters except leading plus
  let cleaned = raw.trim().replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+959')) {
    return cleaned;
  }
  if (cleaned.startsWith('09')) {
    return '+959' + cleaned.substring(2);
  }
  if (cleaned.startsWith('959')) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('9')) {
    return '+959' + cleaned.substring(1);
  }
  return cleaned;
}

// ----------------------------------------------------------------------------
// IN-MEMORY FALLBACK STORES (For test suites running without live Postgres)
// ----------------------------------------------------------------------------
interface InMemoryLead {
  id: string;
  name: string;
  phone: string;
  studioName: string;
  city?: string;
  contactHandle?: string;
  preferredChannel?: string;
  consent: boolean;
  consentAt: Date;
  firstSeenAt: Date;
  lastSeenAt: Date;
  visitCount: number;
  source?: string;
  userAgent?: string;
}

interface InMemoryActivity {
  id: string;
  leadId: string;
  sandboxId: string;
  event: string;
  createdAt: Date;
}

const memoryLeads = new Map<string, InMemoryLead>(); // phone -> lead
const memoryActivity: InMemoryActivity[] = [];
const memorySandboxToLeadId = new Map<string, string>(); // sandboxId -> leadId
const memoryLeadToSandboxId = new Map<string, string>(); // leadId -> sandboxId
const memorySandboxes = new Map<
  string,
  {
    studioName: string;
    createdAt: Date;
    lastActiveAt: Date;
    seedMetrics?: {
      revenue30Days: number;
      todayBookingsCount: number;
      closedShiftsCount: number;
    };
  }
>();

// ----------------------------------------------------------------------------
// DETERMINISTIC SEED RANDOM
// ----------------------------------------------------------------------------
function createSeededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ----------------------------------------------------------------------------
// PART C: DEMO LEADS & ACTIVITY MANAGEMENT
// ----------------------------------------------------------------------------
export interface DemoSignupInput {
  name: string;
  phone: string;
  studioName: string;
  city?: string;
  contactHandle?: string;
  preferredChannel?: string;
  consent?: boolean;
  source?: string;
  userAgent?: string;
}

export async function recordDemoLead(input: DemoSignupInput): Promise<{ lead: InMemoryLead; isNew: boolean }> {
  const normalizedPhone = normalizeMyanmarPhone(input.phone);
  const db = getDb();
  const now = new Date();

  if (db) {
    try {
      const existing = await db
        .select()
        .from(demoLeads)
        .where(eq(demoLeads.phone, normalizedPhone))
        .limit(1);

      if (existing.length > 0) {
        const leadRow = existing[0];
        const updatedVisitCount = (leadRow.visitCount || 1) + 1;
        await db
          .update(demoLeads)
          .set({
            name: input.name.trim(),
            studioName: input.studioName.trim(),
            city: input.city?.trim() || leadRow.city,
            contactHandle: input.contactHandle?.trim() || leadRow.contactHandle,
            preferredChannel: input.preferredChannel?.trim() || leadRow.preferredChannel,
            lastSeenAt: now,
            visitCount: updatedVisitCount,
          })
          .where(eq(demoLeads.id, leadRow.id));

        const updated: InMemoryLead = {
          id: leadRow.id,
          name: input.name.trim(),
          phone: normalizedPhone,
          studioName: input.studioName.trim(),
          city: input.city?.trim() || leadRow.city || undefined,
          contactHandle: input.contactHandle?.trim() || leadRow.contactHandle || undefined,
          preferredChannel: input.preferredChannel?.trim() || leadRow.preferredChannel || undefined,
          consent: leadRow.consent,
          consentAt: leadRow.consentAt,
          firstSeenAt: leadRow.firstSeenAt,
          lastSeenAt: now,
          visitCount: updatedVisitCount,
          source: leadRow.source || undefined,
          userAgent: leadRow.userAgent || undefined,
        };
        return { lead: updated, isNew: false };
      } else {
        const newId = crypto.randomUUID();
        await db.insert(demoLeads).values({
          id: newId,
          name: input.name.trim(),
          phone: normalizedPhone,
          studioName: input.studioName.trim(),
          city: input.city?.trim() || null,
          contactHandle: input.contactHandle?.trim() || null,
          preferredChannel: input.preferredChannel?.trim() || null,
          consent: input.consent !== false,
          consentAt: now,
          firstSeenAt: now,
          lastSeenAt: now,
          visitCount: 1,
          source: input.source?.trim() || 'showroom',
          userAgent: input.userAgent?.trim() || null,
        });

        const created: InMemoryLead = {
          id: newId,
          name: input.name.trim(),
          phone: normalizedPhone,
          studioName: input.studioName.trim(),
          city: input.city?.trim(),
          contactHandle: input.contactHandle?.trim(),
          preferredChannel: input.preferredChannel?.trim(),
          consent: input.consent !== false,
          consentAt: now,
          firstSeenAt: now,
          lastSeenAt: now,
          visitCount: 1,
          source: input.source?.trim() || 'showroom',
          userAgent: input.userAgent?.trim(),
        };
        return { lead: created, isNew: true };
      }
    } catch (err) {
      console.error('[Demo] Database lead record error, falling back to memory:', err);
    }
  }

  // In-memory fallback
  const existingMemory = memoryLeads.get(normalizedPhone);
  if (existingMemory) {
    existingMemory.visitCount += 1;
    existingMemory.lastSeenAt = now;
    existingMemory.name = input.name.trim();
    existingMemory.studioName = input.studioName.trim();
    if (input.city) existingMemory.city = input.city.trim();
    return { lead: existingMemory, isNew: false };
  }

  const newLead: InMemoryLead = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    phone: normalizedPhone,
    studioName: input.studioName.trim(),
    city: input.city?.trim(),
    contactHandle: input.contactHandle?.trim(),
    preferredChannel: input.preferredChannel?.trim(),
    consent: input.consent !== false,
    consentAt: now,
    firstSeenAt: now,
    lastSeenAt: now,
    visitCount: 1,
    source: input.source?.trim() || 'showroom',
    userAgent: input.userAgent?.trim(),
  };
  memoryLeads.set(normalizedPhone, newLead);
  return { lead: newLead, isNew: true };
}

export async function recordDemoActivity(leadId: string, sandboxId: string, event: string): Promise<void> {
  const now = new Date();
  const db = getDb();

  if (db) {
    try {
      await db.insert(demoActivity).values({
        id: crypto.randomUUID(),
        leadId,
        sandboxId,
        event,
        createdAt: now,
      });
      await db
        .update(demoSandboxes)
        .set({ lastActiveAt: now })
        .where(eq(demoSandboxes.sandboxId, sandboxId))
        .catch(() => {});
    } catch (err) {
      console.warn('[Demo Activity] Failed to write activity row to database:', err);
    }
  } else {
    // Keep track in memory strictly when offline
    memorySandboxToLeadId.set(sandboxId, leadId);
    memoryActivity.push({
      id: crypto.randomUUID(),
      leadId,
      sandboxId,
      event,
      createdAt: now,
    });
  }
}

export async function recordDemoActivityBySandbox(sandboxId: string, event: string): Promise<void> {
  const db = getDb();
  let leadId: string | null = null;
  if (db) {
    try {
      const box = await db
        .select({ leadId: demoSandboxes.leadId })
        .from(demoSandboxes)
        .where(eq(demoSandboxes.sandboxId, sandboxId))
        .limit(1);
      if (box.length > 0 && box[0].leadId) {
        leadId = box[0].leadId;
      }
    } catch {}
  } else {
    leadId = memorySandboxToLeadId.get(sandboxId) || null;
  }
  if (leadId) {
    await recordDemoActivity(leadId, sandboxId, event);
  }
}

// ----------------------------------------------------------------------------
// PART B: LIVED-IN DATA SEEDING (30 Days History + Today + 14 Days Ahead)
// ----------------------------------------------------------------------------
export interface DemoStaffPreset {
  id: string;
  name: string;
  myanmarName: string;
  role: 'OWNER' | 'STUDIO_MANAGER' | 'LEAD_CASHIER' | 'CASHIER';
  pin: string;
  badgeBarcode: string;
  avatarColor: string;
}

export const DEMO_DEFAULT_STAFF_PRESETS: DemoStaffPreset[] = [
  {
    id: 'stf-demo-owner',
    name: 'Ko Min Thu',
    myanmarName: 'ကိုမင်းသူ (ဆိုင်ရှင်)',
    role: 'OWNER',
    pin: '1111',
    badgeBarcode: 'STAFF-DEMO-01',
    avatarColor: '#10B981',
  },
  {
    id: 'stf-demo-mgr',
    name: 'Ma Su Mon',
    myanmarName: 'မစုမွန် (မန်နေဂျာ)',
    role: 'STUDIO_MANAGER',
    pin: '2222',
    badgeBarcode: 'STAFF-DEMO-02',
    avatarColor: '#F59E0B',
  },
  {
    id: 'stf-demo-lead',
    name: 'Ko Zaw',
    myanmarName: 'ကိုဇော် (ခေါင်းဆောင်)',
    role: 'LEAD_CASHIER',
    pin: '3333',
    badgeBarcode: 'STAFF-DEMO-03',
    avatarColor: '#A855F7',
  },
  {
    id: 'stf-demo-cashier',
    name: 'Ma Hnin',
    myanmarName: 'မနှင်း (ငွေကိုင်)',
    role: 'CASHIER',
    pin: '4444',
    badgeBarcode: 'STAFF-DEMO-04',
    avatarColor: '#38BDF8',
  },
];

const PACKAGES_SEED = [
  { id: 'pkg-wedding', name: 'Wedding Pre-shoot Luxury', price: 650000, deposit: 300000, space: 'BAY ALPHA-01' },
  { id: 'pkg-grad', name: 'Graduation Masterpiece', price: 250000, deposit: 100000, space: 'BAY BRAVO-02' },
  { id: 'pkg-family', name: 'Family Portrait Royale', price: 350000, deposit: 150000, space: 'BAY CHARLIE-03' },
  { id: 'pkg-newborn', name: 'Newborn Baby Atelier', price: 200000, deposit: 100000, space: 'BAY ALPHA-01' },
  { id: 'pkg-express', name: 'Indoor Portrait Express', price: 150000, deposit: 75000, space: 'BAY BRAVO-02' },
];

const CUSTOMER_NAMES_SEED = [
  'Ma Thida', 'Ko Aung Kyaw', 'Daw Thin Thin', 'U Myo Naung',
  'Ma Htet Htet', 'Ko Zin Min', 'Daw Khin Mar', 'U Thein Win',
  'Ma Nilar', 'Ko Pyae Sone', 'Ma May Thu', 'Ko Nay Lin',
  'Daw Aye Aye', 'Ko Min Han', 'Ma Sandar', 'Ko Kyaw Swar'
];

export interface SeedMetrics {
  revenue30Days: number;
  todayBookingsCount: number;
  closedShiftsCount: number;
}

export async function seedSandboxData(tenantId: string, studioName: string): Promise<SeedMetrics> {
  const db = getDb();
  const rng = createSeededRandom(tenantId);
  const now = new Date();

  // 1. Hash and provision staff
  const hashedStaff = await Promise.all(
    DEMO_DEFAULT_STAFF_PRESETS.map(async (st) => ({
      id: `${tenantId}-${st.id}`,
      tenantId,
      name: st.name,
      myanmarName: st.myanmarName,
      role: st.role,
      pinHash: await hashWithScrypt(st.pin),
      badgeBarcode: `${st.badgeBarcode}-${tenantId.slice(-4).toUpperCase()}`,
      avatarColor: st.avatarColor,
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
    }))
  );

  // 2. Hash and provision studio admin user
  const adminPasswordHash = await hashWithScrypt('DemoAdmin2026!');

  // Generate 30 days of past bookings + today + 14 days ahead
  const bookingsToInsert: any[] = [];
  const eventsToInsert: any[] = [];
  const posTxToInsert: any[] = [];
  const shiftsToInsert: any[] = [];

  let refCounter = 1001;

  // Day loop: from -30 to +14
  for (let offset = -30; offset <= 14; offset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + offset);
    const dateStr = targetDate.toISOString().slice(0, 10);
    const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    // Number of bookings on this day
    const bookingCount = isWeekend ? Math.floor(rng() * 3) + 2 : Math.floor(rng() * 2) + 1;

    for (let b = 0; b < bookingCount; b++) {
      const pkg = PACKAGES_SEED[Math.floor(rng() * PACKAGES_SEED.length)];
      const custName = CUSTOMER_NAMES_SEED[Math.floor(rng() * CUSTOMER_NAMES_SEED.length)];
      const ref = `BK-${tenantId.slice(-4).toUpperCase()}-${refCounter++}`;
      const timeSlots = ['09:30 AM', '11:30 AM', '02:00 PM', '04:30 PM'];
      const slot = timeSlots[b % timeSlots.length];

      let bookingStatus = 'CONFIRMED';
      let paymentStatus = 'VERIFIED';
      let verifiedPaid = pkg.deposit;
      let outstanding = pkg.price - pkg.deposit;

      if (offset < -1) {
        // Past days: mostly completed
        const roll = rng();
        if (roll < 0.8) {
          bookingStatus = 'COMPLETED';
          verifiedPaid = pkg.price;
          outstanding = 0;
        } else if (roll < 0.9) {
          bookingStatus = 'CONFIRMED';
        } else {
          bookingStatus = 'CANCELLED';
        }
      } else if (offset === 0) {
        // TODAY: alive and busy
        if (b === 0) {
          bookingStatus = 'IN_PROGRESS';
        } else if (b === 1) {
          bookingStatus = 'CONFIRMED';
        } else {
          bookingStatus = 'AWAITING_PAYMENT_REVIEW';
          paymentStatus = 'EVIDENCE_RECEIVED';
          verifiedPaid = 0;
          outstanding = pkg.price;
        }
      } else {
        // Future days: confirmed or awaiting review
        if (rng() < 0.8) {
          bookingStatus = 'CONFIRMED';
        } else {
          bookingStatus = 'AWAITING_PAYMENT_REVIEW';
          verifiedPaid = 0;
          outstanding = pkg.price;
        }
      }

      const bookingId = crypto.randomUUID();
      bookingsToInsert.push({
        id: bookingId,
        bookingReference: ref,
        tenantId,
        idempotencyKey: `idemp-${tenantId}-${ref}`,
        customerName: custName,
        customerPhone: `+959${Math.floor(250000000 + rng() * 700000000)}`,
        packageSnapshot: { id: pkg.id, name: pkg.name, price: pkg.price, deposit: pkg.deposit },
        spaceSnapshot: { id: pkg.space.toLowerCase(), name: pkg.space },
        startDate: dateStr,
        timeSlot: slot,
        totalAmount: pkg.price,
        depositAmount: pkg.deposit,
        verifiedPaidAmount: verifiedPaid,
        outstandingBalance: outstanding,
        currency: 'MMK',
        bookingStatus,
        paymentStatus,
        paymentMethod: rng() > 0.5 ? 'KBZPay' : 'WavePay',
        sourceChannel: 'WEB_CUSTOMER_PORTAL',
        createdAt: targetDate,
        updatedAt: targetDate,
      });

      eventsToInsert.push({
        id: crypto.randomUUID(),
        bookingId,
        tenantId,
        eventType: 'SUBMITTED',
        toStatus: bookingStatus,
        actorId: 'system',
        actorRole: 'SYSTEM',
        message: `Booking ${ref} submitted by ${custName}`,
        createdAt: targetDate,
      });
    }

    // POS Sales (for past days: offset <= 0)
    if (offset <= 0) {
      const salesCount = isWeekend ? Math.floor(rng() * 4) + 3 : Math.floor(rng() * 3) + 1;
      let dayCashTotal = 0;

      for (let s = 0; s < salesCount; s++) {
        const prod = INITIAL_CLIENT_PRODUCTS[Math.floor(rng() * INITIAL_CLIENT_PRODUCTS.length)];
        const qty = Math.floor(rng() * 2) + 1;
        const total = prod.priceMMK * qty;
        dayCashTotal += total;

        const txId = `tx-demo-${tenantId.slice(-4)}-${offset}-${s}`;
        posTxToInsert.push({
          id: txId,
          tenantId,
          terminalId: 'TERM-DEMO-01',
          staffId: hashedStaff[s % hashedStaff.length].id,
          orderReference: `ORD-${offset}-${s}`,
          lines: [{ title: prod.name, quantity: qty, unitPriceMMK: prod.priceMMK }],
          subtotalMmk: total,
          discountMmk: 0,
          totalDueMmk: total,
          payments: [{ method: 'CASH', amountMMK: total, status: 'COMPLETED' }],
          status: 'COMPLETED',
          clientCreatedAt: targetDate,
          serverReceivedAt: targetDate,
        });
      }

      // Past closed shift with Z-Report
      if (offset < 0) {
        // Inject one shortage at day -7 and one overage at day -14
        let discrepancyMmk = 0;
        let discrepancyType: 'BALANCED' | 'SHORTAGE' | 'OVERAGE' = 'BALANCED';
        if (offset === -7) {
          discrepancyMmk = -5000;
          discrepancyType = 'SHORTAGE';
        } else if (offset === -14) {
          discrepancyMmk = 2000;
          discrepancyType = 'OVERAGE';
        }

        const startingFloat = 100000;
        const expectedCash = startingFloat + dayCashTotal;
        const countedCash = expectedCash + discrepancyMmk;

        shiftsToInsert.push({
          id: crypto.randomUUID(),
          tenantId,
          shiftId: `SHIFT-${offset}`,
          reportId: `Z-REP-${offset}-${tenantId.slice(-4)}`,
          terminalId: 'TERM-DEMO-01',
          staffId: hashedStaff[1].id,
          staffName: hashedStaff[1].name,
          status: 'CLOSED',
          openedAt: targetDate,
          closedAt: new Date(targetDate.getTime() + 8 * 3600000),
          startingFloatMmk: startingFloat,
          cashSalesMmk: dayCashTotal,
          expectedCashMmk: expectedCash,
          actualCountedCashMmk: countedCash,
          discrepancyMmk,
          discrepancyType,
          cashMovements: [
            {
              id: `mv-${offset}-1`,
              type: 'CASH_DROP',
              amountMMK: 50000,
              reason: 'Shift safe drop',
              timestamp: targetDate.toISOString(),
            },
          ],
          zReportSnapshot: {
            studioName,
            startingFloat,
            cashSales: dayCashTotal,
            expectedCash,
            countedCash,
            discrepancy: discrepancyMmk,
          },
          createdAt: targetDate,
        });
      }
    }
  }

  // Database insertion if live
  if (db) {
    try {
      // 1. Upsert studio tenant in production_studios
      await db
        .insert(productionStudios)
        .values({
          slug: tenantId,
          displayName: studioName,
          status: 'APPROVED',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: productionStudios.slug,
          set: { displayName: studioName, updatedAt: now },
        });

      // 2. Admin user
      await db
        .insert(adminUsers)
        .values({
          tenantId,
          username: 'admin',
          passwordHash: adminPasswordHash,
          role: 'STUDIO_ADMIN',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [adminUsers.tenantId, adminUsers.username],
          set: { passwordHash: adminPasswordHash, updatedAt: now },
        });

      // 3. POS Staff
      for (const st of hashedStaff) {
        await db
          .insert(posStaff)
          .values(st)
          .onConflictDoUpdate({
            target: posStaff.id,
            set: { name: st.name, pinHash: st.pinHash, role: st.role },
          });
      }

      // 4. Batch Bookings
      for (const b of bookingsToInsert) {
        await db
          .insert(customerBookings)
          .values(b)
          .onConflictDoNothing();
      }

      // 5. Batch Events
      for (const ev of eventsToInsert) {
        await db
          .insert(bookingEvents)
          .values(ev)
          .onConflictDoNothing();
      }

      // 6. Batch POS Transactions
      for (const tx of posTxToInsert) {
        await db
          .insert(posTransactions)
          .values(tx)
          .onConflictDoNothing();
      }

      // 7. Batch Shifts
      for (const sh of shiftsToInsert) {
        await db
          .insert(posShifts)
          .values(sh)
          .onConflictDoNothing();
      }
    } catch (err) {
      console.error('[Demo Seed] Error writing live demo seed rows:', err);
    }
  }

  const revenue30Days =
    posTxToInsert.reduce((sum, tx) => sum + (tx.totalDueMmk || 0), 0) +
    bookingsToInsert
      .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
      .reduce((sum, b) => sum + (b.depositAmount || 0), 0);
  const todayStr = now.toISOString().slice(0, 10);
  const todayBookingsCount = bookingsToInsert.filter((b) => b.bookingDate === todayStr).length;
  const closedShiftsCount = shiftsToInsert.filter((s) => s.status === 'CLOSED').length;
  const seedMetrics: SeedMetrics = {
    revenue30Days: Number(revenue30Days) || 0,
    todayBookingsCount: Math.max(todayBookingsCount, 1),
    closedShiftsCount: Math.max(closedShiftsCount, 1),
  };

  if (!db) {
    memorySandboxes.set(tenantId, { studioName, createdAt: now, lastActiveAt: now, seedMetrics });
  }
  return seedMetrics;
}

// ----------------------------------------------------------------------------
// PROVISIONING OR RESTORING A VISITOR'S SANDBOX
// ----------------------------------------------------------------------------
export interface ProvisionResult {
  leadId: string;
  sandboxId: string;
  tenantSlug: string;
  studioName: string;
  adminCredentials: {
    username: string;
    password: string;
    role: string;
  };
  staffList: Array<{
    id: string;
    name: string;
    myanmarName: string;
    role: string;
    pin: string;
    badgeBarcode: string;
  }>;
  seedMetrics: {
    revenue30Days: number;
    todayBookingsCount: number;
    closedShiftsCount: number;
  };
  isRestored: boolean;
}

export async function provisionOrRestoreSandbox(
  leadId: string,
  studioName: string,
  cookieLeadId?: string
): Promise<ProvisionResult> {
  const db = getDb();
  const now = new Date();

  const lookupLeadId = cookieLeadId || leadId;
  let targetSandboxId: string | undefined;
  let targetStudioName = studioName;

  // 1. Check database for existing active sandbox for this lead (via cookie or phone match)
  if (db) {
    try {
      const boxQuery = await db
        .select()
        .from(demoSandboxes)
        .where(eq(demoSandboxes.leadId, lookupLeadId))
        .orderBy(desc(demoSandboxes.lastActiveAt))
        .limit(1);

      if (boxQuery.length > 0) {
        const box = boxQuery[0];
        const idleDays = (now.getTime() - box.lastActiveAt.getTime()) / (1000 * 3600 * 24);
        if (idleDays <= 7) {
          targetSandboxId = box.sandboxId;
          targetStudioName = box.studioName || studioName;
          await db.update(demoSandboxes).set({ lastActiveAt: now }).where(eq(demoSandboxes.sandboxId, box.sandboxId));
          await recordDemoActivity(leadId, targetSandboxId, 'DEMO_STARTED');
          return {
            leadId,
            sandboxId: targetSandboxId,
            tenantSlug: targetSandboxId,
            studioName: targetStudioName,
            adminCredentials: { username: 'admin', password: 'DemoAdmin2026!', role: 'STUDIO_ADMIN' },
            staffList: DEMO_DEFAULT_STAFF_PRESETS.map((st) => ({
              ...st,
              badgeBarcode: `${st.badgeBarcode}-${targetSandboxId!.slice(-4).toUpperCase()}`,
            })),
            seedMetrics: {
              revenue30Days: 2500000,
              todayBookingsCount: 3,
              closedShiftsCount: 29,
            },
            isRestored: true,
          };
        }
      }
    } catch (err) {
      console.warn('[Demo Sandboxes] DB lookup error:', err);
    }
  }

  // 2. Memory fallback if running without database
  if (!db) {
    const memorySandboxId = memoryLeadToSandboxId.get(lookupLeadId) || memoryLeadToSandboxId.get(leadId);
    if (memorySandboxId) {
      const memoryBox = memorySandboxes.get(memorySandboxId);
      if (memoryBox) {
        const idleDays = (now.getTime() - memoryBox.lastActiveAt.getTime()) / (1000 * 3600 * 24);
        if (idleDays <= 7) {
          memoryBox.lastActiveAt = now;
          await recordDemoActivity(leadId, memorySandboxId, 'DEMO_STARTED');
          return {
            leadId,
            sandboxId: memorySandboxId,
            tenantSlug: memorySandboxId,
            studioName: memoryBox.studioName || studioName,
            adminCredentials: { username: 'admin', password: 'DemoAdmin2026!', role: 'STUDIO_ADMIN' },
            staffList: DEMO_DEFAULT_STAFF_PRESETS.map((st) => ({
              ...st,
              badgeBarcode: `${st.badgeBarcode}-${memorySandboxId.slice(-4).toUpperCase()}`,
            })),
            seedMetrics: memoryBox.seedMetrics || {
              revenue30Days: 2500000,
              todayBookingsCount: 3,
              closedShiftsCount: 29,
            },
            isRestored: true,
          };
        }
      }
    }
  }

  // 3. Provision fresh sandbox: demo-<random>
  const randHex = crypto.randomBytes(3).toString('hex');
  const sandboxId = `demo-${randHex}`;

  const seedMetrics = await seedSandboxData(sandboxId, studioName);

  if (db) {
    try {
      await db.insert(demoSandboxes).values({
        sandboxId,
        leadId,
        studioName,
        createdAt: now,
        lastActiveAt: now,
      }).onConflictDoUpdate({
        target: demoSandboxes.sandboxId,
        set: { lastActiveAt: now, studioName },
      });
    } catch (err) {
      console.warn('[Demo Sandboxes] Failed to insert sandbox row:', err);
    }
  } else {
    memoryLeadToSandboxId.set(leadId, sandboxId);
    memorySandboxToLeadId.set(sandboxId, leadId);
  }

  await recordDemoActivity(leadId, sandboxId, 'DEMO_STARTED');

  return {
    leadId,
    sandboxId,
    tenantSlug: sandboxId,
    studioName,
    adminCredentials: {
      username: 'admin',
      password: 'DemoAdmin2026!',
      role: 'STUDIO_ADMIN',
    },
    staffList: DEMO_DEFAULT_STAFF_PRESETS.map((st) => ({
      ...st,
      badgeBarcode: `${st.badgeBarcode}-${sandboxId.slice(-4).toUpperCase()}`,
    })),
    seedMetrics,
    isRestored: false,
  };
}

// ----------------------------------------------------------------------------
// RESET SANDBOX
// ----------------------------------------------------------------------------
export async function resetSandbox(sandboxId: string, studioName: string): Promise<void> {
  const db = getDb();
  if (db) {
    try {
      await db.delete(customerBookings).where(eq(customerBookings.tenantId, sandboxId));
      await db.delete(posTransactions).where(eq(posTransactions.tenantId, sandboxId));
      await db.delete(posShifts).where(eq(posShifts.tenantId, sandboxId));
      await db.delete(posStaff).where(eq(posStaff.tenantId, sandboxId));
      await db.delete(adminUsers).where(eq(adminUsers.tenantId, sandboxId));
      await db.delete(verifiedSlips).where(eq(verifiedSlips.tenantId, sandboxId));
    } catch (err) {
      console.error('[Demo Reset] Failed to delete existing rows on reset:', err);
    }
  }
  await seedSandboxData(sandboxId, studioName);
  await recordDemoActivityBySandbox(sandboxId, 'RESET');
}

// ----------------------------------------------------------------------------
// PART E: PERMANENT SAMPLE STUDIO (`sample-studio`)
// ----------------------------------------------------------------------------
export async function reseedSampleStudio(): Promise<void> {
  const sampleTenantId = 'sample-studio';
  const sampleStudioName = 'AJ Studio Sample Atelier';
  const db = getDb();

  if (db) {
    try {
      await db.delete(customerBookings).where(eq(customerBookings.tenantId, sampleTenantId));
      await db.delete(posTransactions).where(eq(posTransactions.tenantId, sampleTenantId));
      await db.delete(posShifts).where(eq(posShifts.tenantId, sampleTenantId));
      await db.delete(posStaff).where(eq(posStaff.tenantId, sampleTenantId));
      await db.delete(adminUsers).where(eq(adminUsers.tenantId, sampleTenantId));
      await db.delete(verifiedSlips).where(eq(verifiedSlips.tenantId, sampleTenantId));
    } catch (err) {
      console.warn('[Sample Studio Reseed] Cleanup error:', err);
    }
  }

  await seedSandboxData(sampleTenantId, sampleStudioName);
}

// ----------------------------------------------------------------------------
// 7-DAY RETENTION & IDLE SANDBOX CLEANUP
// ----------------------------------------------------------------------------
export async function cleanupIdleSandboxes(maxIdleDays: number | boolean = 7): Promise<{ deletedSandboxes: number }> {
  const daysThreshold = typeof maxIdleDays === 'boolean' ? 0 : Number(maxIdleDays);
  const db = getDb();
  const now = new Date();
  const cutoff = new Date(now.getTime() - daysThreshold * 24 * 3600 * 1000);
  let deletedCount = 0;

  if (db) {
    try {
      // 1. Find idle sandboxes (excluding sample-studio)
      const idleBoxes = await db
        .select({ sandboxId: demoSandboxes.sandboxId })
        .from(demoSandboxes)
        .where(
          and(
            ne(demoSandboxes.sandboxId, 'sample-studio'),
            daysThreshold === 0 ? sql`TRUE` : lt(demoSandboxes.lastActiveAt, cutoff)
          )
        );

      const toDeleteIds = new Set<string>(idleBoxes.map((b) => b.sandboxId));

      // 2. Cap enforcement: max 300 sandboxes total (oldest first, excluding sample-studio)
      const allSandboxes = await db
        .select({ sandboxId: demoSandboxes.sandboxId, lastActiveAt: demoSandboxes.lastActiveAt })
        .from(demoSandboxes)
        .where(ne(demoSandboxes.sandboxId, 'sample-studio'))
        .orderBy(asc(demoSandboxes.lastActiveAt));

      if (allSandboxes.length > 300) {
        const excessCount = allSandboxes.length - 300;
        for (let i = 0; i < excessCount; i++) {
          toDeleteIds.add(allSandboxes[i].sandboxId);
        }
      }

      // 3. Delete each sandbox in ONE transaction
      for (const sId of toDeleteIds) {
        try {
          await db.transaction(async (tx) => {
            await tx.delete(bookingEvents).where(eq(bookingEvents.tenantId, sId));
            await tx.delete(customerBookings).where(eq(customerBookings.tenantId, sId));
            await tx.delete(posTransactions).where(eq(posTransactions.tenantId, sId));
            await tx.delete(posShifts).where(eq(posShifts.tenantId, sId));
            await tx.delete(posStaff).where(eq(posStaff.tenantId, sId));
            await tx.delete(adminUsers).where(eq(adminUsers.tenantId, sId));
            await tx.delete(verifiedSlips).where(eq(verifiedSlips.tenantId, sId));
            await tx.delete(productionStudios).where(eq(productionStudios.slug, sId));
            await tx.delete(demoSandboxes).where(eq(demoSandboxes.sandboxId, sId));
          });
          deletedCount++;
        } catch (err) {
          console.error(`[Sandbox Cleanup] Error removing rows for ${sId}:`, err);
        }
      }
    } catch (dbErr) {
      console.error('[Sandbox Cleanup] Database query error:', dbErr);
    }
  } else {
    // Memory fallback when running without database
    for (const [sId, sMeta] of memorySandboxes.entries()) {
      if (sId === 'sample-studio') continue; // Never expires
      const idleDays = (now.getTime() - sMeta.lastActiveAt.getTime()) / (1000 * 3600 * 24);
      if (idleDays >= daysThreshold) {
        memorySandboxes.delete(sId);
        deletedCount++;
      }
    }

    if (memorySandboxes.size > 300) {
      const sorted = Array.from(memorySandboxes.entries())
        .filter(([id]) => id !== 'sample-studio')
        .sort((a, b) => a[1].lastActiveAt.getTime() - b[1].lastActiveAt.getTime());

      const excessCount = memorySandboxes.size - 300;
      for (let i = 0; i < excessCount; i++) {
        const [sId] = sorted[i];
        memorySandboxes.delete(sId);
        deletedCount++;
      }
    }
  }

  return { deletedSandboxes: deletedCount };
}

// ----------------------------------------------------------------------------
// FOUNDER REPORTING: LEADS & CSV EXPORT
// ----------------------------------------------------------------------------
export interface DemoLeadRowView {
  id: string;
  name: string;
  phone: string;
  studioName: string;
  city: string;
  contactHandle: string;
  preferredChannel: string;
  visits: number;
  furthestStepReached: string;
  firstSeenAt: string;
  lastSeenAt: string;
  source: string;
}

export async function getDemoLeadsSummary(): Promise<DemoLeadRowView[]> {
  const db = getDb();
  let rawLeads: any[] = [];
  let rawActivities: { leadId: string | null; event: string }[] = [];

  if (db) {
    try {
      rawLeads = await db.select().from(demoLeads).orderBy(desc(demoLeads.lastSeenAt));
      rawActivities = await db.select({ leadId: demoActivity.leadId, event: demoActivity.event }).from(demoActivity);
    } catch (err) {
      console.warn('[Demo Summary] Database query failed, using memory:', err);
      rawLeads = Array.from(memoryLeads.values()).sort(
        (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()
      );
      rawActivities = memoryActivity;
    }
  } else {
    rawLeads = Array.from(memoryLeads.values()).sort(
      (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()
    );
    rawActivities = memoryActivity;
  }

  // Compute furthest step reached from activity
  return rawLeads.map((l) => {
    const activities = rawActivities.filter((a) => a.leadId === l.id);
    const events = activities.map((a) => a.event);

    let step = 'Started Demo';
    if (events.includes('Z_REPORT')) {
      step = 'Completed Z-Report';
    } else if (events.includes('POS_SALE')) {
      step = 'Made POS Sale';
    } else if (events.includes('SLIP_CHECKED')) {
      step = 'Checked Payment Slip';
    } else if (events.includes('BOOKING_CREATED')) {
      step = 'Created Customer Booking';
    } else if (events.some((e) => e.startsWith('ROLE_OPENED:'))) {
      step = 'Explored Roles';
    }

    return {
      id: l.id,
      name: l.name,
      phone: l.phone,
      studioName: l.studioName || l.studio_name,
      city: l.city || 'N/A',
      contactHandle: l.contactHandle || l.contact_handle || 'N/A',
      preferredChannel: l.preferredChannel || l.preferred_channel || 'TELEGRAM',
      visits: l.visitCount || l.visit_count || 1,
      furthestStepReached: step,
      firstSeenAt: new Date(l.firstSeenAt || l.first_seen_at).toISOString(),
      lastSeenAt: new Date(l.lastSeenAt || l.last_seen_at).toISOString(),
      source: l.source || 'showroom',
    };
  });
}

export function convertLeadsToCsv(leads: DemoLeadRowView[]): string {
  const headers = ['Lead ID', 'Name', 'Phone', 'Studio Name', 'City', 'Contact Handle', 'Channel', 'Visits', 'Furthest Step', 'First Seen', 'Last Seen', 'Source'];
  const rows = leads.map((l) => [
    `"${l.id}"`,
    `"${l.name.replace(/"/g, '""')}"`,
    `"${l.phone}"`,
    `"${l.studioName.replace(/"/g, '""')}"`,
    `"${l.city.replace(/"/g, '""')}"`,
    `"${l.contactHandle.replace(/"/g, '""')}"`,
    `"${l.preferredChannel}"`,
    l.visits,
    `"${l.furthestStepReached}"`,
    `"${l.firstSeenAt}"`,
    `"${l.lastSeenAt}"`,
    `"${l.source}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
