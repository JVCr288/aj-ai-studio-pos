import { useEffect, useState, useRef, useCallback } from 'react';

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

export type EventStreamStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

interface UseStudioRealtimeEventsOptions {
  tenantId?: string;
  enabled?: boolean;
  playChime?: boolean;
  onEvent?: (event: StudioDomainEvent) => void;
}

/**
 * Synthesizes a pleasant dual-tone notification chime using Web Audio API.
 * Requires zero external audio files.
 */
function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 880Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tone 2: 1320Hz (E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.1);
    gain2.gain.setValueAtTime(0.06, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch {
    // Ignore audio permission or context restrictions safely
  }
}

/**
 * REAL-TIME EVENT STREAM HOOK (PHASE 11 ENTERPRISE REAL-TIME SYNCHRONIZATION)
 *
 * Connects to server-sent events (SSE) endpoint /api/events/stream, provides
 * zero-latency push notifications for bookings, payments, and POS settlements.
 */
export function useStudioRealtimeEvents({
  tenantId = 'aj-ai-studio',
  enabled = true,
  playChime = true,
  onEvent,
}: UseStudioRealtimeEventsOptions = {}) {
  const [connectionStatus, setConnectionStatus] = useState<EventStreamStatus>('DISCONNECTED');
  const [lastEvent, setLastEvent] = useState<StudioDomainEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionStatus('CONNECTING');
    const url = '/api/events/stream';
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('handshake', () => {
      setConnectionStatus('CONNECTED');
    });

    es.addEventListener('studio_event', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as StudioDomainEvent;
        setLastEvent(parsed);

        if (playChime && (parsed.type === 'BOOKING_CREATED' || parsed.type === 'PAYMENT_VERIFIED')) {
          playNotificationChime();
        }

        if (onEventRef.current) {
          onEventRef.current(parsed);
        }
      } catch {
        // Safe JSON parse fallthrough
      }
    });

    es.onopen = () => {
      setConnectionStatus('CONNECTED');
    };

    es.onerror = () => {
      setConnectionStatus('DISCONNECTED');
      es.close();
      eventSourceRef.current = null;

      // Auto-reconnect after 4s
      if (enabled) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 4000);
      }
    };
  }, [enabled, tenantId, playChime]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return {
    connectionStatus,
    lastEvent,
    reconnect: connect,
    playNotificationChime,
  };
}
