import { CustomerBookingRecord, BookingSummaryCounts, BookingEventRecord, BookingStatus, PaymentStatus } from './serverBookingService';

const API_BASE = '/api';

let activeCsrfToken = '';

export function getAdminCsrfToken(): string {
  return activeCsrfToken;
}

export function setAdminCsrfToken(token: string): void {
  activeCsrfToken = token;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

/**
 * Helper to handle fetch responses and throw structured ApiErrors
 */
async function handleResponse<T>(res: Response, defaultErrMsg: string): Promise<T> {
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok || data.success === false) {
    if (res.status === 401) {
      throw new ApiError(data.error || 'Admin session missing or expired', 401, 'UNAUTHORIZED');
    }
    if (res.status === 403) {
      throw new ApiError(data.error || 'Access forbidden for current admin role', 403, 'FORBIDDEN');
    }
    if (res.status === 404) {
      throw new ApiError(data.error || 'Requested booking resource not found', 404, 'NOT_FOUND');
    }
    if (res.status === 409 || data.code === 'SLOT_DOUBLE_BOOKED' || data.code === 'SLOT_CONFLICT') {
      throw new ApiError(data.error || 'Slot availability conflict', 409, data.code || 'CONFLICT');
    }
    if (res.status === 503) {
      throw new ApiError(data.error || 'Database persistence unavailable', 503, 'DATABASE_UNAVAILABLE');
    }
    throw new ApiError(data.error || defaultErrMsg, res.status || 500, data.code);
  }

  return data;
}

/**
 * Submit customer booking to server persistence endpoint
 */
export async function submitCustomerBookingToServer(payload: any): Promise<CustomerBookingRecord> {
  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    const data = await handleResponse<{ success: boolean; booking: CustomerBookingRecord }>(res, 'Failed to persist booking');
    return data.booking;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to booking server. Please check connection.', 503, 'SERVER_UNAVAILABLE');
  }
}

export interface AdminLoginPayload {
  tenantId: string;
  adminKey: string;
}

/**
 * Shared canonical payload builder for Admin Login request contract
 */
export function createAdminLoginPayload(tenantId: string, adminKey: string): AdminLoginPayload {
  return {
    tenantId: tenantId || 'akk-photo-studio',
    adminKey: adminKey || '',
  };
}

/**
 * Authenticate studio admin session
 */
export async function loginStudioAdmin(
  adminKey: string,
  tenantId = 'akk-photo-studio'
): Promise<{ tenantId: string; userRole: string; userName: string; csrfToken: string }> {
  try {
    const payload = createAdminLoginPayload(tenantId, adminKey);
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    const data = await handleResponse<{
      success: boolean;
      tenantId: string;
      userRole: string;
      userName: string;
      csrfToken: string;
    }>(res, 'Authentication failed');

    setAdminCsrfToken(data.csrfToken);
    return data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to authentication service', 503, 'SERVER_UNAVAILABLE');
  }
}

/**
 * Check existing studio admin session
 */
