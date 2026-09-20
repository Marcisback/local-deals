import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import Fastify from 'fastify';
import { Pool } from 'pg';

import { closeDatabasePool } from '../../db.js';
import { dealRoutes } from '../deals.js';
import { internalDealCandidateRoutes } from './deal-candidates.js';

const BASE_LATITUDE = 37.3361;
const BASE_LONGITUDE = -121.8896;
const DISCOVERY_TIME = new Date('2026-09-21T00:00:00.000Z');
const REVIEWED_AT = new Date('2026-09-20T18:00:00.000Z');
const DISCOVERED_AT = new Date('2026-09-19T17:00:00.000Z');
const CHECKED_AT = new Date('2026-09-20T17:30:00.000Z');
const ROLLBACK_NOTE = 'force-publication-rollback-test';
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run candidate publication integration tests.');
}

type CandidateStatus = 'pending' | 'approved' | 'rejected';

type ScheduleFixture = {
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  endsAtVenueClose: boolean;
};

type ItemFixture = {
  name: string | null;
  category?: string | null;
  description?: string | null;
  dealPrice?: number | null;
  regularPrice?: number | null;
  discountText?: string | null;
  sortOrder?: number;
};

const fixturePool = new Pool({ connectionString });
const fixtureVenueIds: string[] = [];
const fixtureCandidateIds: string[] = [];
const app = Fastify({ logger: false });
app.register(internalDealCandidateRoutes);
app.register(dealRoutes, { now: () => DISCOVERY_TIME });

before(async () => {
  await fixturePool.query('select 1');
  await app.ready();
});

after(async () => {
  await removeRollbackTrigger();

  if (fixtureCandidateIds.length > 0) {
    await fixturePool.query('delete from public.deal_candidates where id = any($1::uuid[])', [fixtureCandidateIds]);
  }

  if (fixtureVenueIds.length > 0) {
    await fixturePool.query('delete from public.deals where venue_id = any($1::uuid[])', [fixtureVenueIds]);
    await fixturePool.query('delete from public.venues where id = any($1::uuid[])', [fixtureVenueIds]);
  }

  await app.close();
  await closeDatabasePool();
  await fixturePool.end();
});

test('publishes an approved candidate and records its durable production link', async () => {
  const venueId = await createVenue();
  const candidateId = await createCandidate({ venueId });

  const response = await publishCandidate(candidateId);

  assert.equal(response.statusCode, 201, response.body);
  const body = response.json<{
    candidateId: string;
    dealId: string;
    publicationStatus: string;
    scheduleCount: number;
    itemCount: number;
  }>();
  assert.deepEqual(body, {
    candidateId,
    dealId: body.dealId,
    publicationStatus: 'published',
    scheduleCount: 1,
    itemCount: 1
  });

  const candidate = await fixturePool.query<{ published_deal_id: string; published_at: Date | null }>(
    'select published_deal_id, published_at from public.deal_candidates where id = $1',
    [candidateId]
  );
  assert.equal(candidate.rows[0]?.published_deal_id, body.dealId);
  assert.ok(candidate.rows[0]?.published_at instanceof Date);

  const detailResponse = await app.inject({
    method: 'GET',
    url: `/internal/deal-candidates/${candidateId}`
  });
  assert.equal(detailResponse.statusCode, 200, detailResponse.body);
  const detail = detailResponse.json<{
    candidate: { publishedDealId: string | null; publishedAt: string | null };
  }>().candidate;
  assert.equal(detail.publishedDealId, body.dealId);
  assert.ok(detail.publishedAt && !Number.isNaN(Date.parse(detail.publishedAt)));

  const deal = await fixturePool.query<{
    venue_id: string;
    title: string;
    status: string;
    starts_on: string | null;
    ends_on: string | null;
    verification_status: string;
    last_verified_at: Date;
  }>(
    `
      select venue_id, title, status, starts_on, ends_on, verification_status, last_verified_at
      from public.deals
      where id = $1
    `,
    [body.dealId]
  );
  assert.deepEqual(deal.rows[0], {
    venue_id: venueId,
    title: `Publication fixture ${candidateId}`,
    status: 'active',
    starts_on: null,
    ends_on: null,
    verification_status: 'verified',
    last_verified_at: REVIEWED_AT
  });
});

