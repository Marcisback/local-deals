import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import Fastify from 'fastify';
import { Pool } from 'pg';

import { closeDatabasePool } from '../../db.js';
import { internalDealCandidateRoutes } from './deal-candidates.js';

const CHECKED_AT = new Date('2026-09-20T18:00:00.000Z');
const PUBLISHED_AT = new Date('2026-09-19T17:00:00.000Z');
const CREATED_AT = new Date('2026-09-20T18:05:00.000Z');
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run candidate review integration tests.');
}

const fixturePool = new Pool({ connectionString });
const venueId = randomUUID();
const pendingCandidateId = randomUUID();
const rejectedCandidateId = randomUUID();
const scheduleId = randomUUID();
const itemId = randomUUID();

const app = Fastify({ logger: false });
app.register(internalDealCandidateRoutes);

before(async () => {
  await fixturePool.query('select 1');
  await createFixtures();
  await app.ready();
});

after(async () => {
  await fixturePool.query('delete from public.deal_candidates where id = any($1::uuid[])', [
    [pendingCandidateId, rejectedCandidateId]
  ]);
  await fixturePool.query('delete from public.venues where id = $1', [venueId]);
  await app.close();
  await closeDatabasePool();
  await fixturePool.end();
});

test('lists pending candidates and excludes other review states', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/internal/deal-candidates'
  });

  assert.equal(response.statusCode, 200, response.body);
  const body = response.json<{ candidates: Array<{ id: string; reviewStatus: string }> }>();
  const pendingCandidate = body.candidates.find((candidate) => candidate.id === pendingCandidateId);

  assert.equal(pendingCandidate?.reviewStatus, 'pending');
  assert.ok(!body.candidates.some((candidate) => candidate.id === rejectedCandidateId));
});

test('retrieves one candidate with source, venue, evidence, and timestamps', async () => {
  const response = await app.inject({
    method: 'GET',
    url: `/internal/deal-candidates/${pendingCandidateId}`
  });

  assert.equal(response.statusCode, 200, response.body);
  const { candidate } = response.json<{
    candidate: {
      id: string;
      source: {
        type: string;
        url: string;
        label: string | null;
        externalId: string | null;
        publishedAt: string | null;
        lastCheckedAt: string | null;
      };
      venue: { id: string; name: string } | null;
      title: string | null;
      description: string | null;
      rawText: string | null;
      confidence: number | null;
      reviewStatus: string;
      discoveredAt: string;
      createdAt: string;
      updatedAt: string;
    };
  }>();

  assert.equal(candidate.id, pendingCandidateId);
  assert.deepEqual(candidate.source, {
    type: 'official_website',
    url: 'https://example.com/review-fixture',
    label: 'Official review fixture',
    externalId: `review-fixture-${pendingCandidateId}`,
    publishedAt: PUBLISHED_AT.toISOString(),
    lastCheckedAt: CHECKED_AT.toISOString()
  });
  assert.deepEqual(candidate.venue, {
    id: venueId,
    name: 'Candidate review test venue'
  });
  assert.equal(candidate.title, 'Review fixture happy hour');
  assert.equal(candidate.description, 'A staged candidate for read-only review.');
  assert.equal(candidate.rawText, 'Monday happy hour from 3 PM to 6 PM. House drinks are $6.');
  assert.equal(candidate.confidence, 0.91);
  assert.equal(candidate.reviewStatus, 'pending');
  assert.equal(candidate.discoveredAt, CREATED_AT.toISOString());
  assert.equal(candidate.createdAt, CREATED_AT.toISOString());
  assert.equal(candidate.updatedAt, CREATED_AT.toISOString());
});

test('returns not found for an unknown candidate id', async () => {
  const response = await app.inject({
    method: 'GET',
    url: `/internal/deal-candidates/${randomUUID()}`
  });

  assert.equal(response.statusCode, 404, response.body);
  assert.deepEqual(response.json(), { error: 'Deal candidate not found' });
});

test('includes ordered candidate schedules and items', async () => {
  const response = await app.inject({
    method: 'GET',
    url: `/internal/deal-candidates/${pendingCandidateId}`
  });

  assert.equal(response.statusCode, 200, response.body);
  const { candidate } = response.json<{
    candidate: {
      schedules: unknown[];
      items: unknown[];
    };
  }>();

  assert.deepEqual(candidate.schedules, [
    {
      id: scheduleId,
      dayOfWeek: 1,
      startTime: '15:00:00',
      endTime: '18:00:00',
      endsAtVenueClose: false,
      rawScheduleText: 'Monday from 3 PM to 6 PM',
      confidence: 0.95,
      createdAt: CREATED_AT.toISOString()
    }
  ]);
  assert.deepEqual(candidate.items, [
    {
      id: itemId,
      name: 'House drink',
      category: 'cocktail',
      description: 'Rotating house selection',
      dealPrice: 6,
      regularPrice: 9,
      discountText: '$3 off',
      rawItemText: 'House drinks are $6',
      sortOrder: 0,
      confidence: 0.9,
      createdAt: CREATED_AT.toISOString()
    }
  ]);
});

async function createFixtures() {
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
        'Candidate review test venue',
        'restaurant',
        st_setsrid(st_makepoint(-121.8896, 37.3361), 4326)::geography,
        'America/Los_Angeles',
        'active',
        true
      )
    `,
    [venueId]
  );

  await fixturePool.query(
    `
      insert into public.deal_candidates (
        id,
        venue_id,
        source_url,
        source_type,
        source_label,
        source_external_id,
        title,
        description,
        raw_text,
        discovered_at,
        source_published_at,
        source_last_checked_at,
        review_status,
        confidence,
        created_at,
        updated_at
      ) values
        (
          $1, $2, 'https://example.com/review-fixture', 'official_website',
          'Official review fixture', $3, 'Review fixture happy hour',
          'A staged candidate for read-only review.',
          'Monday happy hour from 3 PM to 6 PM. House drinks are $6.',
          $4, $5, $6, 'pending', 0.91, $4, $4
        ),
        (
          $7, null, 'https://example.com/rejected-fixture', 'manual',
          null, $8, 'Rejected fixture', null, null,
          $4, null, $6, 'rejected', null, $4, $4
        )
    `,
    [
      pendingCandidateId,
      venueId,
      `review-fixture-${pendingCandidateId}`,
      CREATED_AT,
      PUBLISHED_AT,
      CHECKED_AT,
      rejectedCandidateId,
      `review-fixture-${rejectedCandidateId}`
    ]
  );

  await fixturePool.query(
    `
      insert into public.deal_candidate_schedule_windows (
        id,
        candidate_id,
        day_of_week,
        start_time,
        end_time,
        ends_at_venue_close,
        raw_schedule_text,
        confidence,
        created_at
      ) values ($1, $2, 1, time '15:00', time '18:00', false, $3, 0.95, $4)
    `,
    [scheduleId, pendingCandidateId, 'Monday from 3 PM to 6 PM', CREATED_AT]
  );

  await fixturePool.query(
    `
      insert into public.deal_candidate_items (
        id,
        candidate_id,
        name,
        category,
        description,
        deal_price,
        regular_price,
        discount_text,
        raw_item_text,
        sort_order,
        confidence,
        created_at
      ) values ($1, $2, 'House drink', 'cocktail', $3, 6, 9, '$3 off', $4, 0, 0.9, $5)
    `,
    [itemId, pendingCandidateId, 'Rotating house selection', 'House drinks are $6', CREATED_AT]
  );
}
