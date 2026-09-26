import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  InstagramSourceCollector,
  normalizeInstagramSourceUrl,
  type InstagramSourceProvider
} from './instagram-source-collector.js';
import {
  selectSourceCollector,
  SourceCollectorConfigurationError,
  SourceProviderError,
  UnsupportedSourceCollectorError,
  UnsupportedSourceUrlError,
  type SourceCollectionInput,
  type SourceCollector
} from './source-collector.js';
import { WebsiteSourceCollector } from './website-source-collector.js';

const instagramInput: SourceCollectionInput = {
  source: {
    type: 'instagram',
    url: 'https://www.instagram.com/p/ABC123/',
    externalId: null,
    label: null,
    publishedAt: null
  }
};

test('selects the first collector supporting a source type', () => {
  const website = fakeCollector('official_website');
  const instagram = fakeCollector('instagram');

  assert.equal(selectSourceCollector([website, instagram], 'instagram'), instagram);
  assert.throws(() => selectSourceCollector([website], 'instagram'), UnsupportedSourceCollectorError);
});

test('normalizes supported Instagram post and reel URLs', () => {
  assert.deepEqual(normalizeInstagramSourceUrl('https://instagram.com/p/ABC_123/?utm_source=test#ignored'), {
    kind: 'p',
    shortcode: 'ABC_123',
    canonicalUrl: 'https://www.instagram.com/p/ABC_123/'
  });
  assert.deepEqual(normalizeInstagramSourceUrl('https://www.instagram.com/reel/Reel-456'), {
    kind: 'reel',
    shortcode: 'Reel-456',
    canonicalUrl: 'https://www.instagram.com/reel/Reel-456/'
  });
});

test('rejects unsupported Instagram hosts, protocols, and paths', () => {
  const unsupported = [
    'http://www.instagram.com/p/ABC123/',
    'https://m.instagram.com/p/ABC123/',
    'https://www.instagram.com/restaurant/',
    'https://www.instagram.com/explore/',
    'https://www.instagram.com/stories/restaurant/123/',
    'https://www.instagram.com/accounts/login/',
    'https://www.instagram.com/tv/ABC123/',
    'https://example.com/p/ABC123/'
  ];

  for (const url of unsupported) {
    assert.throws(() => normalizeInstagramSourceUrl(url), UnsupportedSourceUrlError, url);
  }
});

test('collects conservative Instagram caption evidence through the provider boundary', async () => {
  let providerUrl = '';
  const provider: InstagramSourceProvider = {
    async getPublicPost(url) {
      providerUrl = url;
      return {
        shortcode: 'ABC123',
        caption: 'Happy hour weekdays from 3 PM to 6 PM. $6 cocktails.',
        author: 'example_restaurant',
        publishedAt: '2026-09-20T18:30:00Z',
        mediaAltText: ['Cocktails on a restaurant bar']
      };
    }
  };

  const collected = await new InstagramSourceCollector(provider).collect(instagramInput);

  assert.equal(providerUrl, 'https://www.instagram.com/p/ABC123/');
  assert.equal(collected.canonicalUrl, providerUrl);
  assert.equal(collected.externalId, 'ABC123');
  assert.equal(collected.publishedAt, '2026-09-20T18:30:00.000Z');
  assert.match(collected.text, /Caption:\nHappy hour weekdays/);
  assert.match(collected.text, /Author:\nexample_restaurant/);
  assert.match(collected.text, /Media alt text:\nCocktails on a restaurant bar/);
});

test('surfaces provider failure and explicit unconfigured-provider errors', async () => {
  const failingProvider: InstagramSourceProvider = {
    async getPublicPost() {
      throw new Error('vendor unavailable');
    }
  };

  await assert.rejects(new InstagramSourceCollector(failingProvider).collect(instagramInput), SourceProviderError);
  await assert.rejects(
    new InstagramSourceCollector().collect(instagramInput),
    SourceCollectorConfigurationError
  );
});

test('website collector reuses secure page fetch output and HTML text extraction', async () => {
  let fetchedUrl = '';
  const collector = new WebsiteSourceCollector(async (url) => {
    fetchedUrl = url;
    return {
      finalUrl: 'https://restaurant.example/happy-hour/',
      html: '<nav>Home</nav><main><h1>Happy Hour</h1><p>Weekdays 3–6 PM</p></main>',
      responseBytes: 81
    };
  });

  const collected = await collector.collect({
    source: {
      type: 'official_website',
      url: 'https://restaurant.example/deals',
      externalId: 'restaurant-deals',
      label: 'Official deals',
      publishedAt: null
    }
  });

  assert.equal(fetchedUrl, 'https://restaurant.example/deals');
  assert.equal(collected.canonicalUrl, 'https://restaurant.example/happy-hour/');
  assert.match(collected.text, /Happy Hour/);
  assert.doesNotMatch(collected.text, /Home/);
  assert.equal(collected.responseBytes, 81);
});

function fakeCollector(sourceType: SourceCollectionInput['source']['type']): SourceCollector {
  return {
    supports(candidateType) {
      return candidateType === sourceType;
    },
    async collect(input) {
      return {
        sourceType: input.source.type,
        canonicalUrl: input.source.url,
        text: 'evidence',
        externalId: input.source.externalId,
        label: input.source.label,
        publishedAt: input.source.publishedAt
      };
    }
  };
}
