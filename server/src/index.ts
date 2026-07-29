import { runMigrations } from './db/connection.js';
import app from './app.js';

const PORT = process.env.PORT || 3001;

// ─── Performance Note ────────────────────────────────────────────────────────
// Response time requirement:
// All API endpoints MUST respond within 5 seconds under normal operation.
// This excludes calls to external AI providers (which have their own 30s timeout).
// Rate limiting is applied per-route on public endpoints (auth, course/public, declarations POST).
// See individual route files for per-route rate limiter configuration.

async function start(): Promise<void> {
  try {
    await runMigrations();
    console.log('Database ready.');
  } catch (error) {
    console.error('Failed to run database migrations:', error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`IATA API server running on port ${PORT}`);
  });
}

start();

export default app;
