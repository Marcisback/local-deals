import type { CandidateSourceType } from './candidate-input.js';

export const MAX_COLLECTED_SOURCE_TEXT_LENGTH = 20_000;

export type SourceCollectionInput = {
  source: {
    type: CandidateSourceType;
    url: string;
    externalId: string | null;
    label: string | null;
    publishedAt: string | null;
  };
};

export type CollectedSource = {
  sourceType: CandidateSourceType;
  canonicalUrl: string;
  text: string;
  externalId: string | null;
  label: string | null;
  publishedAt: string | null;
  metadata?: {
    title?: string | null;
    author?: string | null;
  };
};

export interface SourceCollector {
  supports(sourceType: CandidateSourceType): boolean;
  collect(input: SourceCollectionInput): Promise<CollectedSource>;
}

export class UnsupportedSourceCollectorError extends Error {}
export class SourceCollectionContentError extends Error {}
export class SourceCollectorConfigurationError extends Error {}
export class SourceProviderError extends Error {}
export class UnsupportedSourceUrlError extends Error {}

export function selectSourceCollector(collectors: SourceCollector[], sourceType: CandidateSourceType) {
  const collector = collectors.find((candidate) => candidate.supports(sourceType));
  if (!collector) {
    throw new UnsupportedSourceCollectorError(`No collector supports source type ${sourceType}.`);
  }

  return collector;
}
