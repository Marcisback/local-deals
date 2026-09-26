import type { FastifyPluginAsync } from 'fastify';

import {
  createCollectedExtractionRequest,
  DuplicateCandidateSourceError,
  extractAndStageCandidate,
  InvalidCandidateVenueError
} from '../../lib/candidate-extraction-service.js';
import { venueExists } from '../../lib/candidate-service.js';
import {
  ExtractionConfigError, ExtractionProviderError, InvalidExtractionError, NoDealFoundError,
  type DealCandidateExtractor
} from '../../lib/deal-extractor.js';
import { InstagramSourceCollector, type InstagramSourceProvider } from '../../lib/instagram-source-collector.js';
import {
  selectSourceCollector, SourceCollectionContentError, SourceCollectorConfigurationError,
  SourceProviderError, UnsupportedSourceCollectorError, UnsupportedSourceUrlError, type SourceCollector
} from '../../lib/source-collector.js';
import {
  NonHtmlSourceError, SourceFetchFailedError, SourceFetchTimeoutError, SourceRedirectError,
  SourceResponseTooLargeError, UnsafeSourceUrlError, fetchSourcePage, type SourcePageFetcher
} from '../../lib/source-fetcher.js';
import { parseSourceTargetCreate, parseSourceTargetUpdate } from '../../lib/source-target-input.js';
import {
  completeCollectionRun, createSourceTarget, DuplicateSourceTargetError, getCollectionRun,
  getSourceTarget, listCollectionRuns, listSourceTargets, startCollectionRun, updateSourceTarget
} from '../../lib/source-target-service.js';
import { WebsiteSourceCollector } from '../../lib/website-source-collector.js';

type Options = {
  extractCandidate?: DealCandidateExtractor;
  fetchSource?: SourcePageFetcher;
  instagramProvider?: InstagramSourceProvider;
  sourceCollectors?: SourceCollector[];
};

