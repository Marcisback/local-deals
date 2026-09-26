import { extractUsefulTextFromHtml } from './html-to-text.js';
import {
  MAX_COLLECTED_SOURCE_TEXT_LENGTH,
  SourceCollectionContentError,
  type CollectedSource,
  type SourceCollectionInput,
  type SourceCollector
} from './source-collector.js';
import { fetchSourcePage, type SourcePageFetcher } from './source-fetcher.js';

export type CollectedWebsiteSource = CollectedSource & {
  responseBytes: number;
};

export class WebsiteSourceCollector implements SourceCollector {
  constructor(
    private readonly fetchSource: SourcePageFetcher = fetchSourcePage,
    private readonly maxTextLength = MAX_COLLECTED_SOURCE_TEXT_LENGTH
  ) {}

  supports(sourceType: SourceCollectionInput['source']['type']) {
    return sourceType === 'official_website';
  }

  async collect(input: SourceCollectionInput): Promise<CollectedWebsiteSource> {
    const fetched = await this.fetchSource(input.source.url);
    const text = extractUsefulTextFromHtml(fetched.html, this.maxTextLength);
    if (!text) {
      throw new SourceCollectionContentError('Source page did not contain useful text.');
    }

    return {
      sourceType: input.source.type,
      canonicalUrl: fetched.finalUrl,
      text,
      externalId: input.source.externalId,
      label: input.source.label,
      publishedAt: input.source.publishedAt,
      responseBytes: fetched.responseBytes
    };
  }
}
