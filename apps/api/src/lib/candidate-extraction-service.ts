import {
  isDuplicateCandidateError,
  parseCandidateInput,
  type ExtractionRequest
} from './candidate-input.js';
import {
  createDealCandidate,
  findExistingCandidateByExternalId,
  venueExists
} from './candidate-service.js';
import {
  extractDealCandidateFromContent,
  InvalidExtractionError,
  validateExtractedCandidate,
  type DealCandidateExtractor
} from './deal-extractor.js';
import {
  MAX_COLLECTED_SOURCE_TEXT_LENGTH,
  SourceCollectionContentError,
  type CollectedSource
} from './source-collector.js';

export class DuplicateCandidateSourceError extends Error {
  constructor(readonly candidateId: string | null) {
    super('Candidate already exists for this source.');
  }
}

export class InvalidCandidateVenueError extends Error {}

export function createCollectedExtractionRequest(
  collected: CollectedSource,
  venueId: string | null
): ExtractionRequest {
  const content = collected.text.trim().slice(0, MAX_COLLECTED_SOURCE_TEXT_LENGTH);
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

export async function extractAndStageCandidate(
  input: ExtractionRequest,
  extractCandidate: DealCandidateExtractor = extractDealCandidateFromContent,
  targetAlreadyValidated = false
) {
  const { source, venueId, content } = input;

  if (!targetAlreadyValidated) {
    await validateCandidateExtractionTarget(source, venueId);
  }

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
    throw new InvalidExtractionError(parsedCandidate.error);
  }

  try {
    const candidate = await createDealCandidate(parsedCandidate.value);
    if (candidate.kind === 'invalid_venue') {
      throw new InvalidCandidateVenueError('Candidate venue does not exist.');
    }

    return { candidate, extraction };
  } catch (error) {
    if (!isDuplicateCandidateError(error)) {
      throw error;
    }

    const existingCandidateId = source.externalId
      ? await findExistingCandidateByExternalId(source.type, source.externalId)
      : null;
    throw new DuplicateCandidateSourceError(existingCandidateId);
  }
}

export async function validateCandidateExtractionTarget(
  source: ExtractionRequest['source'],
  venueId: ExtractionRequest['venueId']
) {
  if (venueId && !(await venueExists(venueId))) {
    throw new InvalidCandidateVenueError('Candidate venue does not exist.');
  }

  if (source.externalId) {
    const existingCandidateId = await findExistingCandidateByExternalId(source.type, source.externalId);
    if (existingCandidateId) {
      throw new DuplicateCandidateSourceError(existingCandidateId);
    }
  }
}
