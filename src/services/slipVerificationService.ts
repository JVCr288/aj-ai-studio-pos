import { VerifySlipRequest, VerifySlipResponse } from '../types';

/**
 * Checks connectivity to the backend API gateway and whether Gemini Vision is configured.
 */
export async function checkBackendHealth(): Promise<{
  available: boolean;
  gemini_configured: boolean;
  version?: string;
}> {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (!res.ok) {
      return { available: false, gemini_configured: false };
    }
    const data = await res.json();
    return {
      available: data.status === 'ok',
      gemini_configured: Boolean(data.gemini_configured),
      version: data.version,
    };
  } catch {
    return { available: false, gemini_configured: false };
  }
}

/**
 * Sends payment slip image to backend OCR endpoint for Gemini multimodal verification.
 * Automatically handles timeout and returns a structured response.
 */
export async function verifySlip(payload: VerifySlipRequest): Promise<VerifySlipResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second cutoff

  try {
    const response = await fetch('/api/verify-slip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        success: false,
        is_valid_slip: false,
        verification_source: 'unavailable',
        verification_status: 'manual_review_required',
        transaction_id: null,
        amount_mmk: null,
        timestamp: null,
        payer_name: null,
        confidence: 0,
        raw_text: '',
        warnings: [],
        error: errorBody.error || `Server responded with HTTP ${response.status}`,
      };
    }

    const data: VerifySlipResponse = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    const isAbort = error.name === 'AbortError';

    return {
      success: false,
      is_valid_slip: false,
      verification_source: 'unavailable',
      verification_status: 'manual_review_required',
      transaction_id: null,
      amount_mmk: null,
      timestamp: null,
      payer_name: null,
      confidence: 0,
      raw_text: '',
      warnings: ['Backend connection unavailable, manual studio desk check-in required'],
      error: isAbort ? 'Verification request timed out (15s limit)' : (error.message || 'Network error'),
    };
  }
}
