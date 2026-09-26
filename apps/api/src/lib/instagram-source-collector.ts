import {
  MAX_COLLECTED_SOURCE_TEXT_LENGTH,
  SourceCollectionContentError,
  SourceCollectorConfigurationError,
  SourceProviderError,
  UnsupportedSourceUrlError,
  type CollectedSource,
  type SourceCollectionInput,
  type SourceCollector
} from './source-collector.js';

export type InstagramSourceResult = {
  shortcode?: string | null;
  id?: string | null;
  caption?: string | null;
  title?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  mediaAltText?: string | string[] | null;
  textualMetadata?: string[] | null;
};

export interface InstagramSourceProvider {
  getPublicPost(url: string): Promise<InstagramSourceResult>;
}

export class UnconfiguredInstagramSourceProvider implements InstagramSourceProvider {
  async getPublicPost(): Promise<InstagramSourceResult> {
    throw new SourceCollectorConfigurationError('Instagram source provider is not configured.');
  }
}

export class InstagramSourceCollector implements SourceCollector {
  constructor(private readonly provider: InstagramSourceProvider = new UnconfiguredInstagramSourceProvider()) {}

  supports(sourceType: SourceCollectionInput['source']['type']) {
    return sourceType === 'instagram';
  }

  async collect(input: SourceCollectionInput): Promise<CollectedSource> {
    const normalized = normalizeInstagramSourceUrl(input.source.url);

    let result: InstagramSourceResult;
    try {
      result = await this.provider.getPublicPost(normalized.canonicalUrl);
    } catch (error) {
      if (error instanceof SourceCollectorConfigurationError || error instanceof SourceProviderError) {
        throw error;
      }
      throw new SourceProviderError('Instagram provider request failed.');
    }

    if (!result || typeof result !== 'object') {
      throw new SourceProviderError('Instagram provider returned an invalid result.');
    }

    const providerShortcode = normalizeOptionalText(result.shortcode);
    if (providerShortcode && providerShortcode !== normalized.shortcode) {
      throw new SourceProviderError('Instagram provider returned a different shortcode.');
    }

    const caption = normalizeOptionalText(result.caption);
    const postId = normalizeOptionalText(result.id);
    const title = normalizeOptionalText(result.title);
    const author = normalizeOptionalText(result.author);
    const publishedAt = normalizeOptionalTimestamp(result.publishedAt);
    const altText = normalizeTextList(result.mediaAltText);
    const textualMetadata = normalizeTextList(result.textualMetadata);
    const evidence = buildInstagramEvidence({
      caption,
      postId,
      title,
      author,
      publishedAt,
      altText,
      textualMetadata
    }).slice(0, MAX_COLLECTED_SOURCE_TEXT_LENGTH).trim();

    if (!evidence) {
      throw new SourceCollectionContentError('Instagram provider returned no textual evidence.');
    }

    return {
      sourceType: 'instagram',
      canonicalUrl: normalized.canonicalUrl,
      text: evidence,
      externalId: normalized.shortcode,
      label: input.source.label,
      publishedAt,
      metadata: { title, author }
    };
  }
}

export function normalizeInstagramSourceUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsupportedSourceUrlError('Instagram source URL is invalid.');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    url.protocol !== 'https:' ||
    (hostname !== 'instagram.com' && hostname !== 'www.instagram.com') ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new UnsupportedSourceUrlError('Instagram source URL is not supported.');
  }

  const match = url.pathname.match(/^\/(p|reel)\/([A-Za-z0-9_-]+)\/?$/);
  if (!match) {
    throw new UnsupportedSourceUrlError('Instagram source URL is not a supported post or reel.');
  }

  const [, kind, shortcode] = match;
  return {
    kind: kind as 'p' | 'reel',
    shortcode,
    canonicalUrl: `https://www.instagram.com/${kind}/${shortcode}/`
  };
}

function buildInstagramEvidence(input: {
  caption: string | null;
  postId: string | null;
  title: string | null;
  author: string | null;
  publishedAt: string | null;
  altText: string[];
  textualMetadata: string[];
}) {
  const sections: string[] = [];
  if (input.postId) sections.push(`Post ID:\n${input.postId}`);
  if (input.title) sections.push(`Title:\n${input.title}`);
  if (input.author) sections.push(`Author:\n${input.author}`);
  if (input.publishedAt) sections.push(`Published at:\n${input.publishedAt}`);
  if (input.caption) sections.push(`Caption:\n${input.caption}`);
  if (input.altText.length > 0) sections.push(`Media alt text:\n${input.altText.join('\n')}`);
  if (input.textualMetadata.length > 0) {
    sections.push(`Additional public metadata:\n${input.textualMetadata.join('\n')}`);
  }
  return sections.join('\n\n');
}

function normalizeOptionalText(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new SourceProviderError('Instagram provider returned invalid text.');
  return value.trim() || null;
}

function normalizeOptionalTimestamp(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    throw new SourceProviderError('Instagram provider returned an invalid timestamp.');
  }
  return new Date(parsed).toISOString();
}

function normalizeTextList(value: string | string[] | null | undefined) {
  if (value === undefined || value === null) return [];
  const values = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(values) || values.some((entry) => typeof entry !== 'string')) {
    throw new SourceProviderError('Instagram provider returned invalid textual metadata.');
  }
  return values.map((entry) => entry.trim()).filter(Boolean);
}