export const internalSourceTargetRoutes: FastifyPluginAsync<Options> = async (app, options) => {
  const collectors = options.sourceCollectors ?? [
    new WebsiteSourceCollector(options.fetchSource ?? fetchSourcePage),
    new InstagramSourceCollector(options.instagramProvider)
  ];

  app.post<{ Body: unknown }>('/internal/source-targets', async (request, reply) => {
    const parsed = parseSourceTargetCreate(request.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    if (parsed.value.venueId && !(await venueExists(parsed.value.venueId))) {
      return reply.code(400).send({ error: 'Invalid request body: venueId' });
    }
    try {
      return reply.code(201).send({ sourceTarget: await createSourceTarget(parsed.value) });
    } catch (error) {
      if (error instanceof DuplicateSourceTargetError) {
        return reply.code(409).send({ error: 'Source target already exists' });
      }
      throw error;
    }
  });

  app.get('/internal/source-targets', async () => ({ sourceTargets: await listSourceTargets() }));

  app.get<{ Params: { id: string } }>('/internal/source-targets/:id', async (request, reply) => {
    const target = await getSourceTarget(request.params.id);
    return target ? { sourceTarget: target } : reply.code(404).send({ error: 'Source target not found' });
  });

  app.patch<{ Params: { id: string }; Body: unknown }>('/internal/source-targets/:id', async (request, reply) => {
    const parsed = parseSourceTargetUpdate(request.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    if (parsed.value.venueId && !(await venueExists(parsed.value.venueId))) {
      return reply.code(400).send({ error: 'Invalid request body: venueId' });
    }
    const target = await updateSourceTarget(request.params.id, parsed.value);
    return target ? { sourceTarget: target } : reply.code(404).send({ error: 'Source target not found' });
  });

  app.get<{ Params: { id: string } }>('/internal/source-targets/:id/runs', async (request, reply) => {
    if (!(await getSourceTarget(request.params.id))) return reply.code(404).send({ error: 'Source target not found' });
    return { collectionRuns: await listCollectionRuns(request.params.id) };
  });

  app.get<{ Params: { id: string } }>('/internal/source-collection-runs/:id', async (request, reply) => {
    const run = await getCollectionRun(request.params.id);
    return run ? { collectionRun: run } : reply.code(404).send({ error: 'Collection run not found' });
  });

  app.post<{ Params: { id: string } }>('/internal/source-targets/:id/collect', async (request, reply) => {
    const target = await getSourceTarget(request.params.id);
    if (!target) return reply.code(404).send({ error: 'Source target not found' });
    if (!target.enabled) return reply.code(409).send({ error: 'Source target is disabled' });

    const run = await startCollectionRun(target.id);
    try {
      const collector = selectSourceCollector(collectors, target.sourceType);
      const collected = await collector.collect({ source: {
        type: target.sourceType, url: target.canonicalUrl, externalId: target.sourceExternalId,
        label: target.label, publishedAt: null
      }});
      const extractionInput = createCollectedExtractionRequest(collected, target.venueId);
      const result = await extractAndStageCandidate(extractionInput, options.extractCandidate);
      const completed = await completeCollectionRun({
        runId: run.id, targetId: target.id, status: 'succeeded', outcomeCode: 'candidate_created',
        outcomeMessage: 'Candidate created for review.', candidateId: result.candidate.candidateId
      });
      return reply.code(201).send({
        sourceTargetId: target.id, collectionRun: completed,
        candidate: { id: result.candidate.candidateId, reviewStatus: 'pending',
          scheduleCount: result.candidate.scheduleCount, itemCount: result.candidate.itemCount },
        extraction: { confidence: result.extraction.confidence },
        source: { type: collected.sourceType, url: collected.canonicalUrl,
          extractedTextCharacterCount: extractionInput.content.length }
      });
    } catch (error) {
      if (error instanceof DuplicateCandidateSourceError) {
        const completed = await completeCollectionRun({
          runId: run.id, targetId: target.id, status: 'duplicate', outcomeCode: 'candidate_duplicate',
          outcomeMessage: 'Candidate already exists for this source.', candidateId: error.candidateId
        });
        return reply.code(200).send({ sourceTargetId: target.id, collectionRun: completed,
          candidate: { id: error.candidateId, reviewStatus: 'existing' } });
      }

      const failure = classifyFailure(error);
      const completed = await completeCollectionRun({
        runId: run.id, targetId: target.id, status: 'failed', outcomeCode: failure.code,
        outcomeMessage: failure.message, candidateId: null
      });
      app.log.warn({ sourceTargetId: target.id, collectionRunId: run.id, outcomeCode: failure.code },
        'Source collection run failed');
      return reply.code(failure.httpStatus).send({ error: failure.message, collectionRun: completed });
    }
  });
};

function classifyFailure(error: unknown) {
  if (error instanceof SourceCollectorConfigurationError) return failure(501, 'collector_not_configured', 'Source collector is not configured.');
  if (error instanceof UnsupportedSourceCollectorError) return failure(400, 'unsupported_source_type', 'Source type is not supported for collection.');
  if (error instanceof UnsupportedSourceUrlError || error instanceof UnsafeSourceUrlError) return failure(400, 'invalid_source_url', 'Source URL is not allowed.');
  if (error instanceof NonHtmlSourceError) return failure(415, 'non_html_source', 'Source response must be HTML.');
  if (error instanceof SourceResponseTooLargeError) return failure(413, 'source_too_large', 'Source response is too large.');
  if (error instanceof SourceFetchTimeoutError) return failure(504, 'source_timeout', 'Source request timed out.');
  if (error instanceof SourceFetchFailedError || error instanceof SourceRedirectError || error instanceof SourceProviderError) return failure(502, 'collection_failed', 'Unable to collect source.');
  if (error instanceof SourceCollectionContentError || error instanceof NoDealFoundError) return failure(422, 'no_usable_deal', 'No supported deal found in source content.');
  if (error instanceof ExtractionConfigError) return failure(500, 'extraction_not_configured', 'Deal extraction is not configured.');
  if (error instanceof ExtractionProviderError || error instanceof InvalidExtractionError) return failure(502, 'extraction_failed', 'Unable to extract deal candidate.');
  if (error instanceof InvalidCandidateVenueError) return failure(400, 'invalid_venue', 'Candidate venue does not exist.');
  return failure(500, 'unexpected_failure', 'Unable to collect source.');
}

function failure(httpStatus: number, code: string, message: string) {
  return { httpStatus, code, message };
}
