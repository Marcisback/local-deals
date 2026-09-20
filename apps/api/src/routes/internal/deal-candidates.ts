import type { FastifyPluginAsync } from 'fastify';

import { isDuplicateCandidateError, parseCandidateInput } from '../../lib/candidate-input.js';
import {
  createDealCandidate,
  getDealCandidateById,
  listPendingDealCandidates
} from '../../lib/candidate-service.js';

type DealCandidateRequestBody = {
  source?: {
    type?: unknown;
    url?: unknown;
    externalId?: unknown;
    label?: unknown;
    publishedAt?: unknown;
  };
  venueId?: unknown;
  title?: unknown;
  description?: unknown;
  rawText?: unknown;
  confidence?: unknown;
  schedules?: unknown;
  items?: unknown;
};

export const internalDealCandidateRoutes: FastifyPluginAsync = async (app) => {
  app.get('/internal/deal-candidates', async (_request, reply) => {
    try {
      const candidates = await listPendingDealCandidates();
      return { candidates };
    } catch (error) {
      app.log.error(
        { failureType: error instanceof Error ? error.constructor.name : 'UnknownError' },
        'Unable to list deal candidates'
      );

      return reply.code(500).send({
        error: 'Unable to list deal candidates'
      });
    }
  });

  app.get<{ Params: { id: string } }>('/internal/deal-candidates/:id', async (request, reply) => {
    if (!isUuid(request.params.id)) {
      return reply.code(400).send({
        error: 'Invalid candidate id'
      });
    }

    try {
      const candidate = await getDealCandidateById(request.params.id);

      if (!candidate) {
        return reply.code(404).send({
          error: 'Deal candidate not found'
        });
      }

      return { candidate };
    } catch (error) {
      app.log.error(
        { failureType: error instanceof Error ? error.constructor.name : 'UnknownError' },
        'Unable to load deal candidate'
      );

      return reply.code(500).send({
        error: 'Unable to load deal candidate'
      });
    }
  });

  app.post<{ Body: DealCandidateRequestBody }>('/internal/deal-candidates', async (request, reply) => {
    const parsed = parseCandidateInput(request.body);

    if (!parsed.ok) {
      return reply.code(400).send({ error: parsed.error });
    }

    try {
      const result = await createDealCandidate(parsed.value);

      if (result.kind === 'invalid_venue') {
        return reply.code(400).send({
          error: 'Invalid request body: venueId'
        });
      }

      return reply.code(201).send({
        candidate: {
          id: result.candidateId,
          reviewStatus: 'pending',
          scheduleCount: result.scheduleCount,
          itemCount: result.itemCount
        }
      });
    } catch (error) {
      if (isDuplicateCandidateError(error)) {
        return reply.code(409).send({
          error: 'Candidate already exists for this source'
        });
      }

      app.log.error({ err: error }, 'Deal candidate ingestion failed');

      return reply.code(500).send({
        error: 'Unable to create deal candidate'
      });
    }
  });
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
