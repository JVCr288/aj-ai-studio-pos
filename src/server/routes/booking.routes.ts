import { Router, Request, Response } from 'express';
import { bookingSubmissionRateLimiter } from '../middleware/rateLimiters.js';
import { verifyStudioAdminMiddleware, AdminSessionRecord } from '../middleware/auth.js';
import { broadcastStudioEvent } from '../events/sseBus.js';
import { serverBookingService, BookingStatus } from '../../services/serverBookingService.js';

export const bookingRouter = Router();

// Public Customer Booking Creation Endpoint
bookingRouter.post('/api/bookings', bookingSubmissionRateLimiter, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  try {
    const payload = req.body;
    if (!payload.dateStr || !payload.timeSlot || !payload.guestName || !payload.clientPhone) {
      return res.status(400).json({ error: 'MISSING_BOOKING_FIELDS: Required customer and schedule fields missing.' });
    }

    const booking = await serverBookingService.createCustomerBooking(payload);

    broadcastStudioEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tenantId: booking.tenantId,
      type: 'BOOKING_CREATED',
      payload: {
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        startDate: booking.startDate,
        timeSlot: booking.timeSlot,
        space: booking.spaceSnapshot.name,
        totalAmount: booking.totalAmount,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
      },
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({ success: true, booking });
  } catch (err: any) {
    if (err?.message?.includes('SLOT_DOUBLE_BOOKED')) {
      return res.status(409).json({ error: err.message, code: 'SLOT_DOUBLE_BOOKED' });
    }
    return res.status(500).json({ error: err?.message || 'Failed to create booking' });
  }
});

// Admin Booking Summary Counts
bookingRouter.get('/api/admin/bookings/summary', verifyStudioAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = res.locals.tenantId;
    const summary = await serverBookingService.getAdminBookingSummary(tenantId);
    return res.json({ success: true, summary });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch booking summary' });
  }
});

// Admin Booking Query & Search List
bookingRouter.get('/api/admin/bookings', verifyStudioAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = res.locals.tenantId;
    const { query, status, paymentStatus, space, date, page, pageSize } = req.query;

    const result = await serverBookingService.queryAdminBookings(tenantId, {
      query: query as string,
      status: status as string,
      paymentStatus: paymentStatus as string,
      space: space as string,
      date: date as string,
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to query bookings' });
  }
});

// Admin Booking Details & Audit Events
bookingRouter.get('/api/admin/bookings/:bookingId', verifyStudioAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = res.locals.tenantId;
    const bookingId = req.params.bookingId;

    const details = await serverBookingService.getBookingDetails(tenantId, bookingId);
    if (!details) {
      return res.status(404).json({ error: `BOOKING_NOT_FOUND: Booking ${bookingId} not found.` });
    }

    return res.json({ success: true, booking: details.booking, events: details.events });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch booking details' });
  }
});

// Admin Review Payment Evidence
bookingRouter.post('/api/admin/bookings/:bookingId/payment-review', verifyStudioAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const session = res.locals.adminSession as AdminSessionRecord;
    if (session.userRole === 'VIEWER') {
      return res.status(403).json({ error: 'READ_ONLY_ROLE: Viewer role cannot mutate payment review status.' });
    }

    const tenantId = res.locals.tenantId;
    const bookingId = req.params.bookingId;
    const { decision, amountPaidMMK, notes } = req.body || {};

    if (!decision || (decision !== 'VERIFY' && decision !== 'REJECT')) {
      return res.status(400).json({ error: 'INVALID_DECISION: Decision must be VERIFY or REJECT.' });
    }

    const updated = await serverBookingService.reviewPaymentEvidence(
      tenantId,
      bookingId,
      decision,
      amountPaidMMK,
      notes,
      session.userName
    );

    broadcastStudioEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tenantId,
      type: decision === 'VERIFY' ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
      payload: {
        bookingId: updated.id,
        bookingReference: updated.bookingReference,
        customerName: updated.customerName,
        verifiedPaidAmount: updated.verifiedPaidAmount,
        outstandingBalance: updated.outstandingBalance,
        bookingStatus: updated.bookingStatus,
        paymentStatus: updated.paymentStatus,
      },
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, booking: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Payment review failed' });
  }
});