export async function fetchStudioAdminSession(): Promise<{
  authenticated: boolean;
  tenantId: string;
  userRole: string;
  userName: string;
  csrfToken: string;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/session`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.authenticated) {
      setAdminCsrfToken(data.csrfToken);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Logout studio admin
 */
export async function logoutStudioAdmin(): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // ignore
  }
  setAdminCsrfToken('');
}

/**
 * Fetch tenant-isolated summary counts
 */
export async function fetchAdminBookingSummary(tenantId = 'akk-photo-studio'): Promise<BookingSummaryCounts> {
  try {
    const res = await fetch(`${API_BASE}/admin/bookings/summary?tenantId=${encodeURIComponent(tenantId)}`, {
      headers: {
        'x-tenant-id': tenantId,
      },
      credentials: 'include',
    });

    const data = await handleResponse<{ success: boolean; summary: BookingSummaryCounts }>(res, 'Failed to fetch summary');
    return data.summary;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to summary service', 503, 'SERVER_UNAVAILABLE');
  }
}

/**
 * Fetch filtered & paginated admin bookings
 */
export async function fetchAdminBookings(params: {
  tenantId?: string;
  query?: string;
  status?: string;
  paymentStatus?: string;
  space?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: CustomerBookingRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const tenantId = params.tenantId || 'akk-photo-studio';
  const queryParams = new URLSearchParams();
  queryParams.set('tenantId', tenantId);
  if (params.query) queryParams.set('query', params.query);
  if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
  if (params.paymentStatus && params.paymentStatus !== 'ALL') queryParams.set('paymentStatus', params.paymentStatus);
  if (params.space && params.space !== 'ALL') queryParams.set('space', params.space);
  if (params.date) queryParams.set('date', params.date);
  if (params.page) queryParams.set('page', String(params.page));
  if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));

  try {
    const res = await fetch(`${API_BASE}/admin/bookings?${queryParams.toString()}`, {
      headers: {
        'x-tenant-id': tenantId,
      },
      credentials: 'include',
    });

    return await handleResponse(res, 'Failed to query bookings');
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to booking query service', 503, 'SERVER_UNAVAILABLE');
  }
}

/**
 * Fetch booking details with audit timeline
 */
export async function fetchBookingDetails(
  bookingId: string,
  tenantId = 'akk-photo-studio'
): Promise<{ booking: CustomerBookingRecord; events: BookingEventRecord[] }> {
  try {
    const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}?tenantId=${encodeURIComponent(tenantId)}`, {
      headers: {
        'x-tenant-id': tenantId,
      },
      credentials: 'include',
    });

    const data = await handleResponse<{ success: boolean; booking: CustomerBookingRecord; events: BookingEventRecord[] }>(
      res,
      'Failed to fetch details'
    );
    return { booking: data.booking, events: data.events };
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to booking details service', 503, 'SERVER_UNAVAILABLE');
  }
}

/**
 * Admin review payment evidence
 */
export async function reviewBookingPayment(
  bookingId: string,
  decision: 'VERIFY' | 'REJECT',
  amountPaidMMK?: number,
  notes?: string,
  tenantId = 'akk-photo-studio'
): Promise<CustomerBookingRecord> {
  try {
    const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/payment-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-csrf-token': getAdminCsrfToken(),
      },
      body: JSON.stringify({ decision, amountPaidMMK, notes }),
      credentials: 'include',
    });

    const data = await handleResponse<{ success: boolean; booking: CustomerBookingRecord }>(res, 'Payment review failed');
    return data.booking;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to payment review service', 503, 'SERVER_UNAVAILABLE');
  }
}

/**
 * Update booking lifecycle status
 */
export async function updateAdminBookingStatus(
  bookingId: string,
  targetStatus: BookingStatus,
  reason?: string,
  expectedRevision?: number,
  tenantId = 'akk-photo-studio'
): Promise<CustomerBookingRecord> {
  try {
    const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-csrf-token': getAdminCsrfToken(),
      },
      body: JSON.stringify({ targetStatus, reason, expectedRevision }),
      credentials: 'include',
    });

    const data = await handleResponse<{ success: boolean; booking: CustomerBookingRecord }>(res, 'Status update failed');
    return data.booking;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to status update service', 503, 'SERVER_UNAVAILABLE');
  }
}

/**
 * Reschedule booking
 */
export async function rescheduleAdminBooking(
  bookingId: string,
  newDateStr: string,
  newTimeSlot: string,
  newSpaceName?: string,
  tenantId = 'akk-photo-studio'
): Promise<CustomerBookingRecord> {
  try {
    const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/schedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-csrf-token': getAdminCsrfToken(),
      },
      body: JSON.stringify({ newDateStr, newTimeSlot, newSpaceName }),
      credentials: 'include',
    });

    const data = await handleResponse<{ success: boolean; booking: CustomerBookingRecord }>(res, 'Reschedule failed');
    return data.booking;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to reschedule service', 503, 'SERVER_UNAVAILABLE');
  }
}

/**
 * Update private admin notes
 */
export async function updateAdminPrivateNotes(
  bookingId: string,
  notes: string,
  tenantId = 'akk-photo-studio'
): Promise<CustomerBookingRecord> {
  try {
    const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/notes`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-csrf-token': getAdminCsrfToken(),
      },
      body: JSON.stringify({ notes }),
      credentials: 'include',
    });

    const data = await handleResponse<{ success: boolean; booking: CustomerBookingRecord }>(res, 'Notes update failed');
    return data.booking;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to notes service', 503, 'SERVER_UNAVAILABLE');
  }
}
