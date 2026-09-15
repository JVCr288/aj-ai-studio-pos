import { BookingState } from '../types';
import { TenantConfig, getTenantConfig } from '../config/tenantConfig';

export interface TelegramWebhookPayload {
  chat_id: string;
  text: string;
  parse_mode: 'HTML';
  disable_web_page_preview?: boolean;
  reply_markup?: {
    inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
  };
}

export interface TelegramWebhookResponse {
  ok: boolean;
  result: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username: string;
    };
    chat: {
      id: number;
      username: string;
      type: string;
    };
    date: number;
    text: string;
  };
}

export interface TelegramWebhookResult {
  success: boolean;
  status: number;
  messageId: string;
  recipientHandle: string;
  dispatchedAt: string;
  timestamp: number;
  deliveryLatencyMs: number;
  endpoint: string;
  payload: TelegramWebhookPayload;
  response: TelegramWebhookResponse;
}

/**
 * Normalizes a Telegram username or phone number (e.g. "elena_rostova" -> "@elena_rostova")
 */
export function normalizeTelegramHandle(handle: string): string {
  if (!handle) return '';
  const trimmed = handle.trim();
  if (trimmed.startsWith('@')) return trimmed;
  if (/^[a-zA-Z0-9_]{5,32}$/.test(trimmed)) {
    return `@${trimmed}`;
  }
  return trimmed;
}

/**
 * Validates telegram handle syntax
 */
export function validateTelegramHandle(handle: string): { valid: boolean; error?: string } {
  if (!handle || handle.trim().length === 0) {
    return { valid: false, error: 'Telegram handle cannot be empty' };
  }
  const clean = handle.replace(/^@/, '').trim();
  if (clean.length < 3) {
    return { valid: false, error: 'Telegram handle is too short (min 3 characters)' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    return { valid: false, error: 'Handle can only contain letters, numbers, and underscores' };
  }
  return { valid: true };
}

/**
 * Generates formatted HTML confirmation text for Telegram Bot dispatch
 */
export function generateTelegramConfirmationMessage(
  bookingState: BookingState,
  tenantConfig?: TenantConfig
): string {
  const tenant = tenantConfig || getTenantConfig(bookingState.tenantId);
  const depositPaid = bookingState.depositPaid ? bookingState.depositAmount : 0;
  const balanceDue = Math.max(0, bookingState.totalAmount - depositPaid);
  const handle = normalizeTelegramHandle(bookingState.telegramHandle || 'client');
  const botHandle = tenant.telegramBotUsername.startsWith('@')
    ? tenant.telegramBotUsername
    : `@${tenant.telegramBotUsername}`;

  const heading = tenant.telegramNotificationHeading || 'RESERVATION DETAILS (SIMULATION)';
  const footer =
    tenant.telegramMessageFooter ||
    'Note: Slip details extracted via AI OCR. Final booking confirmation requires studio ledger review.';

  return `📸 <b>${tenant.displayName.toUpperCase()} // ${heading}</b>
━━━━━━━━━━━━━━━━━━━━━
Dear <b>${bookingState.guestName || 'Valued Guest'}</b> (${handle}),
Your atelier darkroom & soundstage reservation has been registered in the provisional manifest.

<b>SESSION DETAILS:</b>
🏛️ <b>Bay Allocation:</b> ${bookingState.bayAllocation || 'BAY ALPHA-01'}
🗓️ <b>Date:</b> ${bookingState.dateStr}
⏰ <b>Time Slot:</b> ${bookingState.timeSlot}
📦 <b>Package:</b> ${bookingState.selectedPackage.name}
📍 <b>Atelier:</b> ${tenant.address}

<b>PASS CODES & LEDGER:</b>
🔑 <b>Session Token:</b> <code>${bookingState.token}</code>
🎟️ <b>Turnstile Gate Code:</b> <code>${bookingState.turnstileCode}</code>
💳 <b>Deposit Slip Detected:</b> ${depositPaid.toLocaleString()} MMK (OCR Audited)
⏳ <b>Balance at Bay:</b> ${balanceDue.toLocaleString()} MMK
⚡ <b>Status:</b> SLIP DETAILS EXTRACTED // LEDGER AUDIT REQUIRED

${
  bookingState.briefingNotes && bookingState.briefingNotes.trim().length > 0
    ? `📝 <b>Atelier Notes:</b> <i>"${bookingState.briefingNotes.trim()}"</i>\n`
    : ''
}━━━━━━━━━━━━━━━━━━━━━
<i>${footer}</i>

🤖 Dispatched via <b>${botHandle} (Development Simulation)</b>`;
}

/**
 * Creates Telegram Webhook Payload object
 */
export function buildTelegramWebhookPayload(
  bookingState: BookingState,
  tenantConfig?: TenantConfig
): TelegramWebhookPayload {
  const tenant = tenantConfig || getTenantConfig(bookingState.tenantId);
  const handle = normalizeTelegramHandle(bookingState.telegramHandle || '@guest');
  const passUrlBase = tenant.publicPassUrlBase || `${tenant.websiteUrl}/pass`;
  const vaultUrlBase = tenant.publicVaultUrlBase || `${tenant.websiteUrl}/vault`;
  const mapQuery = encodeURIComponent(tenant.address);

  return {
    chat_id: handle,
    text: generateTelegramConfirmationMessage(bookingState, tenant),
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🎟️ View Digital Bay Pass',
            url: `${passUrlBase}?token=${encodeURIComponent(bookingState.token)}`,
          },
          {
            text: '📍 Studio Map & Directions',
            url: `https://maps.google.com/?q=${mapQuery}`,
          },
        ],
        [
          {
            text: '📁 Access Deliverables Vault',
            url: `${vaultUrlBase}?token=${encodeURIComponent(bookingState.token)}`,
          },
        ],
      ],
    },
  };
}

