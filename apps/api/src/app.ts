import Fastify, { type FastifyInstance } from 'fastify';

import { closeDatabasePool, hasDatabasePool } from './db.js';
import { dealRoutes } from './routes/deals.js';
import { healthRoutes } from './routes/health.js';
import { internalDealCandidateRoutes } from './routes/internal/deal-candidates.js';
import { internalDealCandidateExtractionRoutes } from './routes/internal/deal-candidates-extract.js';
import { internalSourceTargetRoutes } from './routes/internal/source-targets.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  app.register(healthRoutes);
  app.register(dealRoutes);
  app.register(internalDealCandidateRoutes);
  app.register(internalDealCandidateExtractionRoutes);
  app.register(internalSourceTargetRoutes);

  app.addHook('onClose', async () => {
    if (hasDatabasePool()) {
      await closeDatabasePool();
    }
  });

  return app;
}
