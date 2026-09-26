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
import {
  InstagramSourceCollector,
  type InstagramSourceProvider
} from '../../lib/instagram-source-collector.js';
import {
  MAX_COLLECTED_SOURCE_TEXT_LENGTH,
  selectSourceCollector,
  SourceCollectionContentError,
  SourceCollectorConfigurationError,
  SourceProviderError,
  UnsupportedSourceCollectorError,
  UnsupportedSourceUrlError,
  type CollectedSource,
  type SourceCollector
} from '../../lib/source-collector.js';
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
import { WebsiteSourceCollector } from '../../lib/website-source-collector.js';

const MAX_EXTRACTION_CONTENT_LENGTH = MAX_COLLECTED_SOURCE_TEXT_LENGTH;

type ExtractCandidateRequestBody = {
  source?: {
    type?: unknown;
    url?: unknown;
    externalId?: unknown;
    label?: unknown;
    publishedAt?: unknown;
  };
  venueId?: unknown;
  content?: unknown;
};

type ExtractUrlCandidateRequestBody = Omit<ExtractCandidateRequestBody, 'content'>;

type DealCandidateExtractionRoutesOptions = {
  extractCandidate?: DealCandidateExtractor;
  fetchSource?: SourcePageFetcher;
  instagramProvider?: InstagramSourceProvider;
  sourceCollectors?: SourceCollector[];
};

export const internalDealCandidateExtractionRoutes: FastifyPluginAsync<DealCandidateExtractionRoutesOptions> = async (
  app,
  options
) => {
  const extractCandidate = options.extractCandidate;
  const fetchSource = options.fetchSource ?? fetchSourcePage;
  const websiteCollector = new WebsiteSourceCollector(fetchSource, MAX_EXTRACTION_CONTENT_LENGTH);
  const sourceCollectors = options.sourceCollectors ?? [
    websiteCollector,
    new InstagramSourceCollector(options.instagramProvider)
  ];

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
        const collected = await websiteCollector.collect({ source });
        const input: ExtractionRequest = { source, venueId, content: collected.text };
        logExtractionRequest(app, input, 'URL deal candidate extraction requested');
        const result = await extractAndStageCandidate(input, extractCandidate, true);
        logExtractionSuccess(app, input, result.candidate);

        return reply.code(201).send({
          ...createExtractionResponse(result),
          source: {
            url: source.url,
            responseBytes: collected.responseBytes,
            extractedTextCharacterCount: collected.text.length
          }
        });
      } catch (error) {
        const collectionFailure = sendCollectionFailure(reply, error);
        if (collectionFailure) {
          return collectionFailure;
        }

        return sendExtractionFailure(app, reply, { source, venueId, content: '' }, error);
      }
    }
  );

  app.post<{ Body: ExtractUrlCandidateRequestBody }>(
    '/internal/deal-candidates/extract-source',
    async (request, reply) => {
      const parsedRequest = parseCandidateUrlExtractionRequest(request.body);
      if (!parsedRequest.ok) {
        return reply.code(400).send({ error: parsedRequest.error });
      }

      const { source, venueId } = parsedRequest.value;

      try {
        const collector = selectSourceCollector(sourceCollectors, source.type);
        const collected = await collector.collect({ source });
        const input = createCollectedExtractionRequest(collected, venueId);
        logExtractionRequest(app, input, 'Collected source deal candidate extraction requested');
        const result = await extractAndStageCandidate(input, extractCandidate);
        logExtractionSuccess(app, input, result.candidate);

        return reply.code(201).send({
          ...createExtractionResponse(result),
          source: {
            type: collected.sourceType,
            url: collected.canonicalUrl,
            externalId: collected.externalId,
            label: collected.label,
            publishedAt: collected.publishedAt,
            extractedTextCharacterCount: input.content.length,
            metadata: collected.metadata
          }
        });
      } catch (error) {
        const collectionFailure = sendCollectionFailure(reply, error);
        if (collectionFailure) {
          return collectionFailure;
        }

        return sendExtractionFailure(app, reply, { source, venueId, content: '' }, error);
      }
    }
  );
};

function createCollectedExtractionRequest(
  collected: CollectedSource,
  venueId: string | null
): ExtractionRequest {
  const content = collected.text.trim().slice(0, MAX_EXTRACTION_CONTENT_LENGTH);
  if (!content) {
    throw new SourceCollectionContentError('Collected source did not contain useful text.');
  }

  return {
    source: {
      type: collected.sourceType,
      url: collected.canonicalUrl,
      externalId: collected.externalId,
      label: collected.label,
      publishedAt: collected.publishedAt
    },
    venueId,
    content
  };
}

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

  return null;
}

function sendCollectionFailure(reply: FastifyReply, error: unknown) {
  const fetchFailure = sendSourceFetchFailure(reply, error);
  if (fetchFailure) return fetchFailure;

  if (error instanceof UnsupportedSourceCollectorError) {
    return reply.code(400).send({ error: 'Source type is not supported for collection' });
  }

  if (error instanceof UnsupportedSourceUrlError) {
    return reply.code(400).send({ error: 'Source URL is not supported for this source type' });
  }

  if (error instanceof SourceCollectionContentError) {
    return reply.code(422).send({ error: 'Collected source did not contain useful text' });
  }

  if (error instanceof SourceCollectorConfigurationError) {
    return reply.code(501).send({ error: 'Source collector is not configured' });
  }

  if (error instanceof SourceProviderError) {
    return reply.code(502).send({ error: 'Unable to collect source' });
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
