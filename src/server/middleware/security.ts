import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import type { Request, Response, NextFunction } from 'express';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://images.unsplash.com',
        'https://*.unsplash.com',
      ],
      connectSrc: [
        "'self'",
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3010',
        'http://localhost:4000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3010',
        'http://127.0.0.1:4000',
        'ws://localhost:3000',
        'ws://localhost:3001',
        'ws://localhost:3010',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
      ],
      mediaSrc: ["'self'", 'data:', 'blob:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts:
    process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

export const permissionsPolicyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), publickey-credentials-get=(self)'
  );
  next();
};

const rawAllowedOrigins = process.env.ALLOWED_ORIGINS;
const defaultDevOrigins = [
  'http://localhost:3010',
  'http://127.0.0.1:3010',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
];
const allowedOrigins: string[] = rawAllowedOrigins
  ? rawAllowedOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : (process.env.NODE_ENV === 'production' ? [] : defaultDevOrigins);

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permit requests with no origin (e.g. same-origin SPA in production, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Reject unauthorized cross-origin request safely
    return callback(new Error('CORS_NOT_ALLOWED'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-csrf-token', 'x-admin-key', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);

export const corsErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.message === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({
      error: 'Access denied by CORS policy',
    });
  }
  next(err);
};
