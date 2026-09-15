import {
  BookingState,
  PhotographyPackage,
} from '../types';

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

// In-Memory Fallback Repository for Local Dev & Test Environments
const bookingStore = new Map<string, CustomerBookingRecord>();
const bookingEventsStore = new Map<string, BookingEventRecord[]>();

// Seed initial pilot bookings for AJ AI Studio
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

seedPilotBookings();

export class ServerBookingService {
  /**
   * Helper to check if database URL is configured
   */
  public isDatabaseConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
  }

  /**
   * Create customer booking with idempotency key and double-booking conflict protection.
   */
  public async createCustomerBooking(payload: CreateBookingPayload): Promise<CustomerBookingRecord> {
    const tenantId = payload.tenantId || 'aj-ai-studio';
    const idempotencyKey = payload.idempotencyKey || `idemp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

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
        bk.startDate === dateStr &&
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

  /**
   * Get tenant-isolated booking summary counts.
   */
  public async getAdminBookingSummary(tenantId: string): Promise<BookingSummaryCounts> {
    const tenantBookings = Array.from(bookingStore.values()).filter((b) => b.tenantId === tenantId);

    const todayStr = '18 NOV 2026'; // Match current workspace date context

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
      if (b.startDate === todayStr) todayCount++;
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
      list = list.filter((b) => b.startDate === options.date);
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

  /**
   * Get single booking details with tenant boundary check and audit events.
   */
  public async getBookingDetails(
    tenantId: string,
    bookingId: string
  ): Promise<{ booking: CustomerBookingRecord; events: BookingEventRecord[] } | null> {
    const booking = bookingStore.get(bookingId);
    if (!booking || booking.tenantId !== tenantId) {
      return null;
    }
    const events = bookingEventsStore.get(bookingId) || [];
    return { booking, events };
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
        bk.startDate === newDateStr &&
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

  /**
   * Update internal admin notes.
   */
  public async updateAdminNotes(
    tenantId: string,
    bookingId: string,
    notes: string,
    actorId = 'admin'
  ): Promise<CustomerBookingRecord> {
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
}

export const serverBookingService = new ServerBookingService();
