import type { FastifyPluginAsync } from 'fastify';

import { isDuplicateCandidateError, parseCandidateInput } from '../../lib/candidate-input.js';
import { createDealCandidate } from '../../lib/candidate-service.js';

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
