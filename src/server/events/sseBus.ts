import type { Request, Response } from 'express';
import { parseCookies } from '../utils/crypto.js';
import { resolveAdminSession } from '../middleware/auth.js';

export interface StudioDomainEvent {
  id: string;
  tenantId: string;
  type:
    | 'BOOKING_CREATED'
    | 'BOOKING_UPDATED'
    | 'PAYMENT_VERIFIED'
    | 'PAYMENT_REJECTED'
    | 'RESCHEDULED'
    | 'NOTE_UPDATED'
    | 'POS_TRANSACTION_SETTLED';
  payload: Record<string, any>;
  timestamp: string;
}

// Strict tenant-scoped subscriber map (No wildcard platform stream in Phase 1)
export const sseSubscribers = new Map<string, Set<Response>>();

export function broadcastStudioEvent(event: StudioDomainEvent) {
  const message = `event: studio_event\ndata: ${JSON.stringify(event)}\n\n`;

  // Broadcast ONLY to specific tenant subscribers
  const tenantClients = sseSubscribers.get(event.tenantId);
  if (tenantClients) {
    for (const client of tenantClients) {
      try {
        client.write(message);
      } catch {
        tenantClients.delete(client);
      }
    }
  }
}

export async function handleSseStream(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, private');

  // Authenticate session from cookie or header
  const cookies = parseCookies(req);
  const sessionToken = cookies['aj_admin_session'] || (req.headers['x-admin-session'] as string);

  if (!sessionToken) {
    return res.status(401).json({
      error: 'UNAUTHORIZED_SSE: Studio admin session cookie required to establish event stream.',
      code: 'UNAUTHORIZED',
    });
  }

  const session = await resolveAdminSession(sessionToken);
  if (!session || new Date() > session.expiresAt) {
    return res.status(401).json({
      error: 'EXPIRED_SSE_SESSION: Admin session has expired or is invalid.',
      code: 'UNAUTHORIZED',
    });
  }

  // Tenant is strictly bound to the authenticated session (Ignored from query param)
  const tenantId = session.tenantId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  if (!sseSubscribers.has(tenantId)) {
    sseSubscribers.set(tenantId, new Set());
  }
  sseSubscribers.get(tenantId)!.add(res);

  res.write(
    `event: CONNECTED\ndata: ${JSON.stringify({
      status: 'connected',
      tenantId,
      message: 'SSE Stream Active',
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseSubscribers.get(tenantId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        sseSubscribers.delete(tenantId);
      }
    }
  });
}
