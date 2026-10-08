import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../../db/index.js';

export const healthRouter = Router();

// Health & Telemetry Endpoint
healthRouter.get('/api/health', async (req: Request, res: Response) => {
  const apiKeyPresent = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  const dbHealth = await checkDatabaseHealth();

  res.json({
    status: 'ok',
    service: 'AJ AI Studio Platform API',
    version: '2.4.0',
    gemini_configured: apiKeyPresent,
    database: dbHealth,
    node_version: process.version,
    timestamp: new Date().toISOString(),
  });
});
