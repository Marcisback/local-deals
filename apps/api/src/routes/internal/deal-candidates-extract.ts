import type { FastifyPluginAsync } from 'fastify';

import {
  isDuplicateCandidateError,
  parseCandidateExtractionRequest,
  parseCandidateInput
} from '../../lib/candidate-input.js';
import { createDealCandidate, findExistingCandidateByExternalId, venueExists } from '../../lib/candidate-service.js';
import {
  extractDealCandidateFromContent,
  ExtractionConfigError,
  ExtractionProviderError,
  InvalidExtractionError,
  NoDealFoundError,
  validateExtractedCandidate
} from '../../lib/deal-extractor.js';
import type { DealCandidateExtractor } from '../../lib/deal-extractor.js';

const MAX_EXTRACTION_CONTENT_LENGTH = 20000;

type ExtractCandidateRequestBody = {
  source?: {
    type?: unknown;
    url?: unknown;
    externalId?: unknown;
    label?: unknown;
  };
  venueId?: unknown;
  content?: unknown;
};

type DealCandidateExtractionRoutesOptions = {
  extractCandidate?: DealCandidateExtractor;
};

export const internalDealCandidateExtractionRoutes: FastifyPluginAsync<DealCandidateExtractionRoutesOptions> = async (
  app,
  options
) => {
  const extractCandidate = options.extractCandidate ?? extractDealCandidateFromContent;

  app.post<{ Body: ExtractCandidateRequestBody }>('/internal/deal-candidates/extract', async (request, reply) => {
    const parsedRequest = parseCandidateExtractionRequest(request.body, MAX_EXTRACTION_CONTENT_LENGTH);

    if (!parsedRequest.ok) {
      return reply.code(400).send({ error: parsedRequest.error });
    }

    const { source, venueId, content } = parsedRequest.value;

    try {
      if (venueId && !(await venueExists(venueId))) {
        return reply.code(400).send({
          error: 'Invalid request body: venueId'
        });
      }

      if (source.externalId) {
        const existingCandidateId = await findExistingCandidateByExternalId(source.type, source.externalId);
        if (existingCandidateId) {
          return reply.code(409).send({
            error: 'Candidate already exists for this source',
            candidateId: existingCandidateId
          });
        }
      }

      app.log.info(
        {
          sourceType: source.type,
          hasExternalId: source.externalId !== null,
          contentLength: content.length
        },
        'Deal candidate extraction requested'
      );

      const extraction = validateExtractedCandidate(
        await extractCandidate({
          sourceType: source.type,
          content
        })
      );

      const parsedCandidate = parseCandidateInput({
        source,
        venueId,
        title: extraction.title,
        description: extraction.description,
        rawText: content,
        confidence: extraction.confidence,
        schedules: extraction.schedules,
        items: extraction.items.map((item, index) => ({
          ...item,
          sortOrder: index
        }))
      });

      if (!parsedCandidate.ok) {
        app.log.error(
          {
            sourceType: source.type,
            hasExternalId: source.externalId !== null,
            error: parsedCandidate.error
          },
          'Extraction output failed candidate validation'
        );

        return reply.code(502).send({
          error: 'Extraction produced invalid candidate data'
        });
      }

      const result = await createDealCandidate(parsedCandidate.value);

      if (result.kind === 'invalid_venue') {
        return reply.code(400).send({
          error: 'Invalid request body: venueId'
        });
      }

      app.log.info(
        {
          sourceType: source.type,
          hasExternalId: source.externalId !== null,
          candidateId: result.candidateId,
          scheduleCount: result.scheduleCount,
          itemCount: result.itemCount
        },
        'Deal candidate extraction succeeded'
      );

      return reply.code(201).send({
        candidate: {
          id: result.candidateId,
          reviewStatus: 'pending',
          scheduleCount: result.scheduleCount,
          itemCount: result.itemCount
        },
        extraction: {
          title: extraction.title,
          description: extraction.description,
          confidence: extraction.confidence,
          scheduleCount: extraction.schedules.length,
          itemCount: extraction.items.length
        }
      });
    } catch (error) {
      if (isDuplicateCandidateError(error)) {
        const existingCandidateId = source.externalId
          ? await findExistingCandidateByExternalId(source.type, source.externalId)
          : null;

        return reply.code(409).send({
          error: 'Candidate already exists for this source',
          candidateId: existingCandidateId
        });
      }

      if (error instanceof NoDealFoundError) {
        return reply.code(422).send({
          error: 'No supported deal found in source content'
        });
      }

      if (error instanceof ExtractionConfigError) {
        app.log.error({ sourceType: source.type }, 'Deal extraction configuration is invalid');
        return reply.code(500).send({
          error: 'Deal extraction is not configured'
        });
      }

      if (error instanceof ExtractionProviderError || error instanceof InvalidExtractionError) {
        app.log.error(
          {
            failureType: error.constructor.name,
            sourceType: source.type,
            hasExternalId: source.externalId !== null
          },
          'Deal extraction failed'
        );

        return reply.code(502).send({
          error: 'Unable to extract deal candidate'
        });
      }

      app.log.error(
        {
          failureType: error instanceof Error ? error.constructor.name : 'UnknownError',
          sourceType: source.type,
          hasExternalId: source.externalId !== null
        },
        'Unexpected deal extraction failure'
      );

      return reply.code(500).send({
        error: 'Unable to create deal candidate'
      });
    }
  });
};
