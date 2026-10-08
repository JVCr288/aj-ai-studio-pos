import type { Request, Response, NextFunction } from 'express';

// Request Logger (Sanitizing payloads to protect customer privacy and API secrets)
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const audit = res.locals.auditInfo
      ? ` [source=${res.locals.auditInfo.source}, status=${res.locals.auditInfo.status}]`
      : '';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)${audit}`);
  });
  next();
};
