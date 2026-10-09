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

export const corsOptionsDelegate: cors.CorsOptionsDelegate<Request> = (req, callback) => {
  const origin = req.header('Origin');
  // Allow requests without Origin (e.g. server-to-server, curl, non-browser)
  if (!origin) {
    return callback(null, { origin: true, credentials: true });
  }

  // Request-aware same-origin check: allow when Origin matches server's own origin
  const forwardedHost = req.get('x-forwarded-host');
  const host = (req.app.get('trust proxy') && forwardedHost)
    ? forwardedHost.split(',')[0].trim()
    : req.get('host');
  const ownOrigin = host ? `${req.protocol}://${host}` : null;

  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS;
  const configuredOrigins: string[] = rawAllowedOrigins
    ? rawAllowedOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : (process.env.NODE_ENV === 'production' ? [] : defaultDevOrigins);

  if ((ownOrigin && origin === ownOrigin) || configuredOrigins.includes(origin)) {
    return callback(null, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-csrf-token', 'x-admin-key', 'Authorization'],
      credentials: true,
      optionsSuccessStatus: 204,
    });
  }

  return callback(new Error('CORS_NOT_ALLOWED'));
};

export const corsMiddleware = cors(corsOptionsDelegate);

export const corsErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.message === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({
      error: 'Access denied by CORS policy',
    });
  }
  next(err);
};
