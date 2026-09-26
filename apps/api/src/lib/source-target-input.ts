import { normalizeInstagramSourceUrl } from './instagram-source-collector.js';

export type SourceTargetType = 'official_website' | 'instagram';

export type ParsedSourceTargetCreate = {
  sourceType: SourceTargetType;
  canonicalUrl: string;
  sourceExternalId: string | null;
  label: string | null;
  venueId: string | null;
  enabled: boolean;
  nextCollectAt: string | null;
};

export type ParsedSourceTargetUpdate = {
  label?: string | null;
  venueId?: string | null;
  enabled?: boolean;
  nextCollectAt?: string | null;
};

export function parseSourceTargetCreate(input: unknown) {
  if (!input || typeof input !== 'object') return invalid('Invalid request body');
  const body = input as Record<string, unknown>;
  if (!body.source || typeof body.source !== 'object') return invalid('Invalid request body: source');
  const source = body.source as Record<string, unknown>;
  if (source.type !== 'official_website' && source.type !== 'instagram') {
    return invalid('Invalid request body: source.type');
  }
  if (typeof source.url !== 'string') return invalid('Invalid request body: source.url');

  let canonicalUrl: string;
  let derivedExternalId: string | null = null;
  try {
    if (source.type === 'instagram') {
      const normalized = normalizeInstagramSourceUrl(source.url);
      canonicalUrl = normalized.canonicalUrl;
      derivedExternalId = normalized.shortcode;
    } else {
      canonicalUrl = normalizeWebsiteUrl(source.url);
    }
  } catch {
    return invalid('Invalid request body: source.url');
  }

  const externalId = optionalString(source.externalId, 'source.externalId');
  if (!externalId.ok) return externalId;
  const label = optionalString(source.label, 'source.label');
  if (!label.ok) return label;
  const venueId = optionalUuid(body.venueId, 'venueId');
  if (!venueId.ok) return venueId;
  const nextCollectAt = optionalTimestamp(body.nextCollectAt, 'nextCollectAt');
  if (!nextCollectAt.ok) return nextCollectAt;
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
    return invalid('Invalid request body: enabled');
  }

  return {
    ok: true as const,
    value: {
      sourceType: source.type,
      canonicalUrl,
      sourceExternalId: derivedExternalId ?? externalId.value,
      label: label.value,
      venueId: venueId.value,
      enabled: body.enabled === undefined ? true : body.enabled,
      nextCollectAt: nextCollectAt.value
    } satisfies ParsedSourceTargetCreate
  };
}

export function parseSourceTargetUpdate(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid('Invalid request body');
  const body = input as Record<string, unknown>;
  const allowed = new Set(['label', 'venueId', 'enabled', 'nextCollectAt']);
  if (Object.keys(body).length === 0 || Object.keys(body).some((key) => !allowed.has(key))) {
    return invalid('Invalid request body');
  }
  const value: ParsedSourceTargetUpdate = {};
  if ('label' in body) {
    const parsed = optionalString(body.label, 'label');
    if (!parsed.ok) return parsed;
    value.label = parsed.value;
  }
  if ('venueId' in body) {
    const parsed = optionalUuid(body.venueId, 'venueId');
    if (!parsed.ok) return parsed;
    value.venueId = parsed.value;
  }
  if ('enabled' in body) {
    if (typeof body.enabled !== 'boolean') return invalid('Invalid request body: enabled');
    value.enabled = body.enabled;
  }
  if ('nextCollectAt' in body) {
    const parsed = optionalTimestamp(body.nextCollectAt, 'nextCollectAt');
    if (!parsed.ok) return parsed;
    value.nextCollectAt = parsed.value;
  }
  return { ok: true as const, value };
}

function normalizeWebsiteUrl(input: string) {
  const url = new URL(input);
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    throw new Error('Unsupported URL');
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}

function optionalString(value: unknown, field: string) {
  if (value === undefined || value === null) return { ok: true as const, value: null };
  if (typeof value !== 'string') return invalid(`Invalid request body: ${field}`);
  const normalized = value.trim();
  if (!normalized || normalized.length > 500) return invalid(`Invalid request body: ${field}`);
  return { ok: true as const, value: normalized };
}

function optionalUuid(value: unknown, field: string) {
  if (value === undefined || value === null) return { ok: true as const, value: null };
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return invalid(`Invalid request body: ${field}`);
  }
  return { ok: true as const, value };
}

function optionalTimestamp(value: unknown, field: string) {
  if (value === undefined || value === null) return { ok: true as const, value: null };
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return invalid(`Invalid request body: ${field}`);
  return { ok: true as const, value: new Date(value).toISOString() };
}

function invalid(error: string) {
  return { ok: false as const, error };
}
