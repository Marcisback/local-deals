import Fastify, { type FastifyInstance } from 'fastify';

import { closeDatabasePool, hasDatabasePool } from './db.js';
import { dealRoutes } from './routes/deals.js';
import { healthRoutes } from './routes/health.js';
import { internalDealCandidateRoutes } from './routes/internal/deal-candidates.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  app.register(healthRoutes);
  app.register(dealRoutes);
  app.register(internalDealCandidateRoutes);

  app.addHook('onClose', async () => {
    if (hasDatabasePool()) {
      await closeDatabasePool();
    }
  });

  return app;
}
