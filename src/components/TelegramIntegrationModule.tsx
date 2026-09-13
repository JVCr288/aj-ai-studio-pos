import React, { useState } from 'react';
import { BookingState } from '../types';
import { getTenantConfig } from '../config/tenantConfig';
import {
  sendTelegramBookingWebhook,
  normalizeTelegramHandle,
  validateTelegramHandle,
  buildTelegramWebhookPayload,
  TelegramWebhookResult,
} from '../utils/telegramWebhook';
import {
  Send,
  Check,
  CheckCircle2,
  RefreshCw,
  Eye,
  Radio,
  ExternalLink,
  Copy,
  X,
  Code2,
  MessageSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface TelegramIntegrationModuleProps {
  bookingState: BookingState;
  onUpdateBooking: (updates: Partial<BookingState>) => void;
}

export const TelegramIntegrationModule: React.FC<TelegramIntegrationModuleProps> = ({
  bookingState,
  onUpdateBooking,
}) => {
  const tenant = getTenantConfig(bookingState.tenantId);
  const botHandle = tenant.telegramBotUsername.startsWith('@')
    ? tenant.telegramBotUsername
    : `@${tenant.telegramBotUsername}`;

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TelegramWebhookResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'preview' | 'payload' | 'response'>('preview');
  const [copiedText, setCopiedText] = useState(false);
  const [toastNotification, setToastNotification] = useState<{
    show: boolean;
    title: string;
    detail: string;
  }>({
    show: false,
    title: '',
    detail: '',
  });

  const isConnected = Boolean(bookingState.telegramConnected && bookingState.telegramHandle);
  const autoNotify = bookingState.telegramAutoNotify ?? true;

  const triggerToast = (title: string, detail: string) => {
    setToastNotification({ show: true, title, detail });
    setTimeout(() => {
      setToastNotification({ show: false, title: '', detail: '' });
    }, 4500);
  };

  const handleConnectTelegram = async () => {
    setErrorMessage(null);
    const validation = validateTelegramHandle(bookingState.telegramHandle);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid Telegram handle');
      return;
    }

    const normalized = normalizeTelegramHandle(bookingState.telegramHandle);
    onUpdateBooking({ telegramHandle: normalized });

    setIsConnecting(true);
    try {
      // Simulate webhook registration and handshake
      const result = await sendTelegramBookingWebhook(bookingState, normalized, tenant);
      setLastResult(result);
      onUpdateBooking({
        telegramConnected: true,
        telegramAutoNotify: true,
        telegramLastNotified: result.dispatchedAt,
      });

      triggerToast(
        'Telegram Bot Connected!',
        `Webhook verified. Automated booking notifications active for ${normalized}.`
      );
    } catch {
      setErrorMessage('Failed to connect to Telegram Bot gateway. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onUpdateBooking({
      telegramConnected: false,
      telegramAutoNotify: false,
    });
    setLastResult(null);
    triggerToast('Telegram Disconnected', 'Automatic Telegram notifications paused.');
  };

  const handleSendTestWebhook = async () => {
    if (!bookingState.telegramHandle) return;
    setIsSendingWebhook(true);
    try {
      const result = await sendTelegramBookingWebhook(bookingState, undefined, tenant);
      setLastResult(result);
      onUpdateBooking({ telegramLastNotified: result.dispatchedAt });
      triggerToast(
        'Telegram Confirmation Sent!',
        `Message ${result.messageId} delivered to ${result.recipientHandle} via webhook.`
      );
    } catch {
      setErrorMessage('Failed to dispatch webhook to Telegram.');
    } finally {
      setIsSendingWebhook(false);
    }
  };

  const handleCopyPayload = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-xl p-3 space-y-2.5 transition-all">
      {/* Header with Telegram Branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
            <Send className="w-3.5 h-3.5 -rotate-12 translate-x-[-0.5px] translate-y-[0.5px]" />
          </div>
          <div>
            <span className="font-sans font-semibold text-xs tracking-wider text-[#F1F5F9] uppercase block">
              Telegram Confirmation Webhook
            </span>
            <span className="font-mono text-[10px] text-[#7E8F9F]">
              {botHandle} (Simulated Integration)
            </span>
          </div>
        </div>

        {isConnected ? (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
            CONNECTED (SIMULATED)
          </span>
        ) : (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#030F1E] border border-[#1E3A4F] text-[#7E8F9F]">
            NOT CONNECTED
          </span>
        )}
      </div>

      {/* Telegram Handle Input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="telegram-handle-input"
            className="block font-mono text-[9px] text-[#7E8F9F] uppercase"
          >
            Telegram Username / Handle
          </label>
          {isConnected && (
            <span className="font-mono text-[9.5px] text-[#7E8F9F]">
              Simulated Latency: {lastResult?.deliveryLatencyMs || 24}ms
            </span>
          )}
        </div>

        <div className="relative flex items-center">
          <div className="absolute left-3 text-[#7E8F9F] font-mono text-xs select-none">
            @
          </div>
          <input
            id="telegram-handle-input"
            type="text"
            value={bookingState.telegramHandle.replace(/^@/, '')}
            onChange={(e) => {
              const val = e.target.value.trim();
              onUpdateBooking({
                telegramHandle: val ? (val.startsWith('@') ? val : `@${val}`) : '',
              });
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="elena_rostova"
            className="w-full bg-[#030F1E] border border-[#1E3A4F] focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] rounded-md pl-7 pr-24 py-1.5 font-mono text-xs text-[#F1F5F9] placeholder-[#7E8F9F] outline-none transition-all"
          />

          {/* Quick Action in input */}
          <div className="absolute right-1.5 flex items-center space-x-1">
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="font-mono text-[10px] text-[#7E8F9F] hover:text-[#FB7185] px-2 py-0.5 rounded bg-[#102538] hover:bg-[#FB7185]/10 border border-[#1E3A4F] transition-colors cursor-pointer"
                title="Disconnect Telegram Bot"
              >
                Disconnect
              </button>
            ) : null}
          </div>
        </div>

        {errorMessage && (
          <p className="font-mono text-[10px] text-[#FB7185]">{errorMessage}</p>
        )}
      </div>

      {/* Actions: Connect / Test Webhook / Preview Bot Message */}
      <div className="space-y-1.5 pt-0.5">
        {!isConnected ? (
          <button
            id="connect-telegram-btn"
            type="button"
            onClick={handleConnectTelegram}
            disabled={isConnecting || !bookingState.telegramHandle.trim()}
            className="w-full h-9 rounded-md bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-sans font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.2)] disabled:opacity-50 disabled:cursor-not-allowed group focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating Webhook Handshake...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 -rotate-12 group-hover:translate-x-0.5 transition-transform" />
                <span>Connect Simulated Webhook</span>
              </>
            )}
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              id="test-telegram-webhook-btn"
              type="button"
              onClick={handleSendTestWebhook}
              disabled={isSendingWebhook}
              className="h-8.5 px-3 rounded-md bg-[#102538] hover:bg-[#102538]/80 border border-[#1E3A4F] text-[#38BDF8] font-mono text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              {isSendingWebhook ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 -rotate-12" />
                  <span>Send Test Webhook</span>
                </>
              )}
            </button>

            <button
              id="preview-telegram-message-btn"
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="h-8.5 px-3 rounded-md bg-[#030F1E] hover:bg-[#102538] border border-[#1E3A4F] text-[#F1F5F9] font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              <Eye className="w-3.5 h-3.5 text-[#7E8F9F]" />
              <span>Preview Bot Message</span>
            </button>
          </div>
        )}

        {/* Auto-Dispatch Toggle */}
        <label className="flex items-start space-x-2.5 pt-0.5 cursor-pointer select-none group">
          <input
            id="telegram-auto-notify-toggle"
            type="checkbox"
            checked={autoNotify}
            onChange={(e) => onUpdateBooking({ telegramAutoNotify: e.target.checked })}
            className="mt-0.5 w-3.5 h-3.5 rounded border-[#1E3A4F] bg-[#030F1E] text-[#38BDF8] focus:ring-0 cursor-pointer accent-[#38BDF8]"
          />
          <span className="font-mono text-[10.5px] text-[#7E8F9F] group-hover:text-[#94A3B8] leading-tight">
            Automatically dispatch simulated Telegram confirmation with gate pass code &amp; directions upon booking verification.
          </span>
        </label>
      </div>

      {/* Status info bar when connected */}
      {isConnected && (
        <div className="bg-[#030F1E] rounded-md p-2.5 border border-[#1E3A4F] flex items-center justify-between text-[11px] font-mono text-[#7E8F9F]">
          <div className="flex items-center space-x-1.5 truncate">
            <Radio className="w-3 h-3 text-[#34D399] animate-pulse flex-shrink-0" />
            <span className="truncate">
              Target: <strong className="text-[#F1F5F9]">{bookingState.telegramHandle}</strong>
            </span>
          </div>
          <span className="text-[#7E8F9F] text-[10px] flex-shrink-0">
            {bookingState.telegramLastNotified
              ? `Dispatched ${bookingState.telegramLastNotified}`
              : 'Standby for booking'}
          </span>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastNotification.show && (
        <div
          id="telegram-webhook-toast"
          className="fixed bottom-6 right-6 z-50 bg-[#0B1B2B] border border-[#38BDF8]/60 rounded-lg p-4 shadow-2xl flex items-start space-x-3 text-xs font-mono text-[#F1F5F9] animate-in fade-in slide-in-from-bottom-3 duration-200 backdrop-blur-md max-w-sm"
        >
          <div className="w-8 h-8 rounded-md bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Send className="w-4 h-4 -rotate-12" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-[#38BDF8]">{toastNotification.title}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#102538] border border-[#1E3A4F] text-[#34D399]">
                200 OK (SIMULATED)
              </span>
            </div>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              {toastNotification.detail}
            </p>
          </div>
        </div>
      )}

      {/* Interactive Telegram Message & Webhook Inspector Modal */}
      {showPreviewModal && (
        <div
          id="telegram-preview-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        >
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#1E3A4F] flex items-center justify-between bg-[#030F1E]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-md bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 flex items-center justify-center">
                  <Send className="w-5 h-5 -rotate-12" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-[#F1F5F9] text-base flex items-center gap-2">
                    Telegram Confirmation Webhook
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                      LOCAL SIMULATION
                    </span>
                  </h3>
                  <p className="font-mono text-xs text-[#7E8F9F]">
                    Target: <span className="text-[#38BDF8]">{bookingState.telegramHandle}</span> // Bot: {botHandle}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-md hover:bg-[#102538] text-[#7E8F9F] hover:text-[#F1F5F9] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#1E3A4F] bg-[#071423] px-4 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveModalTab('preview')}
                className={`py-3 px-4 border-b-2 font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                  activeModalTab === 'preview'
                    ? 'border-[#38BDF8] text-[#38BDF8]'
                    : 'border-transparent text-[#7E8F9F] hover:text-[#F1F5F9]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Telegram Chat View</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('payload')}
                className={`py-3 px-4 border-b-2 font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                  activeModalTab === 'payload'
                    ? 'border-[#38BDF8] text-[#38BDF8]'
                    : 'border-transparent text-[#7E8F9F] hover:text-[#F1F5F9]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Webhook Payload JSON</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('response')}
                className={`py-3 px-4 border-b-2 font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                  activeModalTab === 'response'
                    ? 'border-[#38BDF8] text-[#38BDF8]'
                    : 'border-transparent text-[#7E8F9F] hover:text-[#F1F5F9]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>API Response (200 OK Simulated)</span>
              </button>
            </div>

            {/* Tab 1: Simulated Telegram Client Interface */}
            {activeModalTab === 'preview' && (
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#030F1E] space-y-4 font-sans">
                {/* Telegram Date Chip */}
                <div className="text-center">
                  <span className="font-mono text-[10px] bg-[#0B1B2B] text-[#7E8F9F] px-3 py-1 rounded-full border border-[#1E3A4F]">
                    Today
                  </span>
                </div>

                {/* Simulated Telegram Message Bubble */}
                <div className="max-w-lg bg-[#102538] text-[#F1F5F9] rounded-lg rounded-tl-sm p-4 shadow-xl border border-[#1E3A4F] space-y-3 font-sans text-sm relative">
                  {/* Bot Header inside bubble */}
                  <div className="flex items-center space-x-2 pb-2 border-b border-[#1E3A4F]">
                    <div className="w-6 h-6 rounded bg-[#38BDF8] text-[#071423] flex items-center justify-center text-xs font-bold font-sans uppercase">
                      {tenant.displayName.slice(0, 3)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#38BDF8] flex items-center gap-1">
                        <span>{tenant.telegramBotDisplayName}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                          SIMULATED BOT
                        </span>
                      </div>
                      <div className="text-[10px] text-[#7E8F9F] font-mono">
                        {botHandle}
                      </div>
                    </div>
                  </div>

                  {/* Body Content formatted */}
                  <div className="space-y-2 text-xs leading-relaxed text-[#F1F5F9] font-mono">
                    <p className="font-bold text-sm text-[#38BDF8]">
                      📸 {tenant.displayName.toUpperCase()} // {tenant.telegramNotificationHeading || 'RESERVATION DETAILS'}
                    </p>
                    <p className="text-[#94A3B8]">
                      Dear <strong className="text-[#F1F5F9]">{bookingState.guestName}</strong> ({bookingState.telegramHandle}),
                      your atelier darkroom &amp; soundstage reservation has been registered.
                    </p>

                    <div className="bg-[#0B1B2B] p-3 rounded-md border border-[#1E3A4F] space-y-1 text-[11px]">
                      <div>
                        🏛️ <strong>Bay Allocation:</strong> {bookingState.bayAllocation}
                      </div>
                      <div>
                        🗓️ <strong>Date:</strong> {bookingState.dateStr} at {bookingState.timeSlot}
                      </div>
                      <div>
                        📦 <strong>Package:</strong> {bookingState.selectedPackage.name}
                      </div>
                      <div>
                        🔑 <strong>Session Token:</strong>{' '}
                        <code className="bg-[#030F1E] px-1 py-0.5 rounded text-[#38BDF8] border border-[#1E3A4F]">
                          {bookingState.token}
                        </code>
                      </div>
                      <div>
                        🎟️ <strong>Turnstile Gate Code:</strong>{' '}
                        <code className="bg-[#030F1E] px-1 py-0.5 rounded text-[#34D399] border border-[#1E3A4F]">
                          {bookingState.turnstileCode}
                        </code>
                      </div>
                      <div>
                        💳 <strong>Deposit Status:</strong> {bookingState.depositAmount.toLocaleString()} MMK (Slip Attached • Ledger Pending)
                      </div>
                      {bookingState.briefingNotes && (
                        <div className="pt-1 text-[#7E8F9F] italic">
                          📝 <strong>Briefing:</strong> &ldquo;{bookingState.briefingNotes}&rdquo;
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-[#7E8F9F]">
                      Present your Turnstile Gate Code or digital QR pass at the security terminal 10 mins before call time.
                    </p>
                  </div>

                  {/* Inline Keyboards */}
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        className="py-1.5 px-3 rounded bg-[#030F1E] hover:bg-[#102538] border border-[#1E3A4F] text-[#38BDF8] text-xs font-mono font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        🎟️ View Digital Bay Pass
                      </button>
                      <button
                        type="button"
                        className="py-1.5 px-3 rounded bg-[#030F1E] hover:bg-[#102538] border border-[#1E3A4F] text-[#F1F5F9] text-xs font-mono font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        📍 Studio Map
                      </button>
                    </div>
                    <button
                      type="button"
                      className="w-full py-1.5 px-3 rounded bg-[#030F1E] hover:bg-[#102538] border border-[#1E3A4F] text-[#F1F5F9] text-xs font-mono font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      📁 Access Deliverables Vault
                    </button>
                  </div>

                  {/* Bubble Timestamp & Status Checkmarks */}
                  <div className="flex items-center justify-end space-x-1 text-[10px] text-[#7E8F9F] pt-1">
                    <span>{lastResult?.dispatchedAt || 'Just now'}</span>
                    <span className="text-[#38BDF8] font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Webhook JSON Payload */}
            {activeModalTab === 'payload' && (
              <div className="p-4 sm:p-5 overflow-auto flex-1 font-mono text-xs bg-[#030F1E]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#7E8F9F] text-[11px]">
                    POST https://api.telegram.org/bot[CONFIGURED_BOT_TOKEN]/sendMessage (Simulated Payload)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyPayload(
                        JSON.stringify(buildTelegramWebhookPayload(bookingState, tenant), null, 2)
                      )
                    }
                    className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#102538]/80 border border-[#1E3A4F] text-[#F1F5F9] text-xs flex items-center space-x-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3 h-3 text-[#34D399]" />
                        <span className="text-[#34D399]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[#34D399] leading-relaxed selection:bg-[#38BDF8] selection:text-black">
                  {JSON.stringify(buildTelegramWebhookPayload(bookingState, tenant), null, 2)}
                </pre>
              </div>
            )}

            {/* Tab 3: Telegram API Response */}
            {activeModalTab === 'response' && (
              <div className="p-4 sm:p-5 overflow-auto flex-1 font-mono text-xs bg-[#030F1E]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#34D399] text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                    HTTP 200 OK • Simulated Dispatch Latency: {lastResult?.deliveryLatencyMs || 312}ms
                  </span>
                </div>
                <pre className="text-[#38BDF8] leading-relaxed selection:bg-[#34D399] selection:text-black">
                  {JSON.stringify(
                    lastResult?.response || {
                      ok: true,
                      simulated: true,
                      result: {
                        message_id: 884920,
                        from: {
                          id: 7194029104,
                          is_bot: true,
                          first_name: tenant.telegramBotDisplayName,
                          username: tenant.telegramBotUsername.replace(/^@/, ''),
                        },
                        chat: {
                          id: 928374102,
                          username: bookingState.telegramHandle.replace(/^@/, ''),
                          type: 'private',
                        },
                        date: Math.floor(Date.now() / 1000),
                        status: 'delivered_and_read_simulated',
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-3.5 bg-[#030F1E] border-t border-[#1E3A4F] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-[#7E8F9F]">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Simulated Telegram Bot Webhook Gateway (Client-Side Simulation)</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSendTestWebhook}
                  disabled={isSendingWebhook}
                  className="px-3 py-1.5 rounded-md bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-sans font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  <Send className="w-3 h-3 -rotate-12" />
                  <span>Send Test Webhook</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