test('does not publish pending or rejected candidates', async () => {
  const venueId = await createVenue();
  const pendingCandidateId = await createCandidate({ venueId, reviewStatus: 'pending' });
  const rejectedCandidateId = await createCandidate({ venueId, reviewStatus: 'rejected' });

  const pendingResponse = await publishCandidate(pendingCandidateId);
  const rejectedResponse = await publishCandidate(rejectedCandidateId);

  assert.equal(pendingResponse.statusCode, 409, pendingResponse.body);
  assert.equal(pendingResponse.json<{ reviewStatus: string }>().reviewStatus, 'pending');
  assert.equal(rejectedResponse.statusCode, 409, rejectedResponse.body);
  assert.equal(rejectedResponse.json<{ reviewStatus: string }>().reviewStatus, 'rejected');
  assert.equal(await countProductionDeals(venueId), 0);
});

test('does not publish candidates linked to an unverified venue', async () => {
  const venueId = await createVenue(false);
  const candidateId = await createCandidate({ venueId });

  const response = await publishCandidate(candidateId);

  assert.equal(response.statusCode, 422, response.body);
  assert.equal(response.json<{ reason: string }>().reason, 'Candidate venue must be verified');
  assert.equal(await countProductionDeals(venueId), 0);
});

test('does not publish candidates without a linked venue', async () => {
  const candidateId = await createCandidate({ venueId: null });

  const response = await publishCandidate(candidateId);

  assert.equal(response.statusCode, 422, response.body);
  assert.equal(response.json<{ reason: string }>().reason, 'Candidate must be linked to a valid venue');
});

test('blocks publication when normalized title, schedules, or items are invalid', async () => {
  const venueId = await createVenue();
  const invalidCandidates = [
    await createCandidate({ venueId, title: '   ' }),
    await createCandidate({ venueId, schedules: [] }),
    await createCandidate({
      venueId,
      schedules: [{ dayOfWeek: 0, startTime: null, endTime: '18:00', endsAtVenueClose: false }]
    }),
    await createCandidate({ venueId, items: [{ name: '   ' }] })
  ];

  for (const candidateId of invalidCandidates) {
    const response = await publishCandidate(candidateId);
    assert.equal(response.statusCode, 422, response.body);
  }

  assert.equal(await countProductionDeals(venueId), 0);
});

test('copies fixed and until-close schedules plus structured items', async () => {
  const venueId = await createVenue();
  const candidateId = await createCandidate({
    venueId,
    schedules: [
      { dayOfWeek: 0, startTime: '16:00', endTime: '18:00', endsAtVenueClose: false },
      { dayOfWeek: 1, startTime: '22:00', endTime: null, endsAtVenueClose: true }
    ],
    items: [
      {
        name: 'House cocktail',
        category: 'cocktail',
        description: 'Rotating selection',
        dealPrice: 6,
        regularPrice: 9,
        discountText: '$3 off',
        sortOrder: 0
      },
      { name: 'Truffle fries', category: 'food', dealPrice: 7, sortOrder: 1 }
    ]
  });

  const response = await publishCandidate(candidateId);
  assert.equal(response.statusCode, 201, response.body);
  const body = response.json<{ dealId: string; scheduleCount: number; itemCount: number }>();
  assert.equal(body.scheduleCount, 2);
  assert.equal(body.itemCount, 2);

  const schedules = await fixturePool.query(
    `
      select day_of_week, start_time::text, end_time::text, ends_at_venue_close
      from public.deal_schedule_windows
      where deal_id = $1
      order by day_of_week
    `,
    [body.dealId]
  );
  assert.deepEqual(schedules.rows, [
    { day_of_week: 0, start_time: '16:00:00', end_time: '18:00:00', ends_at_venue_close: false },
    { day_of_week: 1, start_time: '22:00:00', end_time: null, ends_at_venue_close: true }
  ]);

  const items = await fixturePool.query(
    `
      select name, category, description, deal_price::text, regular_price::text, discount_text, sort_order
      from public.deal_items
      where deal_id = $1
      order by sort_order
    `,
    [body.dealId]
  );
  assert.deepEqual(items.rows, [
    {
      name: 'House cocktail',
      category: 'cocktail',
      description: 'Rotating selection',
      deal_price: '6.00',
      regular_price: '9.00',
      discount_text: '$3 off',
      sort_order: 0
    },
    {
      name: 'Truffle fries',
      category: 'food',
      description: null,
      deal_price: '7.00',
      regular_price: null,
      discount_text: null,
      sort_order: 1
    }
  ]);
});

