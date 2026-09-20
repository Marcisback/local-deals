import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import Fastify from 'fastify';
import { Pool } from 'pg';

import { closeDatabasePool } from '../db.js';
import { dealRoutes } from './deals.js';

const BASE_LATITUDE = 37.3361;
const BASE_LONGITUDE = -121.8896;
const LA_SUNDAY_16_00 = new Date('2026-09-20T23:00:00.000Z');
const LA_SUNDAY_17_00 = new Date('2026-09-21T00:00:00.000Z');
const LA_SUNDAY_18_00 = new Date('2026-09-21T01:00:00.000Z');
const LA_SUNDAY_22_30 = new Date('2026-09-21T05:30:00.000Z');
const LA_MONDAY_00_30 = new Date('2026-09-21T07:30:00.000Z');
const LA_MONDAY_01_00 = new Date('2026-09-21T08:00:00.000Z');

type NearbyDealsResponse = {
  deals: Array<{
    venue: { id: string };
    deal: { id: string };
  }>;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run nearby deal integration tests.');
}

const fixturePool = new Pool({ connectionString });
const fixtureVenueIds: string[] = [];
let currentTime = LA_SUNDAY_17_00;

const app = Fastify({ logger: false });
app.register(dealRoutes, {
  now: () => currentTime
});

before(async () => {
  await fixturePool.query('select 1');
  await app.ready();
});

after(async () => {
  if (fixtureVenueIds.length > 0) {
    await fixturePool.query('delete from public.venues where id = any($1::uuid[])', [fixtureVenueIds]);
  }

  await app.close();
  await closeDatabasePool();
  await fixturePool.end();
});

test('returns a verified deal at a verified venue', async () => {
  currentTime = LA_SUNDAY_17_00;
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createFixedSchedule(dealId);

  const dealIds = await getNearbyDealIds();

  assert.ok(dealIds.has(dealId));
});

test('excludes a verified deal at an unverified venue', async () => {
  currentTime = LA_SUNDAY_17_00;
  const venueId = await createVenue({ isVerified: false });
  const dealId = await createDeal(venueId);
  await createFixedSchedule(dealId);

  const dealIds = await getNearbyDealIds();

  assert.ok(!dealIds.has(dealId));
});

test('excludes unverified and inactive deals', async () => {
  currentTime = LA_SUNDAY_17_00;
  const venueId = await createVenue();
  const unverifiedDealId = await createDeal(venueId, { verificationStatus: 'pending' });
  const inactiveDealId = await createDeal(venueId, { status: 'inactive' });
  await createFixedSchedule(unverifiedDealId);
  await createFixedSchedule(inactiveDealId);

  const dealIds = await getNearbyDealIds();

  assert.ok(!dealIds.has(unverifiedDealId));
  assert.ok(!dealIds.has(inactiveDealId));
});

test('filters deals outside the requested radius', async () => {
  currentTime = LA_SUNDAY_17_00;
  const nearVenueId = await createVenue();
  const farVenueId = await createVenue({ latitude: 37.5 });
  const nearDealId = await createDeal(nearVenueId);
  const farDealId = await createDeal(farVenueId);
  await createFixedSchedule(nearDealId);
  await createFixedSchedule(farDealId);

  const dealIds = await getNearbyDealIds({ radiusMiles: 5 });

  assert.ok(dealIds.has(nearDealId));
  assert.ok(!dealIds.has(farDealId));
});

test('evaluates schedules in each venue local timezone', async () => {
  currentTime = LA_SUNDAY_17_00;
  const losAngelesVenueId = await createVenue({ timezone: 'America/Los_Angeles' });
  const utcVenueId = await createVenue({ timezone: 'UTC' });
  const losAngelesDealId = await createDeal(losAngelesVenueId);
  const utcDealId = await createDeal(utcVenueId);
  await createFixedSchedule(losAngelesDealId);
  await createFixedSchedule(utcDealId);

  const dealIds = await getNearbyDealIds();

  assert.ok(dealIds.has(losAngelesDealId));
  assert.ok(!dealIds.has(utcDealId));
});

