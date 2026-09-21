import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import Fastify from 'fastify';
import { Pool } from 'pg';

import { closeDatabasePool } from '../../db.js';
import { ExtractionProviderError } from '../../lib/deal-extractor.js';
import { internalDealCandidateExtractionRoutes } from './deal-candidates-extract.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run URL extraction integration tests.');
}

const fixturePool = new Pool({ connectionString });
const fixtureExternalIds: string[] = [];
let extractionError: Error | null = null;
let extractionCallCount = 0;
let fetchCallCount = 0;
let fetchedContent = '';

const app = Fastify({ logger: false });
app.register(internalDealCandidateExtractionRoutes, {
  fetchSource: async () => {
    fetchCallCount += 1;
    return {
      html: `
      <html><body>
        <nav>Home Reservations</nav>
        <main>
          <h1>Weekday Happy Hour</h1>
          <p>Monday from 3 PM to 6 PM.</p>
          <ul><li>$6 house cocktails</li></ul>
          <script>doNotSendToModel()</script>
        </main>
      </body></html>
      `,
      finalUrl: 'https://restaurant.example/happy-hour',
      responseBytes: 321
    };
  },
  extractCandidate: async ({ content }) => {
    extractionCallCount += 1;
    fetchedContent = content;
    if (extractionError) {
      throw extractionError;
    }
    return createValidExtraction();
  }
});

before(async () => {
  await fixturePool.query('select 1');
  await app.ready();
});

after(async () => {
  if (fixtureExternalIds.length > 0) {
    await fixturePool.query('delete from public.deal_candidates where source_external_id = any($1::text[])', [
      fixtureExternalIds
    ]);
  }

  await app.close();
  await closeDatabasePool();
  await fixturePool.end();
});

test('URL extraction creates a pending candidate from sanitized text and returns metadata', async () => {
  resetBoundaries();
  const externalId = createExternalId();
  const sourceUrl = 'https://restaurant.example/happy-hour';
  const response = await submitUrlExtraction(externalId, sourceUrl);

  assert.equal(response.statusCode, 201, response.body);
  const body = response.json<{
    candidate: { id: string; reviewStatus: string; scheduleCount: number; itemCount: number };
    extraction: { confidence: number; scheduleCount: number; itemCount: number };
    source: { url: string; responseBytes: number; extractedTextCharacterCount: number };
  }>();
  assert.deepEqual(body.candidate, {
    id: body.candidate.id,
    reviewStatus: 'pending',
    scheduleCount: 1,
    itemCount: 1
  });
  assert.equal(body.extraction.confidence, 0.94);
  assert.equal(body.source.url, sourceUrl);
  assert.equal(body.source.responseBytes, 321);
  assert.equal(body.source.extractedTextCharacterCount, fetchedContent.length);
  assert.match(fetchedContent, /Weekday Happy Hour/);
  assert.match(fetchedContent, /\$6 house cocktails/);
  assert.doesNotMatch(fetchedContent, /Home Reservations|doNotSendToModel/);

  const candidate = await fixturePool.query<{
    source_url: string;
    review_status: string;
    raw_text: string;
    published_deal_id: string | null;
  }>(
    `
      select source_url, review_status, raw_text, published_deal_id
      from public.deal_candidates
      where source_type = 'official_website' and source_external_id = $1
    `,
    [externalId]
  );
  assert.equal(candidate.rows[0]?.source_url, sourceUrl);
  assert.equal(candidate.rows[0]?.review_status, 'pending');
  assert.equal(candidate.rows[0]?.raw_text, fetchedContent);
  assert.equal(candidate.rows[0]?.published_deal_id, null);
});

test('duplicate URL sources return the existing candidate and do not call the model twice', async () => {
  resetBoundaries();
  const externalId = createExternalId();
  const first = await submitUrlExtraction(externalId);
  const duplicate = await submitUrlExtraction(externalId);

  assert.equal(first.statusCode, 201, first.body);
  assert.equal(duplicate.statusCode, 409, duplicate.body);
  assert.equal(
    duplicate.json<{ candidateId: string }>().candidateId,
    first.json<{ candidate: { id: string } }>().candidate.id
  );
  assert.equal(extractionCallCount, 1);
  assert.equal(fetchCallCount, 1);
  assert.equal(await countCandidates(externalId), 1);
});

test('failed model extraction creates no candidate', async () => {
  resetBoundaries();
  const externalId = createExternalId();
  extractionError = new ExtractionProviderError('simulated provider failure');

  const response = await submitUrlExtraction(externalId);

  assert.equal(response.statusCode, 502, response.body);
  assert.deepEqual(response.json(), { error: 'Unable to extract deal candidate' });
  assert.equal(await countCandidates(externalId), 0);
});

test('URL extraction request rejects invalid URLs before fetch or model work', async () => {
  resetBoundaries();
  const response = await submitUrlExtraction(createExternalId(), 'not-a-url');

  assert.equal(response.statusCode, 400, response.body);
  assert.equal(fetchCallCount, 0);
  assert.equal(extractionCallCount, 0);
});

function resetBoundaries() {
  extractionError = null;
  extractionCallCount = 0;
  fetchCallCount = 0;
  fetchedContent = '';
}

function createValidExtraction() {
  return {
    hasDeal: true,
    title: 'Weekday happy hour',
    description: 'Discounted drinks.',
    confidence: 0.94,
    noDealReason: null,
    schedules: [
      {
        dayOfWeek: 1,
        startTime: '15:00',
        endTime: '18:00',
        endsAtVenueClose: false,
        rawScheduleText: 'Monday from 3 PM to 6 PM',
        confidence: 0.97
      }
    ],
    items: [
      {
        name: 'House cocktail',
        category: 'cocktail',
        description: null,
        dealPrice: 6,
        regularPrice: null,
        discountText: null,
        rawItemText: '$6 house cocktails',
        confidence: 0.92
      }
    ]
  };
}

function createExternalId() {
  const externalId = `api-url-extraction-test-${randomUUID()}`;
  fixtureExternalIds.push(externalId);
  return externalId;
}

function submitUrlExtraction(externalId: string, sourceUrl = 'https://restaurant.example/happy-hour') {
  return app.inject({
    method: 'POST',
    url: '/internal/deal-candidates/extract-url',
    payload: {
      source: {
        type: 'official_website',
        url: sourceUrl,
        externalId,
        label: 'Official happy hour page'
      },
      venueId: null
    }
  });
}

async function countCandidates(externalId: string) {
  const result = await fixturePool.query<{ count: string }>(
    `
      select count(*)::text as count
      from public.deal_candidates
      where source_type = 'official_website' and source_external_id = $1
    `,
    [externalId]
  );
  return Number(result.rows[0]?.count ?? 0);
}