test('copies source provenance faithfully and creates a confirmed verification', async () => {
  const venueId = await createVenue();
  const candidateId = await createCandidate({
    venueId,
    sourceType: 'instagram',
    reviewNotes: 'Reviewer confirmed the official social post.'
  });

  const response = await publishCandidate(candidateId);
  assert.equal(response.statusCode, 201, response.body);
  const dealId = response.json<{ dealId: string }>().dealId;

  const source = await fixturePool.query<{
    id: string;
    source_type: string;
    source_url: string;
    source_label: string | null;
    discovered_at: Date;
    last_checked_at: Date | null;
  }>(
    `
      select id, source_type, source_url, source_label, discovered_at, last_checked_at
      from public.deal_sources
      where deal_id = $1
    `,
    [dealId]
  );
  assert.equal(source.rows[0]?.source_type, 'instagram');
  assert.equal(source.rows[0]?.source_url, `https://example.com/source/${candidateId}`);
  assert.equal(source.rows[0]?.source_label, 'Publication fixture source');
  assert.deepEqual(source.rows[0]?.discovered_at, DISCOVERED_AT);
  assert.deepEqual(source.rows[0]?.last_checked_at, CHECKED_AT);

  const verification = await fixturePool.query<{
    source_id: string;
    verification_method: string;
    result: string;
    notes: string | null;
    verified_at: Date;
  }>(
    `
      select source_id, verification_method, result, notes, verified_at
      from public.deal_verifications
      where deal_id = $1
    `,
    [dealId]
  );
  assert.deepEqual(verification.rows[0], {
    source_id: source.rows[0].id,
    verification_method: 'website',
    result: 'confirmed',
    notes: 'Reviewer confirmed the official social post.',
    verified_at: REVIEWED_AT
  });
});

test('published verification data makes the deal eligible for nearby discovery', async () => {
  const venueId = await createVenue();
  const candidateId = await createCandidate({ venueId });
  const publishResponse = await publishCandidate(candidateId);
  assert.equal(publishResponse.statusCode, 201, publishResponse.body);
  const dealId = publishResponse.json<{ dealId: string }>().dealId;

  const discoveryResponse = await app.inject({
    method: 'GET',
    url: '/deals/nearby',
    query: {
      lat: BASE_LATITUDE.toString(),
      lng: BASE_LONGITUDE.toString(),
      radiusMiles: '5'
    }
  });

  assert.equal(discoveryResponse.statusCode, 200, discoveryResponse.body);
  const deals = discoveryResponse.json<{ deals: Array<{ deal: { id: string } }> }>().deals;
  assert.ok(deals.some((deal) => deal.deal.id === dealId));
});

test('repeated publication returns the existing deal without duplicating production rows', async () => {
  const venueId = await createVenue();
  const candidateId = await createCandidate({ venueId });

  const firstResponse = await publishCandidate(candidateId);
  const repeatedResponse = await publishCandidate(candidateId);

  assert.equal(firstResponse.statusCode, 201, firstResponse.body);
  assert.equal(repeatedResponse.statusCode, 200, repeatedResponse.body);
  const first = firstResponse.json<{ dealId: string }>();
  const repeated = repeatedResponse.json<{
    dealId: string;
    publicationStatus: string;
    scheduleCount: number;
    itemCount: number;
  }>();
  assert.equal(repeated.dealId, first.dealId);
  assert.equal(repeated.publicationStatus, 'already_published');
  assert.equal(repeated.scheduleCount, 1);
  assert.equal(repeated.itemCount, 1);
  assert.equal(await countProductionDeals(venueId), 1);
});

test('a late publication failure rolls back every production write and candidate link', async () => {
  const venueId = await createVenue();
  const candidateId = await createCandidate({ venueId, reviewNotes: ROLLBACK_NOTE });
  await installRollbackTrigger();

  try {
    const response = await publishCandidate(candidateId);
    assert.equal(response.statusCode, 500, response.body);
  } finally {
    await removeRollbackTrigger();
  }

  assert.equal(await countProductionDeals(venueId), 0);
  const candidate = await fixturePool.query<{ published_deal_id: string | null; published_at: Date | null }>(
    'select published_deal_id, published_at from public.deal_candidates where id = $1',
    [candidateId]
  );
  assert.deepEqual(candidate.rows[0], {
    published_deal_id: null,
    published_at: null
  });
});

test('returns not found for a missing candidate and rejects malformed ids', async () => {
  const missingResponse = await publishCandidate(randomUUID());
  const malformedResponse = await publishCandidate('not-a-uuid');

  assert.equal(missingResponse.statusCode, 404, missingResponse.body);
  assert.equal(malformedResponse.statusCode, 400, malformedResponse.body);
});