test('includes the fixed schedule start and excludes its end boundary', async () => {
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createFixedSchedule(dealId);

  currentTime = LA_SUNDAY_16_00;
  assert.ok((await getNearbyDealIds()).has(dealId));

  currentTime = LA_SUNDAY_18_00;
  assert.ok(!(await getNearbyDealIds()).has(dealId));
});

test('keeps an until-close deal active before closing and excludes the close boundary', async () => {
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createVenueHours(venueId);
  await createUntilCloseSchedule(dealId);

  currentTime = LA_SUNDAY_22_30;
  assert.ok((await getNearbyDealIds()).has(dealId));

  currentTime = LA_MONDAY_01_00;
  assert.ok(!(await getNearbyDealIds()).has(dealId));
});

test('keeps a previous-day until-close deal active after midnight', async () => {
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createVenueHours(venueId);
  await createUntilCloseSchedule(dealId);

  currentTime = LA_MONDAY_00_30;
  const dealIds = await getNearbyDealIds();

  assert.ok(dealIds.has(dealId));
});

async function createVenue(
  options: {
    isVerified?: boolean;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  } = {}
) {
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
        $5,
        'active',
        $6
      )
    `,
    [
      venueId,
      `API test venue ${venueId}`,
      options.longitude ?? BASE_LONGITUDE,
      options.latitude ?? BASE_LATITUDE,
      options.timezone ?? 'America/Los_Angeles',
      options.isVerified ?? true
    ]
  );

  return venueId;
}

async function createDeal(
  venueId: string,
  options: {
    status?: 'active' | 'inactive';
    verificationStatus?: 'pending' | 'verified' | 'rejected' | 'stale';
  } = {}
) {
  const dealId = randomUUID();

  await fixturePool.query(
    `
      insert into public.deals (
        id,
        venue_id,
        title,
        status,
        verification_status,
        last_verified_at
      ) values ($1, $2, $3, $4, $5, $6)
    `,
    [
      dealId,
      venueId,
      `API test deal ${dealId}`,
      options.status ?? 'active',
      options.verificationStatus ?? 'verified',
      options.verificationStatus === 'pending' ? null : LA_SUNDAY_17_00
    ]
  );

  return dealId;
}

async function createFixedSchedule(dealId: string) {
  await fixturePool.query(
    `
      insert into public.deal_schedule_windows (
        deal_id,
        day_of_week,
        start_time,
        end_time,
        ends_at_venue_close
      ) values ($1, 0, time '16:00', time '18:00', false)
    `,
    [dealId]
  );
}

async function createUntilCloseSchedule(dealId: string) {
  await fixturePool.query(
    `
      insert into public.deal_schedule_windows (
        deal_id,
        day_of_week,
        start_time,
        end_time,
        ends_at_venue_close
      ) values ($1, 0, time '22:00', null, true)
    `,
    [dealId]
  );
}

async function createVenueHours(venueId: string) {
  await fixturePool.query(
    `
      insert into public.venue_hours (
        venue_id,
        day_of_week,
        open_time,
        close_time,
        closes_next_day
      ) values ($1, 0, time '11:00', time '01:00', true)
    `,
    [venueId]
  );
}

async function getNearbyDealIds(options: { radiusMiles?: number } = {}) {
  const response = await app.inject({
    method: 'GET',
    url: '/deals/nearby',
    query: {
      lat: BASE_LATITUDE.toString(),
      lng: BASE_LONGITUDE.toString(),
      radiusMiles: (options.radiusMiles ?? 5).toString()
    }
  });

  assert.equal(response.statusCode, 200, response.body);

  const body = response.json<NearbyDealsResponse>();
  return new Set(body.deals.map((deal) => deal.deal.id));
}
