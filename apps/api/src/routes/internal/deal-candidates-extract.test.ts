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
  throw new Error('DATABASE_URL is required to run deal extraction integration tests.');
}

const fixturePool = new Pool({ connectionString });
const fixtureVenueIds: string[] = [];
const fixtureExternalIds: string[] = [];
let extractionOutput: unknown = createValidExtraction();
let extractionError: Error | null = null;
let extractionCallCount = 0;

const app = Fastify({ logger: false });
app.register(internalDealCandidateExtractionRoutes, {
  extractCandidate: async () => {
    extractionCallCount += 1;

    if (extractionError) {
      throw extractionError;
    }

    return extractionOutput;
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

  if (fixtureVenueIds.length > 0) {
    await fixturePool.query('delete from public.venues where id = any($1::uuid[])', [fixtureVenueIds]);
  }

  await app.close();
  await closeDatabasePool();
  await fixturePool.end();
});

test('valid extraction creates a pending staging candidate and does not publish a deal', async () => {
  resetExtractor();
  const venueId = await createVenue();
  const externalId = createExternalId();

  const response = await submitExtraction({ venueId, externalId });

  assert.equal(response.statusCode, 201, response.body);
  const body = response.json<{
    candidate: { id: string; reviewStatus: string; scheduleCount: number; itemCount: number };
    extraction: {
      title: string | null;
      description: string | null;
      confidence: number | null;
      scheduleCount: number;
      itemCount: number;
    };
  }>();
  assert.deepEqual(body.candidate, {
    id: body.candidate.id,
    reviewStatus: 'pending',
    scheduleCount: 1,
    itemCount: 1
  });
  assert.deepEqual(body.extraction, {
    title: 'Weekday happy hour',
    description: 'Discounted snacks and drinks.',
    confidence: 0.94,
    scheduleCount: 1,
    itemCount: 1
  });

  const candidate = await fixturePool.query<{
    id: string;
    review_status: string;
    raw_text: string;
  }>(
    `
      select id, review_status, raw_text
      from public.deal_candidates
      where source_type = 'official_website' and source_external_id = $1
    `,
    [externalId]
  );
  assert.equal(candidate.rows[0]?.id, body.candidate.id);
  assert.equal(candidate.rows[0]?.review_status, 'pending');
  assert.equal(candidate.rows[0]?.raw_text, 'Happy hour Monday from 3 PM to 6 PM with $6 house cocktails.');

  const publishedDeals = await fixturePool.query<{ count: string }>(
    'select count(*)::text as count from public.deals where venue_id = $1',
    [venueId]
  );
  assert.equal(publishedDeals.rows[0]?.count, '0');
});

test('malformed extraction output is rejected without persisting a candidate', async () => {
  resetExtractor();
  const externalId = createExternalId();
  extractionOutput = { ...createValidExtraction(), unexpected: 'not allowed' };

  const response = await submitExtraction({ externalId });

  assert.equal(response.statusCode, 502, response.body);
  assert.equal(await countCandidates(externalId), 0);
});

test('invalid venue id is rejected before calling the extraction provider', async () => {
  resetExtractor();
  const externalId = createExternalId();

  const response = await submitExtraction({ venueId: randomUUID(), externalId });

  assert.equal(response.statusCode, 400, response.body);
  assert.equal(extractionCallCount, 0);
  assert.equal(await countCandidates(externalId), 0);
});

test('duplicate external ids return the existing candidate without extracting twice', async () => {
  resetExtractor();
  const externalId = createExternalId();

  const firstResponse = await submitExtraction({ externalId });
  const firstBody = firstResponse.json<{ candidate: { id: string } }>();
  const duplicateResponse = await submitExtraction({ externalId });

  assert.equal(firstResponse.statusCode, 201, firstResponse.body);
  assert.equal(duplicateResponse.statusCode, 409, duplicateResponse.body);
  assert.equal(duplicateResponse.json<{ candidateId: string }>().candidateId, firstBody.candidate.id);
  assert.equal(extractionCallCount, 1);
  assert.equal(await countCandidates(externalId), 1);
});

test('extracted schedules and items are persisted transactionally', async () => {
  resetExtractor();
  const externalId = createExternalId();

  const response = await submitExtraction({ externalId });
  assert.equal(response.statusCode, 201, response.body);
  const candidateId = response.json<{ candidate: { id: string } }>().candidate.id;

  const schedules = await fixturePool.query<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    raw_schedule_text: string;
  }>(
    `
      select day_of_week, start_time::text, end_time::text, raw_schedule_text
      from public.deal_candidate_schedule_windows
      where candidate_id = $1
    `,
    [candidateId]
  );
  assert.deepEqual(schedules.rows, [
    {
      day_of_week: 1,
      start_time: '15:00:00',
      end_time: '18:00:00',
      raw_schedule_text: 'Monday from 3 PM to 6 PM'
    }
  ]);

  const items = await fixturePool.query<{
    name: string;
    category: string;
    deal_price: string;
    raw_item_text: string;
    sort_order: number;
  }>(
    `
      select name, category, deal_price::text, raw_item_text, sort_order
      from public.deal_candidate_items
      where candidate_id = $1
    `,
    [candidateId]
  );
  assert.deepEqual(items.rows, [
    {
      name: 'House cocktail',
      category: 'cocktail',
      deal_price: '6.00',
      raw_item_text: '$6 house cocktails',
      sort_order: 0
    }
  ]);
});

test('provider failures map to a retryable extraction error without persistence', async () => {
  resetExtractor();
  const externalId = createExternalId();
  extractionError = new ExtractionProviderError('simulated provider failure');

  const response = await submitExtraction({ externalId });

  assert.equal(response.statusCode, 502, response.body);
  assert.deepEqual(response.json(), { error: 'Unable to extract deal candidate' });
  assert.equal(await countCandidates(externalId), 0);
});

test('request validation rejects malformed source input before extraction', async () => {
  resetExtractor();

  const response = await app.inject({
    method: 'POST',
    url: '/internal/deal-candidates/extract',
    payload: {
      source: {
        type: 'official_website',
        url: 'not-a-url'
      },
      content: ''
    }
  });

  assert.equal(response.statusCode, 400, response.body);
  assert.equal(extractionCallCount, 0);
});

function resetExtractor() {
  extractionOutput = createValidExtraction();
  extractionError = null;
  extractionCallCount = 0;
}

function createValidExtraction() {
  return {
    hasDeal: true,
    title: 'Weekday happy hour',
    description: 'Discounted snacks and drinks.',
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
  const externalId = `api-extraction-test-${randomUUID()}`;
  fixtureExternalIds.push(externalId);
  return externalId;
}

async function createVenue() {
  const venueId = randomUUID();
  fixtureVenueIds.push(venueId);

  await fixturePool.query(
    `
      insert into public.venues (
        id,
        name,
        venue_type,
        location,
        timezone,
        status,
        is_verified
      ) values (
        $1,
        $2,
        'restaurant',
        st_setsrid(st_makepoint(-121.8896, 37.3361), 4326)::geography,
        'America/Los_Angeles',
        'active',
        true
      )
    `,
    [venueId, `Extraction test venue ${venueId}`]
  );

  return venueId;
}

async function submitExtraction(options: { venueId?: string; externalId: string }) {
  return app.inject({
    method: 'POST',
    url: '/internal/deal-candidates/extract',
    payload: {
      source: {
        type: 'official_website',
        url: 'https://example.com/happy-hour',
        externalId: options.externalId,
        label: 'Official happy hour page'
      },
      venueId: options.venueId,
      content: 'Happy hour Monday from 3 PM to 6 PM with $6 house cocktails.'
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