async function createVenue(isVerified = true) {
  const venueId = randomUUID();
  fixtureVenueIds.push(venueId);

  await fixturePool.query(
    `
      insert into public.venues (
        id,
        name,
        venue_type,
        city,
        region,
        location,
        timezone,
        status,
        is_verified
      ) values (
        $1,
        $2,
        'restaurant',
        'San Jose',
        'CA',
        st_setsrid(st_makepoint($3, $4), 4326)::geography,
        'America/Los_Angeles',
        'active',
        $5
      )
    `,
    [venueId, `Publication test venue ${venueId}`, BASE_LONGITUDE, BASE_LATITUDE, isVerified]
  );

  return venueId;
}

async function createCandidate(options: {
  venueId: string | null;
  reviewStatus?: CandidateStatus;
  title?: string | null;
  sourceType?: 'official_website' | 'instagram' | 'facebook' | 'business_submission' | 'user_submission' | 'manual' | 'other';
  reviewNotes?: string | null;
  schedules?: ScheduleFixture[];
  items?: ItemFixture[];
}) {
  const candidateId = randomUUID();
  fixtureCandidateIds.push(candidateId);
  const reviewStatus = options.reviewStatus ?? 'approved';
  const title = options.title === undefined ? `Publication fixture ${candidateId}` : options.title;

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
        discovered_at,
        source_last_checked_at,
        review_status,
        review_notes,
        reviewed_at
      ) values ($1, $2, $3, $4, 'Publication fixture source', $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      candidateId,
      options.venueId,
      `https://example.com/source/${candidateId}`,
      options.sourceType ?? 'official_website',
      `publication-${candidateId}`,
      title,
      'Candidate ready for controlled publication.',
      DISCOVERED_AT,
      CHECKED_AT,
      reviewStatus,
      options.reviewNotes ?? null,
      reviewStatus === 'approved' || reviewStatus === 'rejected' ? REVIEWED_AT : null
    ]
  );

  const schedules = options.schedules ?? [
    { dayOfWeek: 0, startTime: '16:00', endTime: '18:00', endsAtVenueClose: false }
  ];
  for (const schedule of schedules) {
    await fixturePool.query(
      `
        insert into public.deal_candidate_schedule_windows (
          candidate_id,
          day_of_week,
          start_time,
          end_time,
          ends_at_venue_close
        ) values ($1, $2, $3, $4, $5)
      `,
      [candidateId, schedule.dayOfWeek, schedule.startTime, schedule.endTime, schedule.endsAtVenueClose]
    );
  }

  const items = options.items ?? [{ name: 'House special', category: 'food', dealPrice: 6 }];
  for (const [index, item] of items.entries()) {
    await fixturePool.query(
      `
        insert into public.deal_candidate_items (
          candidate_id,
          name,
          category,
          description,
          deal_price,
          regular_price,
          discount_text,
          sort_order
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        candidateId,
        item.name,
        item.category ?? null,
        item.description ?? null,
        item.dealPrice ?? null,
        item.regularPrice ?? null,
        item.discountText ?? null,
        item.sortOrder ?? index
      ]
    );
  }

  return candidateId;
}

async function publishCandidate(candidateId: string) {
  return app.inject({
    method: 'POST',
    url: `/internal/deal-candidates/${candidateId}/publish`
  });
}

async function countProductionDeals(venueId: string) {
  const result = await fixturePool.query<{ count: string }>(
    'select count(*)::text as count from public.deals where venue_id = $1',
    [venueId]
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function installRollbackTrigger() {
  await removeRollbackTrigger();
  await fixturePool.query(`
    create function public.test_fail_candidate_publication_verification()
    returns trigger
    language plpgsql
    as $$
    begin
      if new.notes = '${ROLLBACK_NOTE}' then
        raise exception 'forced publication rollback';
      end if;
      return new;
    end;
    $$
  `);
  await fixturePool.query(`
    create trigger test_fail_candidate_publication_verification
    before insert on public.deal_verifications
    for each row
    execute function public.test_fail_candidate_publication_verification()
  `);
}

async function removeRollbackTrigger() {
  await fixturePool.query('drop trigger if exists test_fail_candidate_publication_verification on public.deal_verifications');
  await fixturePool.query('drop function if exists public.test_fail_candidate_publication_verification()');
}