/**
 * Simulates sending an automated confirmation webhook via Telegram Bot API
 */
export async function sendTelegramBookingWebhook(
  bookingState: BookingState,
  overrideHandle?: string,
  tenantConfig?: TenantConfig
): Promise<TelegramWebhookResult> {
  const tenant = tenantConfig || getTenantConfig(bookingState.tenantId);
  const handle = normalizeTelegramHandle(overrideHandle || bookingState.telegramHandle || '@guest');
  const now = new Date();
  const simulatedMessageId = Math.floor(100000 + Math.random() * 900000);
  const payload = buildTelegramWebhookPayload(
    {
      ...bookingState,
      telegramHandle: handle,
    },
    tenant
  );

  // Simulate network roundtrip latency to Telegram Bot API webhook gateway
  const latency = Math.floor(280 + Math.random() * 250);
  await new Promise((resolve) => setTimeout(resolve, latency));

  const cleanBotUsername = tenant.telegramBotUsername.replace(/^@/, '');

  const result: TelegramWebhookResult = {
    success: true,
    status: 200,
    messageId: `#TG-MSG-${simulatedMessageId}`,
    recipientHandle: handle,
    dispatchedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    timestamp: now.getTime(),
    deliveryLatencyMs: latency,
    endpoint: 'https://api.telegram.org/bot[CONFIGURED_BOT_TOKEN]/sendMessage',
    payload,
    response: {
      ok: true,
      result: {
        message_id: simulatedMessageId,
        from: {
          id: 7194029104,
          is_bot: true,
          first_name: tenant.telegramBotDisplayName,
          username: cleanBotUsername,
        },
        chat: {
          id: Math.floor(100000000 + Math.random() * 900000000),
          username: handle.replace(/^@/, ''),
          type: 'private',
        },
        date: Math.floor(now.getTime() / 1000),
        text: payload.text,
      },
    },
  };

  // Cache in localStorage history for transparency and auditing
  try {
    const existing = localStorage.getItem('aj_telegram_webhook_logs') || localStorage.getItem('akk_telegram_webhook_logs');
    const logs = existing ? JSON.parse(existing) : [];
    logs.unshift(result);
    localStorage.setItem('aj_telegram_webhook_logs', JSON.stringify(logs.slice(0, 10)));
  } catch {
    // ignore storage limits
  }

  return result;
}
