import { lookup } from 'node:dns/promises';

import ipaddr from 'ipaddr.js';

export const SOURCE_FETCH_TIMEOUT_MS = 10_000;
export const MAX_SOURCE_RESPONSE_BYTES = 2_000_000;
export const MAX_SOURCE_REDIRECTS = 3;
export const SOURCE_FETCH_USER_AGENT =
  'LocalDealsSourceFetcher/1.0 (restaurant deal-page ingestion; local development)';

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const INTERNAL_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.localdomain',
  '.lan',
  '.home',
  '.home.arpa',
  '.intranet'
];
const INTERNAL_HOSTNAMES = new Set([
  'localhost',
  'host.docker.internal',
  'gateway.docker.internal',
  'kubernetes.default',
  'metadata.google.internal'
]);

type FetchImplementation = (input: string, init: RequestInit) => Promise<Response>;
type HostnameResolver = (hostname: string) => Promise<string[]>;

export type SourceFetcherOptions = {
  fetchImplementation?: FetchImplementation;
  resolveHostname?: HostnameResolver;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
};

export type FetchedSourcePage = {
  html: string;
  finalUrl: string;
  responseBytes: number;
};

export type SourcePageFetcher = (url: string) => Promise<FetchedSourcePage>;

export class UnsafeSourceUrlError extends Error {}
export class SourceFetchTimeoutError extends Error {}
export class SourceFetchFailedError extends Error {}
export class SourceResponseTooLargeError extends Error {}
export class NonHtmlSourceError extends Error {}
export class SourceRedirectError extends Error {}

export async function fetchSourcePage(url: string, options: SourceFetcherOptions = {}): Promise<FetchedSourcePage> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const resolveHostname = options.resolveHostname ?? resolvePublicHostname;
  const timeoutMs = options.timeoutMs ?? SOURCE_FETCH_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? MAX_SOURCE_RESPONSE_BYTES;
  const maxRedirects = options.maxRedirects ?? MAX_SOURCE_REDIRECTS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = parseHttpUrl(url);

    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      await assertPublicDestination(currentUrl, resolveHostname);

      let response: Response;
      try {
        response = await fetchImplementation(currentUrl.toString(), {
          method: 'GET',
          headers: {
            accept: 'text/html,application/xhtml+xml;q=0.9',
            'user-agent': SOURCE_FETCH_USER_AGENT
          },
          redirect: 'manual',
          signal: controller.signal
        });
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          throw new SourceFetchTimeoutError('Source request timed out.');
        }

        throw new SourceFetchFailedError('Unable to fetch source page.');
      }

      if (REDIRECT_STATUS_CODES.has(response.status)) {
        await response.body?.cancel();
        if (redirectCount === maxRedirects) {
          throw new SourceRedirectError('Source exceeded the redirect limit.');
        }

        const location = response.headers.get('location');
        if (!location) {
          throw new SourceRedirectError('Source returned an invalid redirect.');
        }

        try {
          currentUrl = parseHttpUrl(new URL(location, currentUrl).toString());
        } catch (error) {
          if (error instanceof UnsafeSourceUrlError) {
            throw error;
          }
          throw new SourceRedirectError('Source returned an invalid redirect.');
        }
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new SourceFetchFailedError(`Source returned HTTP ${response.status}.`);
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.startsWith('text/html') && !contentType.startsWith('application/xhtml+xml')) {
        await response.body?.cancel();
        throw new NonHtmlSourceError('Source response is not HTML.');
      }

      const contentLength = Number.parseInt(response.headers.get('content-length') ?? '', 10);
      if (Number.isFinite(contentLength) && contentLength > maxResponseBytes) {
        await response.body?.cancel();
        throw new SourceResponseTooLargeError('Source response is too large.');
      }

      let body: Uint8Array;
      try {
        body = await readLimitedBody(response, maxResponseBytes);
      } catch (error) {
        if (error instanceof SourceResponseTooLargeError) {
          throw error;
        }
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          throw new SourceFetchTimeoutError('Source request timed out.');
        }
        throw new SourceFetchFailedError('Unable to read source response.');
      }
      return {
        html: new TextDecoder().decode(body),
        finalUrl: currentUrl.toString(),
        responseBytes: body.byteLength
      };
    }

    throw new SourceRedirectError('Source exceeded the redirect limit.');
  } finally {
    clearTimeout(timeout);
  }
}

function parseHttpUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsafeSourceUrlError('Source URL is invalid.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeSourceUrlError('Source URL protocol is not allowed.');
  }

  if (url.username || url.password) {
    throw new UnsafeSourceUrlError('Source URLs containing credentials are not allowed.');
  }

  return url;
}

async function assertPublicDestination(url: URL, resolveHostname: HostnameResolver) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (isObviousInternalHostname(hostname)) {
    throw new UnsafeSourceUrlError('Source hostname is not allowed.');
  }

  let addresses: string[];
  if (ipaddr.isValid(hostname)) {
    addresses = [hostname];
  } else {
    try {
      addresses = await resolveHostname(hostname);
    } catch {
      throw new SourceFetchFailedError('Unable to resolve source hostname.');
    }
  }

  if (addresses.length === 0 || addresses.some((address) => !isPublicAddress(address))) {
    throw new UnsafeSourceUrlError('Source hostname resolves to a non-public address.');
  }
}

function isObviousInternalHostname(hostname: string) {
  if (INTERNAL_HOSTNAMES.has(hostname) || INTERNAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return true;
  }

  return !hostname.includes('.') && !ipaddr.isValid(hostname);
}

function isPublicAddress(input: string) {
  if (!ipaddr.isValid(input)) {
    return false;
  }

  let address = ipaddr.parse(input);
  if (address instanceof ipaddr.IPv6 && address.isIPv4MappedAddress()) {
    address = address.toIPv4Address();
  }

  return address.range() === 'unicast';
}

async function resolvePublicHostname(hostname: string) {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((result) => result.address);
}

async function readLimitedBody(response: Response, maxResponseBytes: number) {
  if (!response.body) {
    return new Uint8Array();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    byteLength += value.byteLength;
    if (byteLength > maxResponseBytes) {
      await reader.cancel();
      throw new SourceResponseTooLargeError('Source response is too large.');
    }

    chunks.push(value);
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}
