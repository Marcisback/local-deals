import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';

import {
  DuplicateCandidateSourceError,
  extractAndStageCandidate,
  InvalidCandidateVenueError,
  validateCandidateExtractionTarget
} from '../../lib/candidate-extraction-service.js';
import {
  parseCandidateExtractionRequest,
  parseCandidateUrlExtractionRequest,
  type ExtractionRequest
} from '../../lib/candidate-input.js';
import {
  ExtractionConfigError,
  ExtractionProviderError,
  InvalidExtractionError,
  NoDealFoundError,
  type DealCandidateExtractor
} from '../../lib/deal-extractor.js';
import { extractUsefulTextFromHtml } from '../../lib/html-to-text.js';
import {
  fetchSourcePage,
  NonHtmlSourceError,
  SourceFetchFailedError,
  SourceFetchTimeoutError,
  SourceRedirectError,
  SourceResponseTooLargeError,
  UnsafeSourceUrlError,
  type SourcePageFetcher
} from '../../lib/source-fetcher.js';

const MAX_EXTRACTION_CONTENT_LENGTH = 20_000;

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

type ExtractUrlCandidateRequestBody = Omit<ExtractCandidateRequestBody, 'content'>;

type DealCandidateExtractionRoutesOptions = {
  extractCandidate?: DealCandidateExtractor;
  fetchSource?: SourcePageFetcher;
};

class EmptySourceTextError extends Error {}

export const internalDealCandidateExtractionRoutes: FastifyPluginAsync<DealCandidateExtractionRoutesOptions> = async (
  app,
  options
) => {
  const extractCandidate = options.extractCandidate;
  const fetchSource = options.fetchSource ?? fetchSourcePage;

  app.post<{ Body: ExtractCandidateRequestBody }>('/internal/deal-candidates/extract', async (request, reply) => {
    const parsedRequest = parseCandidateExtractionRequest(request.body, MAX_EXTRACTION_CONTENT_LENGTH);
    if (!parsedRequest.ok) {
      return reply.code(400).send({ error: parsedRequest.error });
    }

    const input = parsedRequest.value;
    logExtractionRequest(app, input, 'Deal candidate extraction requested');

    try {
      const result = await extractAndStageCandidate(input, extractCandidate);
      logExtractionSuccess(app, input, result.candidate);
      return reply.code(201).send(createExtractionResponse(result));
    } catch (error) {
      return sendExtractionFailure(app, reply, input, error);
    }
  });

  app.post<{ Body: ExtractUrlCandidateRequestBody }>(
    '/internal/deal-candidates/extract-url',
    async (request, reply) => {
      const parsedRequest = parseCandidateUrlExtractionRequest(request.body);
      if (!parsedRequest.ok) {
        return reply.code(400).send({ error: parsedRequest.error });
      }

      const { source, venueId } = parsedRequest.value;

      try {
        await validateCandidateExtractionTarget(source, venueId);
        const fetched = await fetchSource(source.url);
        const content = extractUsefulTextFromHtml(fetched.html, MAX_EXTRACTION_CONTENT_LENGTH);
        if (!content) {
          throw new EmptySourceTextError('Source page did not contain useful text.');
        }

        const input: ExtractionRequest = { source, venueId, content };
        logExtractionRequest(app, input, 'URL deal candidate extraction requested');
        const result = await extractAndStageCandidate(input, extractCandidate, true);
        logExtractionSuccess(app, input, result.candidate);

        return reply.code(201).send({
          ...createExtractionResponse(result),
          source: {
            url: source.url,
            responseBytes: fetched.responseBytes,
            extractedTextCharacterCount: content.length
          }
        });
      } catch (error) {
        const fetchFailure = sendSourceFetchFailure(reply, error);
        if (fetchFailure) {
          return fetchFailure;
        }

        return sendExtractionFailure(app, reply, { source, venueId, content: '' }, error);
      }
    }
  );
};

function createExtractionResponse(result: Awaited<ReturnType<typeof extractAndStageCandidate>>) {
  return {
    candidate: {
      id: result.candidate.candidateId,
      reviewStatus: 'pending',
      scheduleCount: result.candidate.scheduleCount,
      itemCount: result.candidate.itemCount
    },
    extraction: {
      title: result.extraction.title,
      description: result.extraction.description,
      confidence: result.extraction.confidence,
      scheduleCount: result.extraction.schedules.length,
      itemCount: result.extraction.items.length
    }
  };
}

function sendSourceFetchFailure(reply: FastifyReply, error: unknown) {
  if (error instanceof UnsafeSourceUrlError) {
    return reply.code(400).send({ error: 'Source URL is not allowed' });
  }

  if (error instanceof NonHtmlSourceError) {
    return reply.code(415).send({ error: 'Source response must be HTML' });
  }

  if (error instanceof SourceResponseTooLargeError) {
    return reply.code(413).send({ error: 'Source response is too large' });
  }

  if (error instanceof SourceFetchTimeoutError) {
    return reply.code(504).send({ error: 'Source request timed out' });
  }

  if (error instanceof SourceFetchFailedError || error instanceof SourceRedirectError) {
    return reply.code(502).send({ error: 'Unable to fetch source page' });
  }

  if (error instanceof EmptySourceTextError) {
    return reply.code(422).send({ error: 'Source page did not contain useful text' });
  }

  return null;
}

function sendExtractionFailure(
  app: FastifyInstance,
  reply: FastifyReply,
  input: ExtractionRequest,
  error: unknown
) {
  if (error instanceof DuplicateCandidateSourceError) {
    return reply.code(409).send({
      error: 'Candidate already exists for this source',
      candidateId: error.candidateId
    });
  }

  if (error instanceof InvalidCandidateVenueError) {
    return reply.code(400).send({ error: 'Invalid request body: venueId' });
  }

  if (error instanceof NoDealFoundError) {
    return reply.code(422).send({ error: 'No supported deal found in source content' });
  }

  if (error instanceof ExtractionConfigError) {
    app.log.error({ sourceType: input.source.type }, 'Deal extraction configuration is invalid');
    return reply.code(500).send({ error: 'Deal extraction is not configured' });
  }

  if (error instanceof ExtractionProviderError || error instanceof InvalidExtractionError) {
    app.log.error(
      {
        failureType: error.constructor.name,
        sourceType: input.source.type,
        hasExternalId: input.source.externalId !== null
      },
      'Deal extraction failed'
    );
    return reply.code(502).send({ error: 'Unable to extract deal candidate' });
  }

  app.log.error(
    {
      failureType: error instanceof Error ? error.constructor.name : 'UnknownError',
      sourceType: input.source.type,
      hasExternalId: input.source.externalId !== null
    },
    'Unexpected deal extraction failure'
  );
  return reply.code(500).send({ error: 'Unable to create deal candidate' });
}

function logExtractionRequest(app: FastifyInstance, input: ExtractionRequest, message: string) {
  app.log.info(
    {
      sourceType: input.source.type,
      hasExternalId: input.source.externalId !== null,
      contentLength: input.content.length
    },
    message
  );
}

function logExtractionSuccess(
  app: FastifyInstance,
  input: ExtractionRequest,
  candidate: { candidateId: string; scheduleCount: number; itemCount: number }
) {
  app.log.info(
    {
      sourceType: input.source.type,
      hasExternalId: input.source.externalId !== null,
      candidateId: candidate.candidateId,
      scheduleCount: candidate.scheduleCount,
      itemCount: candidate.itemCount
    },
    'Deal candidate extraction succeeded'
  );
}
