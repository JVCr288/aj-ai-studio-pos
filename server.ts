import 'dotenv/config';
import { createApp } from './src/server/app.js';
import { broadcastStudioEvent, StudioDomainEvent } from './src/server/events/sseBus.js';

export { broadcastStudioEvent };
export type { StudioDomainEvent };

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[AJ AI Studio Platform API] Server running on http://localhost:${PORT}`);
  console.log(`[AJ AI Studio Platform API] Health check available at http://localhost:${PORT}/api/health`);
});

export default app;
