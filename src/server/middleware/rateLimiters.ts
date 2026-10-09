import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';

// Rate Limiting for High-Cost OCR Endpoint (Max 5 requests per minute per IP)
export const ocrRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    return res.status(429).json({
      success: false,
      is_valid_slip: false,
      verification_source: 'unavailable',
      verification_status: 'unverified',
      transaction_id: null,
      amount_mmk: null,
      timestamp: null,
      payer_name: null,
      confidence: 0,
      raw_text: '',
      warnings: ['Verification rate limit reached. Maximum 5 verification attempts allowed per minute.'],
      error: 'Too many verification requests from this client. Please wait 1 minute before retrying.',
    });
  },
});

// Rate Limiting for Owner Setup Portal Endpoints (Max 30 requests per minute per IP)
export const setupRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    return res.status(429).json({
      error: 'Too many setup portal requests. Please slow down.',
    });
  },
});

// Public Rate Limiter for Customer Booking Submission (Max 15 requests per minute per IP)
export const bookingSubmissionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    return res.status(429).json({
      error: 'Too many booking attempts. Please wait 1 minute before retrying.',
    });
  },
});

// Admin Login Rate Limiter (Max 5 failed attempts per 15 min per IP+tenant)
export const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request) => {
    const tenant = (req.body?.tenantSlug || req.body?.tenantId || 'global') as string;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${ip}:${tenant}`;
  },
  handler: (req: Request, res: Response) => {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Too many failed login attempts. Please wait 15 minutes before retrying.',
    });
  },
});

