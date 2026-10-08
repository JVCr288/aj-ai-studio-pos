import type { Request, Response } from 'express';

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

export const sseSubscribers = new Map<string, Set<Response>>();

export function broadcastStudioEvent(event: StudioDomainEvent) {
  const message = `event: studio_event\ndata: ${JSON.stringify(event)}\n\n`;

  // Broadcast to specific tenant subscribers
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

  // Broadcast to wildcard subscribers
  const wildcardClients = sseSubscribers.get('*');
  if (wildcardClients) {
    for (const client of wildcardClients) {
      try {
        client.write(message);
      } catch {
        wildcardClients.delete(client);
      }
    }
  }
}

export function handleSseStream(req: Request, res: Response) {
  const tenantId = req.query.tenantId as string;
  if (!tenantId) {
    return res.status(400).json({
      error: 'tenantId query parameter is required',
      code: 'MISSING_TENANT_ID',
    });
  }

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