// Admin Update Booking Lifecycle Status
bookingRouter.patch('/api/admin/bookings/:bookingId/status', verifyStudioAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const session = res.locals.adminSession as AdminSessionRecord;
    if (session.userRole === 'VIEWER') {
      return res.status(403).json({ error: 'READ_ONLY_ROLE: Viewer role cannot mutate booking status.' });
    }

    const tenantId = res.locals.tenantId;
    const bookingId = req.params.bookingId;
    const { targetStatus, reason, expectedRevision } = req.body || {};

    if (!targetStatus) {
      return res.status(400).json({ error: 'MISSING_TARGET_STATUS' });
    }

    const updated = await serverBookingService.updateBookingStatus(
      tenantId,
      bookingId,
      targetStatus as BookingStatus,
      reason,
      expectedRevision,
      session.userName
    );

    broadcastStudioEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tenantId,
      type: 'BOOKING_UPDATED',
      payload: {
        bookingId: updated.id,
        bookingReference: updated.bookingReference,
        customerName: updated.customerName,
        bookingStatus: updated.bookingStatus,
        revision: updated.revision,
      },
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, booking: updated });
  } catch (err: any) {
    if (err?.message?.includes('OPTIMISTIC_LOCK_CONCURRENT_UPDATE')) {
      return res.status(409).json({ error: err.message, code: 'STALE_REVISION' });
    }
    return res.status(500).json({ error: err?.message || 'Failed to update booking status' });
  }
});

// Admin Reschedule Booking
bookingRouter.patch('/api/admin/bookings/:bookingId/schedule', verifyStudioAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const session = res.locals.adminSession as AdminSessionRecord;
    if (session.userRole === 'VIEWER') {
      return res.status(403).json({ error: 'READ_ONLY_ROLE: Viewer role cannot reschedule bookings.' });
    }

    const tenantId = res.locals.tenantId;
    const bookingId = req.params.bookingId;
    const { newDateStr, newTimeSlot, newSpaceName } = req.body || {};

    if (!newDateStr || !newTimeSlot) {
      return res.status(400).json({ error: 'MISSING_RESCHEDULE_SCHEDULE' });
    }

    const updated = await serverBookingService.rescheduleBooking(
      tenantId,
      bookingId,
      newDateStr,
      newTimeSlot,
      newSpaceName,
      session.userName
    );

    broadcastStudioEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tenantId,
      type: 'RESCHEDULED',
      payload: {
        bookingId: updated.id,
        bookingReference: updated.bookingReference,
        customerName: updated.customerName,
        startDate: updated.startDate,
        timeSlot: updated.timeSlot,
        space: updated.spaceSnapshot.name,
      },
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, booking: updated });
  } catch (err: any) {
    if (err?.message?.includes('RESCHEDULE_CONFLICT')) {
      return res.status(409).json({ error: err.message, code: 'SLOT_CONFLICT' });
    }
    return res.status(500).json({ error: err?.message || 'Failed to reschedule booking' });
  }
});

// Admin Update Private Notes
bookingRouter.patch('/api/admin/bookings/:bookingId/notes', verifyStudioAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const session = res.locals.adminSession as AdminSessionRecord;
    if (session.userRole === 'VIEWER') {
      return res.status(403).json({ error: 'READ_ONLY_ROLE: Viewer role cannot edit notes.' });
    }

    const tenantId = res.locals.tenantId;
    const bookingId = req.params.bookingId;
    const { notes } = req.body || {};

    const updated = await serverBookingService.updateAdminNotes(
      tenantId,
      bookingId,
      notes || '',
      session.userName
    );

    return res.json({ success: true, booking: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update admin notes' });
  }
});

// Admin Get Booking Audit Events
bookingRouter.get('/api/admin/bookings/:bookingId/events', verifyStudioAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = res.locals.tenantId;
    const bookingId = req.params.bookingId;

    const details = await serverBookingService.getBookingDetails(tenantId, bookingId);
    if (!details) {
      return res.status(404).json({ error: `BOOKING_NOT_FOUND: Booking ${bookingId} not found.` });
    }

    return res.json({ success: true, events: details.events });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch audit events' });
  }
});
