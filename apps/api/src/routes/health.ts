import type { FastifyPluginAsync } from 'fastify';

import { checkDatabaseConnection } from '../db.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    return {
      status: 'ok'
    };
  });

  app.get('/health/db', async (_request, reply) => {
    try {
      await checkDatabaseConnection();

      return {
        status: 'ok',
        database: 'connected'
      };
    } catch (error) {
      app.log.error({ err: error }, 'Database health check failed');

      return reply.code(503).send({
        status: 'error',
        database: 'unavailable'
      });
    }
  });
};
