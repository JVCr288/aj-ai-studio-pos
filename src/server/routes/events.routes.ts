import { Router } from 'express';
import { handleSseStream } from '../events/sseBus.js';

export const eventsRouter = Router();

// Real-Time Event Bus (Server-Sent Events / SSE)
eventsRouter.get('/api/events/stream', handleSseStream);
