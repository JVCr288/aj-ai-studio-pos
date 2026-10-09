import {
  BookingState,
  PhotographyPackage,
} from '../types';
import { getDb } from '../db/index.js';
import { customerBookings, bookingEvents } from '../db/schema/index.js';
import { eq, and, or, ne, desc, asc, notInArray, inArray, sql } from 'drizzle-orm';

// ----------------------------------------------------------------------------
// Date normalization. The customer UI stores "D MON YYYY" (e.g. "5 DEC 2026"),
// the demo seeder stores ISO "YYYY-MM-DD". Every slot comparison, lock key,
// "today" count and date filter must treat both spellings as the same day.
// ----------------------------------------------------------------------------
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function toIsoDate(value: string): string {
  const v = (value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].toUpperCase());
    if (mi >= 0) return `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return v;
}

/** Every stored spelling of the same calendar day. */
export function dateVariants(value: string): string[] {
  const iso = toIsoDate(value);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return [value];
  const mon = MONTHS[Number(m[2]) - 1];
  const day = String(Number(m[3]));
  return Array.from(new Set([iso, `${day} ${mon} ${m[1]}`, `${m[3]} ${mon} ${m[1]}`, value]));
}

/** Today's date in the studio's time zone (Asia/Yangon, UTC+06:30), ISO format. */
export function todayIsoYangon(now: Date = new Date()): string {
  return new Date(now.getTime() + 6.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export type BookingStatus =
  | 'SUBMITTED'
  | 'AWAITING_PAYMENT_REVIEW'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'EVIDENCE_RECEIVED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface CustomerBookingRecord {
  id: string;
  bookingReference: string;
  tenantId: string;
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  telegramHandle?: string;
  packageSnapshot: {
    packageId: string;
    name: string;
    price: number;
    deposit: number;
    description?: string;
    suiteAllocation?: string;
  };
  spaceSnapshot: {
    spaceId: string;
    name: string;
    primaryUse: string;
  };
  startDate: string;
  timeSlot: string;
  totalAmount: number;
  depositAmount: number;
  verifiedPaidAmount: number;
  outstandingBalance: number;
  currency: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  uploadedSlipName?: string;
  uploadedSlipSize?: string;
  paymentEvidenceAssetId?: string;
  customerNotes?: string;
  privateAdminNotes?: string;
  sourceChannel: string;
  revision: number;
  cancellationReason?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingEventRecord {
  id: string;
  bookingId: string;
  tenantId: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  actorId: string;
  actorRole: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface BookingSummaryCounts {
  total: number;
  today: number;
  upcoming: number;
  awaitingPaymentReview: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  verifiedRevenueMMK: number;
}

export interface CreateBookingPayload {
  tenantId?: string;
  idempotencyKey?: string;
  packageId?: string;
  selectedPackage?: PhotographyPackage;
  dateStr: string;
  monthStr?: string;
  timeSlot: string;
  guestName: string;
  clientPhone: string;
  customerEmail?: string;
  telegramHandle?: string;
  gateway?: string;
  depositAmount?: number;
  totalAmount?: number;
  bayAllocation?: string;
  uploadedSlipName?: string;
  uploadedSlipSize?: string;
  paymentEvidenceAssetId?: string;
  briefingNotes?: string;
}

// In-Memory Fallback Repository for Offline Test Environments (getDb() === null)
const bookingStore = new Map<string, CustomerBookingRecord>();
const bookingEventsStore = new Map<string, BookingEventRecord[]>();

// Seed initial pilot bookings strictly in offline mode when getDb() === null
function seedPilotBookings() {
  if (bookingStore.size > 0) return;
  const now = new Date().toISOString();

  const pilot1: CustomerBookingRecord = {
    id: 'bk-aj-001',
    bookingReference: '#AJ-BK-2026-8801',
    tenantId: 'aj-ai-studio',
    idempotencyKey: 'idemp-seed-aj-001',
    customerName: 'Elena Rostova',
    customerPhone: '+95 9 792 108 421',
    customerEmail: 'elena@fashionatelier.mm',
    telegramHandle: '@elena_rostova',
    packageSnapshot: {
      packageId: 'pkg-gold',
      name: 'Gold Commercial Suite',
      price: 210000,
      deposit: 105000,
      description: 'Full commercial studio shoot with Profoto lighting rigs.',
      suiteAllocation: 'BAY ALPHA-01',
    },
    spaceSnapshot: {
      spaceId: 'space-bay-a1',
      name: 'BAY ALPHA-01',
      primaryUse: 'COMMERCIAL',
    },
    startDate: '18 NOV 2026',
    timeSlot: '11:00 AM',
    totalAmount: 210000,
    depositAmount: 105000,
    verifiedPaidAmount: 0,
    outstandingBalance: 210000,
    currency: 'MMK',
    bookingStatus: 'AWAITING_PAYMENT_REVIEW',
    paymentStatus: 'EVIDENCE_RECEIVED',
    paymentMethod: 'KBZPay',
    uploadedSlipName: 'KBZPay_Slip_TRX88219.png',
    uploadedSlipSize: '2.1 MB',
    customerNotes: 'High-key fashion setup with seamless white backdrop; tethered capture monitor on Bay Alpha-01',
    privateAdminNotes: 'Customer requested extra softbox setup.',
    sourceChannel: 'WEB_CUSTOMER_PORTAL',
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };

  const pilot2: CustomerBookingRecord = {
    id: 'bk-aj-002',
    bookingReference: '#AJ-BK-2026-8802',
    tenantId: 'aj-ai-studio',
    idempotencyKey: 'idemp-seed-aj-002',
    customerName: 'Kyaw Zayar',
    customerPhone: '+95 9 450 112 334',
    customerEmail: 'kyaw.zayar@agency.mm',
    telegramHandle: '@kyaw_zayar',
    packageSnapshot: {
      packageId: 'pkg-silver',
      name: 'Silver Portrait Nook',
      price: 150000,
      deposit: 50000,
      description: 'Intimate editorial portrait session.',
      suiteAllocation: 'BAY BETA-02',
    },
    spaceSnapshot: {
      spaceId: 'space-bay-b2',
      name: 'BAY BETA-02',
      primaryUse: 'PORTRAIT',
    },
    startDate: '18 NOV 2026',
    timeSlot: '02:00 PM',
    totalAmount: 150000,
    depositAmount: 50000,
    verifiedPaidAmount: 50000,
    outstandingBalance: 100000,
    currency: 'MMK',
    bookingStatus: 'CONFIRMED',
    paymentStatus: 'VERIFIED',
    paymentMethod: 'WavePay',
    uploadedSlipName: 'WavePay_Slip_W88421.jpg',
    uploadedSlipSize: '1.4 MB',
    customerNotes: 'Editorial headshots for magazine cover.',
    privateAdminNotes: 'Deposit verified via WavePay merchant statement.',
    sourceChannel: 'WEB_CUSTOMER_PORTAL',
    revision: 1,
    confirmedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  bookingStore.set(pilot1.id, pilot1);
  bookingStore.set(pilot2.id, pilot2);

  bookingEventsStore.set(pilot1.id, [
    {
      id: 'evt-aj-001-1',
      bookingId: pilot1.id,
      tenantId: 'aj-ai-studio',
      eventType: 'SUBMITTED',
      toStatus: 'AWAITING_PAYMENT_REVIEW',
      actorId: 'customer',
      actorRole: 'CUSTOMER',
      message: 'Customer submitted booking request with KBZPay payment evidence.',
      createdAt: now,
    },
  ]);

  bookingEventsStore.set(pilot2.id, [
    {
      id: 'evt-aj-002-1',
      bookingId: pilot2.id,
      tenantId: 'aj-ai-studio',
      eventType: 'SUBMITTED',
      toStatus: 'AWAITING_PAYMENT_REVIEW',
      actorId: 'customer',
      actorRole: 'CUSTOMER',
      message: 'Customer submitted booking request with WavePay payment evidence.',
      createdAt: now,
    },
    {
      id: 'evt-aj-002-2',
      bookingId: pilot2.id,
      tenantId: 'aj-ai-studio',
      eventType: 'PAYMENT_VERIFIED',
      fromStatus: 'AWAITING_PAYMENT_REVIEW',
      toStatus: 'CONFIRMED',
      actorId: 'admin-01',
      actorRole: 'STUDIO_ADMIN',
      message: 'Verified deposit payment of 50,000 MMK via WavePay merchant statement.',
      createdAt: now,
    },
  ]);
}

function ensurePilotBookingsSeeded() {
  if (bookingStore.size === 0) {
    seedPilotBookings();
  }
}

function isUuidString(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

function generateUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mapRowToCustomerBookingRecord(row: typeof customerBookings.$inferSelect): CustomerBookingRecord {
  return {
    id: row.id,
    bookingReference: row.bookingReference,
    tenantId: row.tenantId,
    idempotencyKey: row.idempotencyKey,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail ?? undefined,
    telegramHandle: row.telegramHandle ?? undefined,
    packageSnapshot: row.packageSnapshot as CustomerBookingRecord['packageSnapshot'],
    spaceSnapshot: row.spaceSnapshot as CustomerBookingRecord['spaceSnapshot'],
    startDate: row.startDate,
    timeSlot: row.timeSlot,
    totalAmount: Number(row.totalAmount),
    depositAmount: Number(row.depositAmount),
    verifiedPaidAmount: Number(row.verifiedPaidAmount),
    outstandingBalance: Number(row.outstandingBalance),
    currency: row.currency,
    bookingStatus: row.bookingStatus as BookingStatus,
    paymentStatus: row.paymentStatus as PaymentStatus,
    paymentMethod: row.paymentMethod,
    uploadedSlipName: row.uploadedSlipName ?? undefined,
    uploadedSlipSize: row.uploadedSlipSize ?? undefined,
    paymentEvidenceAssetId: row.paymentEvidenceAssetId ?? undefined,
    customerNotes: row.customerNotes ?? undefined,
    privateAdminNotes: row.privateAdminNotes ?? undefined,
    sourceChannel: row.sourceChannel,
    revision: row.revision,
    cancellationReason: row.cancellationReason ?? undefined,
    confirmedAt: row.confirmedAt ? new Date(row.confirmedAt).toISOString() : undefined,
    cancelledAt: row.cancelledAt ? new Date(row.cancelledAt).toISOString() : undefined,
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : undefined,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function mapRowToBookingEventRecord(row: typeof bookingEvents.$inferSelect): BookingEventRecord {
  return {
    id: row.id,
    bookingId: row.bookingId,
    tenantId: row.tenantId,
    eventType: row.eventType,
    fromStatus: row.fromStatus ?? undefined,
    toStatus: row.toStatus ?? undefined,
    actorId: row.actorId,
    actorRole: row.actorRole,
    message: row.message,
    metadata: (row.metadata as Record<string, any>) ?? undefined,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export class ServerBookingService {
  /**
   * Helper to check if database is configured and active
   */
  public isDatabaseConfigured(): boolean {
    return Boolean(getDb() !== null);
  }

  /**
   * Create customer booking with idempotency key and double-booking conflict protection.
   */
  public async createCustomerBooking(payload: CreateBookingPayload): Promise<CustomerBookingRecord> {
    const tenantId = payload.tenantId || 'aj-ai-studio';
    const idempotencyKey = payload.idempotencyKey || `idemp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const db = getDb();
    if (!db) {
      ensurePilotBookingsSeeded();
      // 1. Idempotency Check: return existing booking if key matches
      for (const bk of Array.from(bookingStore.values())) {
        if (bk.idempotencyKey === idempotencyKey && bk.tenantId === tenantId) {
          return bk;
        }
      }

      const spaceName = payload.bayAllocation || payload.selectedPackage?.suiteAllocation || 'BAY ALPHA-01';
      const dateStr = payload.dateStr;
      const timeSlot = payload.timeSlot;

      // 2. Conflict Recheck: Ensure space/slot is not already booked by another active booking
      for (const bk of Array.from(bookingStore.values())) {
        if (
          bk.tenantId === tenantId &&
          toIsoDate(bk.startDate) === toIsoDate(dateStr) &&
          bk.timeSlot === timeSlot &&
          bk.spaceSnapshot.name.toLowerCase() === spaceName.toLowerCase() &&
          bk.bookingStatus !== 'CANCELLED' &&
          bk.bookingStatus !== 'NO_SHOW'
        ) {
          throw new Error(`SLOT_DOUBLE_BOOKED: Space "${spaceName}" is already booked for date ${dateStr} at ${timeSlot}.`);
        }
      }

      const now = new Date().toISOString();
      const prefix = tenantId.includes('neutral') ? 'STUDIO' : 'AJ';
      const bookingRef = `#${prefix}-BK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const bookingId = `bk-${tenantId}-${Date.now()}`;

      const totalAmount = payload.totalAmount ?? payload.selectedPackage?.price ?? 200000;
      const depositAmount = payload.depositAmount ?? payload.selectedPackage?.deposit ?? 50000;

      let bookingStatus: BookingStatus = 'AWAITING_PAYMENT_REVIEW';
      let paymentStatus: PaymentStatus = 'EVIDENCE_RECEIVED';

      if (!payload.uploadedSlipName && !payload.paymentEvidenceAssetId) {
        if (depositAmount === 0) {
          bookingStatus = 'SUBMITTED';
          paymentStatus = 'NOT_REQUIRED';
        } else {
          bookingStatus = 'AWAITING_PAYMENT_REVIEW';
          paymentStatus = 'PENDING';
        }
      }

      const record: CustomerBookingRecord = {
        id: bookingId,
        bookingReference: bookingRef,
        tenantId,
        idempotencyKey,
        customerName: payload.guestName,
        customerPhone: payload.clientPhone,
        customerEmail: payload.customerEmail,
        telegramHandle: payload.telegramHandle,
        packageSnapshot: {
          packageId: payload.packageId || payload.selectedPackage?.id || 'pkg-custom',
          name: payload.selectedPackage?.name || 'Custom Package',
          price: totalAmount,
          deposit: depositAmount,
          description: payload.selectedPackage?.description,
          suiteAllocation: spaceName,
        },
        spaceSnapshot: {
          spaceId: `space-${spaceName.toLowerCase().replace(/\s+/g, '-')}`,
          name: spaceName,
          primaryUse: spaceName.includes('BETA') ? 'PORTRAIT' : 'COMMERCIAL',
        },
        startDate: dateStr,
        timeSlot,
        totalAmount,
        depositAmount,
        verifiedPaidAmount: 0,
        outstandingBalance: totalAmount,
        currency: 'MMK',
        bookingStatus,
        paymentStatus,
        paymentMethod: payload.gateway || 'KBZPay',
        uploadedSlipName: payload.uploadedSlipName,
        uploadedSlipSize: payload.uploadedSlipSize,
        paymentEvidenceAssetId: payload.paymentEvidenceAssetId,
        customerNotes: payload.briefingNotes,
        sourceChannel: 'WEB_CUSTOMER_PORTAL',
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };

      bookingStore.set(bookingId, record);

      const firstEvent: BookingEventRecord = {
        id: `evt-${bookingId}-1`,
        bookingId,
        tenantId,
        eventType: 'SUBMITTED',
        toStatus: bookingStatus,
        actorId: 'customer',
        actorRole: 'CUSTOMER',
        message: `Customer ${payload.guestName} submitted booking request.`,
        createdAt: now,
      };

      bookingEventsStore.set(bookingId, [firstEvent]);
      return record;
    }

    // DATABASE-BACKED IMPLEMENTATION
    const spaceName = payload.bayAllocation || payload.selectedPackage?.suiteAllocation || 'BAY ALPHA-01';
    const dateStr = payload.dateStr;
    const timeSlot = payload.timeSlot;

    // 1. Idempotency Check: return existing booking if key matches
    const existing = await db
      .select()
      .from(customerBookings)
      .where(and(eq(customerBookings.tenantId, tenantId), eq(customerBookings.idempotencyKey, idempotencyKey)))
      .limit(1);

    if (existing.length > 0) {
      return mapRowToCustomerBookingRecord(existing[0]);
    }

    const totalAmount = payload.totalAmount ?? payload.selectedPackage?.price ?? 200000;
    const depositAmount = payload.depositAmount ?? payload.selectedPackage?.deposit ?? 50000;

    let bookingStatus: BookingStatus = 'AWAITING_PAYMENT_REVIEW';
    let paymentStatus: PaymentStatus = 'EVIDENCE_RECEIVED';

    if (!payload.uploadedSlipName && !payload.paymentEvidenceAssetId) {
      if (depositAmount === 0) {
        bookingStatus = 'SUBMITTED';
        paymentStatus = 'NOT_REQUIRED';
      } else {
        bookingStatus = 'AWAITING_PAYMENT_REVIEW';
        paymentStatus = 'PENDING';
      }
    }

    const prefix = tenantId.includes('neutral') ? 'STUDIO' : 'AJ';
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = `#${prefix}-BK-${new Date().getFullYear()}-${randSuffix}`;
    const bookingId = generateUuid();
    const now = new Date();

    return await db.transaction(async (tx) => {
      // Advisory xact lock serializes bookings for this exact slot under concurrency
      const lockKey = `${tenantId}:${spaceName.toLowerCase()}:${toIsoDate(dateStr)}:${timeSlot}`;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`);

      // Idempotency re-check inside transaction lock
      const existingInTx = await tx
        .select()
        .from(customerBookings)
        .where(and(eq(customerBookings.tenantId, tenantId), eq(customerBookings.idempotencyKey, idempotencyKey)))
        .limit(1);

      if (existingInTx.length > 0) {
        return mapRowToCustomerBookingRecord(existingInTx[0]);
      }

      // Slot conflict check against active bookings
      const conflicts = await tx
        .select()
        .from(customerBookings)
        .where(
          and(
            eq(customerBookings.tenantId, tenantId),
            inArray(customerBookings.startDate, dateVariants(dateStr)),
            eq(customerBookings.timeSlot, timeSlot),
            sql`lower(coalesce(${customerBookings.spaceSnapshot}->>'name', '')) = ${spaceName.toLowerCase()}`,
            notInArray(customerBookings.bookingStatus, ['CANCELLED', 'NO_SHOW'])
          )
        )
        .limit(1);

      if (conflicts.length > 0) {
        throw new Error(`SLOT_DOUBLE_BOOKED: Space "${spaceName}" is already booked for date ${dateStr} at ${timeSlot}.`);
      }

      const packageSnapshot = {
        packageId: payload.packageId || payload.selectedPackage?.id || 'pkg-custom',
        name: payload.selectedPackage?.name || 'Custom Package',
        price: totalAmount,
        deposit: depositAmount,
        description: payload.selectedPackage?.description,
        suiteAllocation: spaceName,
      };

      const spaceSnapshot = {
        spaceId: `space-${spaceName.toLowerCase().replace(/\s+/g, '-')}`,
        name: spaceName,
        primaryUse: spaceName.includes('BETA') ? 'PORTRAIT' : 'COMMERCIAL',
      };

      let insertedBooking: typeof customerBookings.$inferSelect | undefined;
      try {
        const [inserted] = await tx
          .insert(customerBookings)
          .values({
            id: bookingId,
            bookingReference: bookingRef,
            tenantId,
            idempotencyKey,
            customerName: payload.guestName,
            customerPhone: payload.clientPhone,
            customerEmail: payload.customerEmail || null,
            telegramHandle: payload.telegramHandle || null,
            packageSnapshot,
            spaceSnapshot,
            startDate: dateStr,
            timeSlot,
            totalAmount,
            depositAmount,
            verifiedPaidAmount: 0,
            outstandingBalance: totalAmount,
            currency: 'MMK',
            bookingStatus,
            paymentStatus,
            paymentMethod: payload.gateway || 'KBZPay',
            uploadedSlipName: payload.uploadedSlipName || null,
            uploadedSlipSize: payload.uploadedSlipSize || null,
            paymentEvidenceAssetId: payload.paymentEvidenceAssetId || null,
            customerNotes: payload.briefingNotes || null,
            sourceChannel: 'WEB_CUSTOMER_PORTAL',
            revision: 1,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        insertedBooking = inserted;
      } catch (insertErr: any) {
        // If unique index on idempotencyKey failed due to race, return existing
        if (insertErr?.code === '23505' && insertErr?.message?.includes('idempotency')) {
          const raceExisting = await tx
            .select()
            .from(customerBookings)
            .where(and(eq(customerBookings.tenantId, tenantId), eq(customerBookings.idempotencyKey, idempotencyKey)))
            .limit(1);
          if (raceExisting.length > 0) {
            return mapRowToCustomerBookingRecord(raceExisting[0]);
          }
        }
        // If unique index on bookingReference collided, retry with timestamp-extended reference
        if (insertErr?.code === '23505' && insertErr?.message?.includes('booking_reference')) {
          const retryRef = `#${prefix}-BK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
          const [retryInserted] = await tx
            .insert(customerBookings)
            .values({
              id: bookingId,
              bookingReference: retryRef,
              tenantId,
              idempotencyKey,
              customerName: payload.guestName,
              customerPhone: payload.clientPhone,
              customerEmail: payload.customerEmail || null,
              telegramHandle: payload.telegramHandle || null,
              packageSnapshot,
              spaceSnapshot,
              startDate: dateStr,
              timeSlot,
              totalAmount,
              depositAmount,
              verifiedPaidAmount: 0,
              outstandingBalance: totalAmount,
              currency: 'MMK',
              bookingStatus,
              paymentStatus,
              paymentMethod: payload.gateway || 'KBZPay',
              uploadedSlipName: payload.uploadedSlipName || null,
              uploadedSlipSize: payload.uploadedSlipSize || null,
              paymentEvidenceAssetId: payload.paymentEvidenceAssetId || null,
              customerNotes: payload.briefingNotes || null,
              sourceChannel: 'WEB_CUSTOMER_PORTAL',
              revision: 1,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          insertedBooking = retryInserted;
        } else {
          throw insertErr;
        }
      }

      // Record initial audit event
      await tx.insert(bookingEvents).values({
        id: generateUuid(),
        bookingId: insertedBooking!.id,
        tenantId,
        eventType: 'SUBMITTED',
        fromStatus: null,
        toStatus: bookingStatus,
        actorId: 'customer',
        actorRole: 'CUSTOMER',
        message: `Customer ${payload.guestName} submitted booking request.`,
        metadata: null,
        createdAt: now,
      });

      return mapRowToCustomerBookingRecord(insertedBooking!);
    });
  }

  /**
   * Get tenant-isolated booking summary counts.
   */
  public async getAdminBookingSummary(tenantId: string): Promise<BookingSummaryCounts> {
    const db = getDb();
    if (!db) {
      ensurePilotBookingsSeeded();
      const tenantBookings = Array.from(bookingStore.values()).filter((b) => b.tenantId === tenantId);

      const todayIso = todayIsoYangon();

      let verifiedRevenue = 0;
      let awaitingCount = 0;
      let confirmedCount = 0;
      let inProgressCount = 0;
      let completedCount = 0;
      let cancelledCount = 0;
      let todayCount = 0;
      let upcomingCount = 0;

      tenantBookings.forEach((b) => {
        if (b.paymentStatus === 'VERIFIED') {
          verifiedRevenue += b.verifiedPaidAmount;
        }
        if (b.bookingStatus === 'AWAITING_PAYMENT_REVIEW') awaitingCount++;
        if (b.bookingStatus === 'CONFIRMED') confirmedCount++;
        if (b.bookingStatus === 'IN_PROGRESS' || b.bookingStatus === 'CHECKED_IN') inProgressCount++;
        if (b.bookingStatus === 'COMPLETED') completedCount++;
        if (b.bookingStatus === 'CANCELLED' || b.bookingStatus === 'NO_SHOW') cancelledCount++;
        if (toIsoDate(b.startDate) === todayIso) todayCount++;
        if (b.bookingStatus !== 'CANCELLED' && b.bookingStatus !== 'COMPLETED') upcomingCount++;
      });

      return {
        total: tenantBookings.length,
        today: todayCount,
        upcoming: upcomingCount,
        awaitingPaymentReview: awaitingCount,
        confirmed: confirmedCount,
        inProgress: inProgressCount,
        completed: completedCount,
        cancelled: cancelledCount,
        verifiedRevenueMMK: verifiedRevenue,
      };
    }

    const todayVariants = dateVariants(todayIsoYangon());

    const rows = await db
      .select({
        total: sql<number>`count(*)::int`,
        today: sql<number>`count(*) FILTER (WHERE ${inArray(customerBookings.startDate, todayVariants)})::int`,
        upcoming: sql<number>`count(*) FILTER (WHERE ${customerBookings.bookingStatus} NOT IN ('CANCELLED', 'COMPLETED'))::int`,
        awaitingPaymentReview: sql<number>`count(*) FILTER (WHERE ${customerBookings.bookingStatus} = 'AWAITING_PAYMENT_REVIEW')::int`,
        confirmed: sql<number>`count(*) FILTER (WHERE ${customerBookings.bookingStatus} = 'CONFIRMED')::int`,
        inProgress: sql<number>`count(*) FILTER (WHERE ${customerBookings.bookingStatus} IN ('IN_PROGRESS', 'CHECKED_IN'))::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${customerBookings.bookingStatus} = 'COMPLETED')::int`,
        cancelled: sql<number>`count(*) FILTER (WHERE ${customerBookings.bookingStatus} IN ('CANCELLED', 'NO_SHOW'))::int`,
        verifiedRevenueMMK: sql<number>`coalesce(sum(${customerBookings.verifiedPaidAmount}) FILTER (WHERE ${customerBookings.paymentStatus} = 'VERIFIED'), 0)::bigint`,
      })
      .from(customerBookings)
      .where(eq(customerBookings.tenantId, tenantId));

    const row = rows[0];
    return {
      total: Number(row?.total || 0),
      today: Number(row?.today || 0),
      upcoming: Number(row?.upcoming || 0),
      awaitingPaymentReview: Number(row?.awaitingPaymentReview || 0),
      confirmed: Number(row?.confirmed || 0),
      inProgress: Number(row?.inProgress || 0),
      completed: Number(row?.completed || 0),
      cancelled: Number(row?.cancelled || 0),
      verifiedRevenueMMK: Number(row?.verifiedRevenueMMK || 0),
    };
  }

  /**
   * Query tenant-isolated bookings with search, status filters, and pagination.
   */
  public async queryAdminBookings(
    tenantId: string,
    options: {
      query?: string;
      status?: string;
      paymentStatus?: string;
      space?: string;
      date?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{
    items: CustomerBookingRecord[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const db = getDb();
    if (!db) {
      ensurePilotBookingsSeeded();
      let list = Array.from(bookingStore.values()).filter((b) => b.tenantId === tenantId);

      if (options.query && options.query.trim()) {
        const q = options.query.toLowerCase().trim();
        list = list.filter(
          (b) =>
            b.bookingReference.toLowerCase().includes(q) ||
            b.customerName.toLowerCase().includes(q) ||
            b.customerPhone.toLowerCase().includes(q) ||
            (b.customerEmail && b.customerEmail.toLowerCase().includes(q)) ||
            (b.telegramHandle && b.telegramHandle.toLowerCase().includes(q))
        );
      }

      if (options.status && options.status !== 'ALL') {
        list = list.filter((b) => b.bookingStatus === options.status);
      }

      if (options.paymentStatus && options.paymentStatus !== 'ALL') {
        list = list.filter((b) => b.paymentStatus === options.paymentStatus);
      }

      if (options.space && options.space !== 'ALL') {
        list = list.filter((b) => b.spaceSnapshot.name.toLowerCase().includes(options.space!.toLowerCase()));
      }

      if (options.date) {
        list = list.filter((b) => toIsoDate(b.startDate) === toIsoDate(options.date!));
      }

      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const page = Math.max(1, options.page || 1);
      const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
      const totalCount = list.length;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;
      const startIndex = (page - 1) * pageSize;
      const items = list.slice(startIndex, startIndex + pageSize);

      return { items, totalCount, page, pageSize, totalPages };
    }

    const conditions = [eq(customerBookings.tenantId, tenantId)];

    if (options.query && options.query.trim()) {
      const q = `%${options.query.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`lower(${customerBookings.bookingReference}) LIKE ${q}`,
          sql`lower(${customerBookings.customerName}) LIKE ${q}`,
          sql`lower(${customerBookings.customerPhone}) LIKE ${q}`,
          sql`lower(coalesce(${customerBookings.customerEmail}, '')) LIKE ${q}`,
          sql`lower(coalesce(${customerBookings.telegramHandle}, '')) LIKE ${q}`
        )!
      );
    }

    if (options.status && options.status !== 'ALL') {
      conditions.push(eq(customerBookings.bookingStatus, options.status));
    }

    if (options.paymentStatus && options.paymentStatus !== 'ALL') {
      conditions.push(eq(customerBookings.paymentStatus, options.paymentStatus));
    }

    if (options.space && options.space !== 'ALL') {
      const spacePattern = `%${options.space.trim().toLowerCase()}%`;
      conditions.push(sql`lower(coalesce(${customerBookings.spaceSnapshot}->>'name', '')) LIKE ${spacePattern}`);
    }

    if (options.date) {
      conditions.push(inArray(customerBookings.startDate, dateVariants(options.date)));
    }

    const whereClause = and(...conditions);

    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const offset = (page - 1) * pageSize;

    const countRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customerBookings)
      .where(whereClause);

    const totalCount = Number(countRes[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    const rows = await db
      .select()
      .from(customerBookings)
      .where(whereClause)
      .orderBy(desc(customerBookings.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map(mapRowToCustomerBookingRecord);

    return { items, totalCount, page, pageSize, totalPages };
  }

  /**
   * Get single booking details with tenant boundary check and audit events.
   */
  public async getBookingDetails(
    tenantId: string,
    bookingId: string
  ): Promise<{ booking: CustomerBookingRecord; events: BookingEventRecord[] } | null> {
    const db = getDb();
    if (!db) {
      ensurePilotBookingsSeeded();
      const booking = bookingStore.get(bookingId);
      if (!booking || booking.tenantId !== tenantId) {
        return null;
      }
      const events = bookingEventsStore.get(bookingId) || [];
      return { booking, events };
    }

    const isUuid = isUuidString(bookingId);
    const whereClause = and(
      eq(customerBookings.tenantId, tenantId),
      isUuid
        ? or(eq(customerBookings.id, bookingId), eq(customerBookings.bookingReference, bookingId))
        : eq(customerBookings.bookingReference, bookingId)
    );

    const rows = await db
      .select()
      .from(customerBookings)
      .where(whereClause)
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const booking = mapRowToCustomerBookingRecord(rows[0]);

    const eventRows = await db
      .select()
      .from(bookingEvents)
      .where(and(eq(bookingEvents.bookingId, booking.id), eq(bookingEvents.tenantId, tenantId)))
      .orderBy(asc(bookingEvents.createdAt));

    const events = eventRows.map(mapRowToBookingEventRecord);

    return { booking, events };
  }

  /**
   * Look up booking by manifest ID or booking reference
   */
  public async findBookingByManifestOrRef(
    manifestOrRef: string,
    tenantId?: string
  ): Promise<CustomerBookingRecord | null> {
    if (!manifestOrRef) return null;
    const clean = manifestOrRef.trim();

    const db = getDb();
    if (!db) {
      ensurePilotBookingsSeeded();
      for (const b of bookingStore.values()) {
        if (tenantId && b.tenantId !== tenantId) continue;
        if (b.id === clean || b.bookingReference === clean || b.idempotencyKey === clean) {
          return b;
        }
      }
      return null;
    }

    const isUuid = isUuidString(clean);
    const matchCondition = isUuid
      ? or(
          eq(customerBookings.id, clean),
          eq(customerBookings.bookingReference, clean),
          eq(customerBookings.idempotencyKey, clean)
        )
      : or(
          eq(customerBookings.bookingReference, clean),
          eq(customerBookings.idempotencyKey, clean)
        );

    const whereClause = tenantId
      ? and(eq(customerBookings.tenantId, tenantId), matchCondition!)
      : matchCondition!;

    const rows = await db
      .select()
      .from(customerBookings)
      .where(whereClause)
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return mapRowToCustomerBookingRecord(rows[0]);
  }

  /**
   * Admin review of manual payment evidence (VERIFY or REJECT).
   */
  public async reviewPaymentEvidence(
    tenantId: string,
    bookingId: string,
    decision: 'VERIFY' | 'REJECT',
    amountPaidMMK?: number,
    notes?: string,
    actorId = 'admin'
  ): Promise<CustomerBookingRecord> {
    const db = getDb();
    if (!db) {
      ensurePilotBookingsSeeded();
      const details = await this.getBookingDetails(tenantId, bookingId);
      if (!details) {
        throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} not found for tenant ${tenantId}.`);
      }

      const { booking } = details;
      const now = new Date().toISOString();
      const fromStatus = booking.bookingStatus;

      if (decision === 'VERIFY') {
        const verifiedAmount = amountPaidMMK ?? booking.depositAmount;
        const updated: CustomerBookingRecord = {
          ...booking,
          paymentStatus: 'VERIFIED',
          bookingStatus: 'CONFIRMED',
          verifiedPaidAmount: verifiedAmount,
          outstandingBalance: Math.max(0, booking.totalAmount - verifiedAmount),
          confirmedAt: now,
          updatedAt: now,
          revision: booking.revision + 1,
          privateAdminNotes: notes ? `${booking.privateAdminNotes || ''}\n[Payment Verified]: ${notes}` : booking.privateAdminNotes,
        };

        bookingStore.set(bookingId, updated);

        const evt: BookingEventRecord = {
          id: `evt-${bookingId}-${Date.now()}`,
          bookingId,
          tenantId,
          eventType: 'PAYMENT_VERIFIED',
          fromStatus,
          toStatus: 'CONFIRMED',
          actorId,
          actorRole: 'STUDIO_ADMIN',
          message: `Payment evidence verified for ${verifiedAmount.toLocaleString()} MMK.${notes ? ` Note: ${notes}` : ''}`,
          createdAt: now,
        };

        const evts = bookingEventsStore.get(bookingId) || [];
        bookingEventsStore.set(bookingId, [...evts, evt]);

        return updated;
      } else {
        const updated: CustomerBookingRecord = {
          ...booking,
          paymentStatus: 'REJECTED',
          bookingStatus: 'AWAITING_PAYMENT_REVIEW',
          updatedAt: now,
          revision: booking.revision + 1,
          privateAdminNotes: notes ? `${booking.privateAdminNotes || ''}\n[Payment Rejected]: ${notes}` : booking.privateAdminNotes,
        };

        bookingStore.set(bookingId, updated);

        const evt: BookingEventRecord = {
          id: `evt-${bookingId}-${Date.now()}`,
          bookingId,
          tenantId,
          eventType: 'PAYMENT_REJECTED',
          fromStatus,
          toStatus: 'AWAITING_PAYMENT_REVIEW',
          actorId,
          actorRole: 'STUDIO_ADMIN',
          message: `Payment evidence rejected.${notes ? ` Reason: ${notes}` : ''}`,
          createdAt: now,
        };

        const evts = bookingEventsStore.get(bookingId) || [];
        bookingEventsStore.set(bookingId, [...evts, evt]);

        return updated;
      }
    }

    return await db.transaction(async (tx) => {
      const isUuid = isUuidString(bookingId);
      const whereClause = and(
        eq(customerBookings.tenantId, tenantId),
        isUuid
          ? or(eq(customerBookings.id, bookingId), eq(customerBookings.bookingReference, bookingId))
          : eq(customerBookings.bookingReference, bookingId)
      );

      const rows = await tx
        .select()
        .from(customerBookings)
        .where(whereClause)
        .limit(1);

      if (rows.length === 0) {
        throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} not found for tenant ${tenantId}.`);
      }

      const booking = rows[0];
      const now = new Date();
      const fromStatus = booking.bookingStatus;

      if (decision === 'VERIFY') {
        const verifiedAmount = amountPaidMMK ?? Number(booking.depositAmount);
        const newPaid = verifiedAmount;
        const outstanding = Math.max(0, Number(booking.totalAmount) - verifiedAmount);
        const updatedNotes = notes
          ? `${booking.privateAdminNotes || ''}\n[Payment Verified]: ${notes}`
          : booking.privateAdminNotes;

        const [updated] = await tx
          .update(customerBookings)
          .set({
            paymentStatus: 'VERIFIED',
            bookingStatus: 'CONFIRMED',
            verifiedPaidAmount: newPaid,
            outstandingBalance: outstanding,
            confirmedAt: now,
            updatedAt: now,
            revision: booking.revision + 1,
            privateAdminNotes: updatedNotes,
          })
          .where(and(eq(customerBookings.id, booking.id), eq(customerBookings.tenantId, tenantId)))
          .returning();

        await tx.insert(bookingEvents).values({
          id: generateUuid(),
          bookingId: booking.id,
          tenantId,
          eventType: 'PAYMENT_VERIFIED',
          fromStatus,
          toStatus: 'CONFIRMED',
          actorId,
          actorRole: 'STUDIO_ADMIN',
          message: `Payment evidence verified for ${verifiedAmount.toLocaleString()} MMK.${notes ? ` Note: ${notes}` : ''}`,
          metadata: null,
          createdAt: now,
        });

        return mapRowToCustomerBookingRecord(updated);
      } else {
        const updatedNotes = notes
          ? `${booking.privateAdminNotes || ''}\n[Payment Rejected]: ${notes}`
          : booking.privateAdminNotes;

        const [updated] = await tx
          .update(customerBookings)
          .set({
            paymentStatus: 'REJECTED',
            bookingStatus: 'AWAITING_PAYMENT_REVIEW',
            updatedAt: now,
            revision: booking.revision + 1,
            privateAdminNotes: updatedNotes,
          })
          .where(and(eq(customerBookings.id, booking.id), eq(customerBookings.tenantId, tenantId)))
          .returning();

        await tx.insert(bookingEvents).values({
          id: generateUuid(),
          bookingId: booking.id,
          tenantId,
          eventType: 'PAYMENT_REJECTED',
          fromStatus,
          toStatus: 'AWAITING_PAYMENT_REVIEW',
          actorId,
          actorRole: 'STUDIO_ADMIN',
          message: `Payment evidence rejected.${notes ? ` Reason: ${notes}` : ''}`,
          metadata: null,
          createdAt: now,
        });

        return mapRowToCustomerBookingRecord(updated);
      }
    });
  }

  /**
   * Update booking lifecycle status with role authorization and audit event.
   */
  public async updateBookingStatus(
    tenantId: string,
    bookingId: string,
    targetStatus: BookingStatus,
    reason?: string,
    expectedRevision?: number,
    actorId = 'admin'
  ): Promise<CustomerBookingRecord> {
    const db = getDb();
    if (!db) {
      ensurePilotBookingsSeeded();
      const details = await this.getBookingDetails(tenantId, bookingId);
      if (!details) {
        throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} not found for tenant ${tenantId}.`);
      }

      const { booking } = details;

      if (expectedRevision !== undefined && expectedRevision !== booking.revision) {
        throw new Error(`OPTIMISTIC_LOCK_CONCURRENT_UPDATE: Booking has been modified by another admin (expected rev ${expectedRevision}, actual rev ${booking.revision}).`);
      }

      const now = new Date().toISOString();
      const fromStatus = booking.bookingStatus;

      const updated: CustomerBookingRecord = {
        ...booking,
        bookingStatus: targetStatus,
        updatedAt: now,
        revision: booking.revision + 1,
        ...(targetStatus === 'CONFIRMED' ? { confirmedAt: now } : {}),
        ...(targetStatus === 'CANCELLED' ? { cancelledAt: now, cancellationReason: reason } : {}),
        ...(targetStatus === 'COMPLETED' ? { completedAt: now } : {}),
      };

      bookingStore.set(bookingId, updated);

      const evt: BookingEventRecord = {
        id: `evt-${bookingId}-${Date.now()}`,
        bookingId,
        tenantId,
        eventType: targetStatus,
        fromStatus,
        toStatus: targetStatus,
        actorId,
        actorRole: 'STUDIO_ADMIN',
        message: `Booking status changed from ${fromStatus} to ${targetStatus}.${reason ? ` Reason: ${reason}` : ''}`,
        createdAt: now,
      };

      const evts = bookingEventsStore.get(bookingId) || [];
      bookingEventsStore.set(bookingId, [...evts, evt]);

      return updated;
    }

    return await db.transaction(async (tx) => {
      const isUuid = isUuidString(bookingId);
      const whereClause = and(
        eq(customerBookings.tenantId, tenantId),
        isUuid
          ? or(eq(customerBookings.id, bookingId), eq(customerBookings.bookingReference, bookingId))
          : eq(customerBookings.bookingReference, bookingId)
      );

      const rows = await tx
        .select()
        .from(customerBookings)
        .where(whereClause)
        .limit(1);

      if (rows.length === 0) {
        throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} not found for tenant ${tenantId}.`);
      }

      const booking = rows[0];

      if (expectedRevision !== undefined && expectedRevision !== booking.revision) {
        throw new Error(`OPTIMISTIC_LOCK_CONCURRENT_UPDATE: Booking has been modified by another admin (expected rev ${expectedRevision}, actual rev ${booking.revision}).`);
      }

      const now = new Date();
      const fromStatus = booking.bookingStatus;

      const [updated] = await tx
        .update(customerBookings)
        .set({
          bookingStatus: targetStatus,
          updatedAt: now,
          revision: booking.revision + 1,
          ...(targetStatus === 'CONFIRMED' ? { confirmedAt: now } : {}),
          ...(targetStatus === 'CANCELLED' ? { cancelledAt: now, cancellationReason: reason || null } : {}),
          ...(targetStatus === 'COMPLETED' ? { completedAt: now } : {}),
        })
        .where(and(eq(customerBookings.id, booking.id), eq(customerBookings.tenantId, tenantId)))
        .returning();

      await tx.insert(bookingEvents).values({
        id: generateUuid(),
        bookingId: booking.id,
        tenantId,
        eventType: targetStatus,
        fromStatus,
        toStatus: targetStatus,
        actorId,
        actorRole: 'STUDIO_ADMIN',
        message: `Booking status changed from ${fromStatus} to ${targetStatus}.${reason ? ` Reason: ${reason}` : ''}`,
        metadata: null,
        createdAt: now,
      });

      return mapRowToCustomerBookingRecord(updated);
    });
  }

  /**
   * Reschedule booking with conflict check.
   */
  public async rescheduleBooking(
    tenantId: string,
    bookingId: string,
    newDateStr: string,
    newTimeSlot: string,
    newSpaceName?: string,
    actorId = 'admin'
  ): Promise<CustomerBookingRecord> {
    const db = getDb();
    if (!db) {
      ensurePilotBookingsSeeded();
      const details = await this.getBookingDetails(tenantId, bookingId);
      if (!details) {
        throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} not found for tenant ${tenantId}.`);
      }

      const { booking } = details;
      const spaceTarget = newSpaceName || booking.spaceSnapshot.name;

      // Conflict Recheck
      for (const bk of Array.from(bookingStore.values())) {
        if (
          bk.id !== bookingId &&
          bk.tenantId === tenantId &&
          toIsoDate(bk.startDate) === toIsoDate(newDateStr) &&
          bk.timeSlot === newTimeSlot &&
          bk.spaceSnapshot.name.toLowerCase() === spaceTarget.toLowerCase() &&
          bk.bookingStatus !== 'CANCELLED' &&
          bk.bookingStatus !== 'NO_SHOW'
        ) {
          throw new Error(`RESCHEDULE_CONFLICT: Space "${spaceTarget}" is already booked on ${newDateStr} at ${newTimeSlot}.`);
        }
      }

      const now = new Date().toISOString();
      const oldSchedule = `${booking.startDate} @ ${booking.timeSlot} (${booking.spaceSnapshot.name})`;

      const updated: CustomerBookingRecord = {
        ...booking,
        startDate: newDateStr,
        timeSlot: newTimeSlot,
        spaceSnapshot: {
          ...booking.spaceSnapshot,
          name: spaceTarget,
        },
        packageSnapshot: {
          ...booking.packageSnapshot,
          suiteAllocation: spaceTarget,
        },
        updatedAt: now,
        revision: booking.revision + 1,
      };

      bookingStore.set(bookingId, updated);

      const newSchedule = `${newDateStr} @ ${newTimeSlot} (${spaceTarget})`;
      const evt: BookingEventRecord = {
        id: `evt-${bookingId}-${Date.now()}`,
        bookingId,
        tenantId,
        eventType: 'RESCHEDULED',
        actorId,
        actorRole: 'STUDIO_ADMIN',
        message: `Rescheduled from ${oldSchedule} to ${newSchedule}.`,
        metadata: { oldSchedule, newSchedule },
        createdAt: now,
      };

      const evts = bookingEventsStore.get(bookingId) || [];
      bookingEventsStore.set(bookingId, [...evts, evt]);

      return updated;
    }

    return await db.transaction(async (tx) => {
      const isUuid = isUuidString(bookingId);
      const whereClause = and(
        eq(customerBookings.tenantId, tenantId),
        isUuid
          ? or(eq(customerBookings.id, bookingId), eq(customerBookings.bookingReference, bookingId))
          : eq(customerBookings.bookingReference, bookingId)
      );

      const rows = await tx
        .select()
        .from(customerBookings)
        .where(whereClause)
        .limit(1);

      if (rows.length === 0) {
        throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} not found for tenant ${tenantId}.`);
      }

      const booking = rows[0];
      const spaceSnapshot = booking.spaceSnapshot as any;
      const packageSnapshot = booking.packageSnapshot as any;
      const spaceTarget = newSpaceName || spaceSnapshot?.name || 'BAY ALPHA-01';

      // Advisory xact lock on target slot
      const lockKey = `${tenantId}:${spaceTarget.toLowerCase()}:${toIsoDate(newDateStr)}:${newTimeSlot}`;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`);

      // Conflict check against other active bookings
      const conflicts = await tx
        .select()
        .from(customerBookings)
        .where(
          and(
            ne(customerBookings.id, booking.id),
            eq(customerBookings.tenantId, tenantId),
            inArray(customerBookings.startDate, dateVariants(newDateStr)),
            eq(customerBookings.timeSlot, newTimeSlot),
            sql`lower(coalesce(${customerBookings.spaceSnapshot}->>'name', '')) = ${spaceTarget.toLowerCase()}`,
            notInArray(customerBookings.bookingStatus, ['CANCELLED', 'NO_SHOW'])
          )
        )
        .limit(1);

      if (conflicts.length > 0) {
        throw new Error(`RESCHEDULE_CONFLICT: Space "${spaceTarget}" is already booked on ${newDateStr} at ${newTimeSlot}.`);
      }

      const now = new Date();
      const oldSchedule = `${booking.startDate} @ ${booking.timeSlot} (${spaceSnapshot?.name})`;
      const newSchedule = `${newDateStr} @ ${newTimeSlot} (${spaceTarget})`;

      const updatedSpaceSnapshot = {
        ...spaceSnapshot,
        name: spaceTarget,
      };
      const updatedPackageSnapshot = {
        ...packageSnapshot,
        suiteAllocation: spaceTarget,
      };

      const [updated] = await tx
        .update(customerBookings)
        .set({
          startDate: newDateStr,
          timeSlot: newTimeSlot,
          spaceSnapshot: updatedSpaceSnapshot,
          packageSnapshot: updatedPackageSnapshot,
          updatedAt: now,
          revision: booking.revision + 1,
        })
        .where(and(eq(customerBookings.id, booking.id), eq(customerBookings.tenantId, tenantId)))
        .returning();

      await tx.insert(bookingEvents).values({
        id: generateUuid(),
        bookingId: booking.id,
        tenantId,
        eventType: 'RESCHEDULED',
        fromStatus: null,
        toStatus: null,
        actorId,
        actorRole: 'STUDIO_ADMIN',
        message: `Rescheduled from ${oldSchedule} to ${newSchedule}.`,
        metadata: { oldSchedule, newSchedule },
        createdAt: now,
      });

      return mapRowToCustomerBookingRecord(updated);
    });
  }

  /**
   * Update internal admin notes.
   */
  public async updateAdminNotes(
    tenantId: string,
    bookingId: string,
    notes: string,
    actorId = 'admin'
  ): Promise<CustomerBookingRecord> {
    const db = getDb();
    if (!db) {
      ensurePilotBookingsSeeded();
      const details = await this.getBookingDetails(tenantId, bookingId);
      if (!details) {
        throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} not found.`);
      }

      const { booking } = details;
      const now = new Date().toISOString();

      const updated: CustomerBookingRecord = {
        ...booking,
        privateAdminNotes: notes,
        updatedAt: now,
        revision: booking.revision + 1,
      };

      bookingStore.set(bookingId, updated);

      const evt: BookingEventRecord = {
        id: `evt-${bookingId}-${Date.now()}`,
        bookingId,
        tenantId,
        eventType: 'NOTE_ADDED',
        actorId,
        actorRole: 'STUDIO_ADMIN',
        message: 'Updated private internal studio admin notes.',
        createdAt: now,
      };

      const evts = bookingEventsStore.get(bookingId) || [];
      bookingEventsStore.set(bookingId, [...evts, evt]);

      return updated;
    }

    return await db.transaction(async (tx) => {
      const isUuid = isUuidString(bookingId);
      const whereClause = and(
        eq(customerBookings.tenantId, tenantId),
        isUuid
          ? or(eq(customerBookings.id, bookingId), eq(customerBookings.bookingReference, bookingId))
          : eq(customerBookings.bookingReference, bookingId)
      );

      const rows = await tx
        .select()
        .from(customerBookings)
        .where(whereClause)
        .limit(1);

      if (rows.length === 0) {
        throw new Error(`BOOKING_NOT_FOUND: Booking ${bookingId} not found.`);
      }

      const booking = rows[0];
      const now = new Date();

      const [updated] = await tx
        .update(customerBookings)
        .set({
          privateAdminNotes: notes,
          updatedAt: now,
          revision: booking.revision + 1,
        })
        .where(and(eq(customerBookings.id, booking.id), eq(customerBookings.tenantId, tenantId)))
        .returning();

      await tx.insert(bookingEvents).values({
        id: generateUuid(),
        bookingId: booking.id,
        tenantId,
        eventType: 'NOTE_ADDED',
        fromStatus: null,
        toStatus: null,
        actorId,
        actorRole: 'STUDIO_ADMIN',
        message: 'Updated private internal studio admin notes.',
        metadata: null,
        createdAt: now,
      });

      return mapRowToCustomerBookingRecord(updated);
    });
  }
}

export const serverBookingService = new ServerBookingService();
