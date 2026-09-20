import type { FastifyPluginAsync, FastifyReply } from 'fastify';

import { isDuplicateCandidateError, parseCandidateInput } from '../../lib/candidate-input.js';
import {
  createDealCandidate,
  getDealCandidateById,
  listPendingDealCandidates,
  reviewDealCandidate
} from '../../lib/candidate-service.js';
import type { ReviewCandidateResult } from '../../lib/candidate-service.js';

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

type RejectCandidateRequestBody = {
  reviewNote?: unknown;
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

  app.post<{ Params: { id: string } }>('/internal/deal-candidates/:id/approve', async (request, reply) => {
    if (!isUuid(request.params.id)) {
      return reply.code(400).send({
        error: 'Invalid candidate id'
      });
    }

    try {
      const result = await reviewDealCandidate(request.params.id, 'approved', null);
      return sendReviewResult(reply, result);
    } catch (error) {
      return sendReviewFailure(app, reply, error);
    }
  });

  app.post<{ Params: { id: string }; Body: RejectCandidateRequestBody }>(
    '/internal/deal-candidates/:id/reject',
    async (request, reply) => {
      if (!isUuid(request.params.id)) {
        return reply.code(400).send({
          error: 'Invalid candidate id'
        });
      }

      const reviewNote = parseReviewNote(request.body?.reviewNote);
      if (!reviewNote.ok) {
        return reply.code(400).send({
          error: reviewNote.error
        });
      }

      try {
        const result = await reviewDealCandidate(request.params.id, 'rejected', reviewNote.value);
        return sendReviewResult(reply, result);
      } catch (error) {
        return sendReviewFailure(app, reply, error);
      }
    }
  );

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

function parseReviewNote(value: unknown) {
  if (value === undefined || value === null) {
    return { ok: true as const, value: null };
  }

  if (typeof value !== 'string') {
    return { ok: false as const, error: 'Invalid request body: reviewNote' };
  }

  const reviewNote = value.trim();
  if (reviewNote.length > 2000) {
    return { ok: false as const, error: 'Invalid request body: reviewNote' };
  }

  return { ok: true as const, value: reviewNote || null };
}

function sendReviewResult(reply: FastifyReply, result: ReviewCandidateResult) {
  if (result.kind === 'not_found') {
    return reply.code(404).send({
      error: 'Deal candidate not found'
    });
  }

  if (result.kind === 'not_pending') {
    return reply.code(409).send({
      error: 'Deal candidate is no longer pending',
      candidate: {
        id: result.candidateId,
        reviewStatus: result.reviewStatus
      }
    });
  }

  return reply.send({
    candidate: {
      id: result.candidateId,
      reviewStatus: result.reviewStatus,
      reviewNote: result.reviewNote,
      reviewedAt: result.reviewedAt
    }
  });
}

function sendReviewFailure(app: Parameters<FastifyPluginAsync>[0], reply: FastifyReply, error: unknown) {
  app.log.error(
    { failureType: error instanceof Error ? error.constructor.name : 'UnknownError' },
    'Unable to review deal candidate'
  );

  return reply.code(500).send({
    error: 'Unable to review deal candidate'
  });
}
