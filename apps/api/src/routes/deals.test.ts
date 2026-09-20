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
const LA_SUNDAY_14_00 = new Date('2026-09-20T21:00:00.000Z');
const LA_SUNDAY_15_00 = new Date('2026-09-20T22:00:00.000Z');
const LA_SUNDAY_16_00 = new Date('2026-09-20T23:00:00.000Z');
const LA_SUNDAY_17_00 = new Date('2026-09-21T00:00:00.000Z');
const LA_SUNDAY_18_00 = new Date('2026-09-21T01:00:00.000Z');
const LA_SUNDAY_22_30 = new Date('2026-09-21T05:30:00.000Z');
const LA_MONDAY_00_30 = new Date('2026-09-21T07:30:00.000Z');
const LA_MONDAY_01_00 = new Date('2026-09-21T08:00:00.000Z');

type NearbyDealsResponse = {
  deals: Array<{
    venue: { id: string };
    deal: {
      id: string;
      items: Array<{
        name: string;
        category: string | null;
        description: string | null;
        dealPrice: number | null;
        regularPrice: number | null;
        discountText: string | null;
      }>;
      source: {
        type: string;
        url: string | null;
        label: string | null;
      } | null;
      lastVerifiedAt: string | null;
    };
    availability: 'active_now' | 'later_today';
    schedule: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    };
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

test('classifies a currently active verified deal as active_now', async () => {
  currentTime = LA_SUNDAY_17_00;
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createFixedSchedule(dealId);

  const deal = (await getNearbyDeals()).find((nearbyDeal) => nearbyDeal.deal.id === dealId);

  assert.equal(deal?.availability, 'active_now');
});

test('classifies a deal starting later on the venue local date as later_today', async () => {
  currentTime = LA_SUNDAY_15_00;
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createFixedSchedule(dealId);

  const deal = (await getNearbyDeals()).find((nearbyDeal) => nearbyDeal.deal.id === dealId);

  assert.equal(deal?.availability, 'later_today');
});

test('returns structured deal items in display order', async () => {
  currentTime = LA_SUNDAY_17_00;
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createFixedSchedule(dealId);
  await createDealItem(dealId, {
    name: 'Second item',
    category: 'food',
    dealPrice: 8,
    regularPrice: 12,
    sortOrder: 2
  });
  await createDealItem(dealId, {
    name: 'First item',
    description: 'A compact item description',
    discountText: '$2 off',
    sortOrder: 1
  });

  const deal = (await getNearbyDeals()).find((nearbyDeal) => nearbyDeal.deal.id === dealId);

  assert.deepEqual(deal?.deal.items, [
    {
      name: 'First item',
      category: null,
      description: 'A compact item description',
      dealPrice: null,
      regularPrice: null,
      discountText: '$2 off'
    },
    {
      name: 'Second item',
      category: 'food',
      description: null,
      dealPrice: 8,
      regularPrice: 12,
      discountText: null
    }
  ]);
});

test('returns an empty items array when a deal has no structured items', async () => {
  currentTime = LA_SUNDAY_17_00;
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createFixedSchedule(dealId);

  const deal = (await getNearbyDeals()).find((nearbyDeal) => nearbyDeal.deal.id === dealId);

  assert.deepEqual(deal?.deal.items, []);
});

test('returns source provenance and the last verification timestamp', async () => {
  currentTime = LA_SUNDAY_17_00;
  const lastVerifiedAt = new Date('2026-09-19T18:30:00.000Z');
  const venueId = await createVenue();
  const dealId = await createDeal(venueId, { lastVerifiedAt });
  await createFixedSchedule(dealId);
  await createDealSource(dealId, {
    type: 'official_website',
    url: 'https://example.com/happy-hour',
    label: 'Official happy hour menu'
  });

  const deal = (await getNearbyDeals()).find((nearbyDeal) => nearbyDeal.deal.id === dealId);

  assert.deepEqual(deal?.deal.source, {
    type: 'official_website',
    url: 'https://example.com/happy-hour',
    label: 'Official happy hour menu'
  });
  assert.equal(deal?.deal.lastVerifiedAt, lastVerifiedAt.toISOString());
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
  await createFixedSchedule(losAngelesDealId, { startTime: '18:00', endTime: '19:00' });
  await createFixedSchedule(utcDealId, { dayOfWeek: 1, startTime: '00:00', endTime: '01:00' });

  const deals = await getNearbyDeals();
  const losAngelesDeal = deals.find((deal) => deal.deal.id === losAngelesDealId);
  const utcDeal = deals.find((deal) => deal.deal.id === utcDealId);

  assert.equal(losAngelesDeal?.availability, 'later_today');
  assert.equal(utcDeal?.availability, 'active_now');
});

test('includes the fixed schedule start and excludes its end boundary', async () => {
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createFixedSchedule(dealId);

  currentTime = LA_SUNDAY_16_00;
  const dealAtStart = (await getNearbyDeals()).find((deal) => deal.deal.id === dealId);
  assert.equal(dealAtStart?.availability, 'active_now');

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

test('includes an until-close deal that starts later today', async () => {
  currentTime = LA_SUNDAY_17_00;
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createVenueHours(venueId);
  await createUntilCloseSchedule(dealId);

  const deal = (await getNearbyDeals()).find((nearbyDeal) => nearbyDeal.deal.id === dealId);

  assert.equal(deal?.availability, 'later_today');
  assert.equal(deal?.schedule.endTime, '01:00:00');
});

test('keeps a previous-day until-close deal active after midnight', async () => {
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createVenueHours(venueId);
  await createUntilCloseSchedule(dealId);

  currentTime = LA_MONDAY_00_30;
  const deal = (await getNearbyDeals()).find((nearbyDeal) => nearbyDeal.deal.id === dealId);

  assert.equal(deal?.availability, 'active_now');
});

test('orders active-now deals before later-today deals', async () => {
  currentTime = LA_SUNDAY_17_00;
  const venueId = await createVenue();
  const activeDealId = await createDeal(venueId);
  const laterDealId = await createDeal(venueId);
  await createFixedSchedule(activeDealId);
  await createFixedSchedule(laterDealId, { startTime: '19:00', endTime: '20:00' });

  const dealIds = (await getNearbyDeals()).map((deal) => deal.deal.id);
  const activeIndex = dealIds.indexOf(activeDealId);
  const laterIndex = dealIds.indexOf(laterDealId);

  assert.notEqual(activeIndex, -1);
  assert.notEqual(laterIndex, -1);
  assert.ok(activeIndex < laterIndex);
});

test('orders later-today deals by their local start time', async () => {
  currentTime = LA_SUNDAY_14_00;
  const venueId = await createVenue();
  const earlierDealId = await createDeal(venueId);
  const laterDealId = await createDeal(venueId);
  await createFixedSchedule(earlierDealId, { startTime: '15:00', endTime: '16:00' });
  await createFixedSchedule(laterDealId, { startTime: '19:00', endTime: '20:00' });

  const dealIds = (await getNearbyDeals()).map((deal) => deal.deal.id);
  const earlierIndex = dealIds.indexOf(earlierDealId);
  const laterIndex = dealIds.indexOf(laterDealId);

  assert.notEqual(earlierIndex, -1);
  assert.notEqual(laterIndex, -1);
  assert.ok(earlierIndex < laterIndex);
});

test('excludes deals that only occur tomorrow in the venue local timezone', async () => {
  currentTime = LA_SUNDAY_17_00;
  const venueId = await createVenue();
  const dealId = await createDeal(venueId);
  await createFixedSchedule(dealId, { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' });

  assert.ok(!(await getNearbyDealIds()).has(dealId));
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
    lastVerifiedAt?: Date;
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
      options.verificationStatus === 'pending' ? null : (options.lastVerifiedAt ?? LA_SUNDAY_17_00)
    ]
  );

  return dealId;
}

async function createDealItem(
  dealId: string,
  options: {
    name: string;
    category?: string;
    description?: string;
    dealPrice?: number;
    regularPrice?: number;
    discountText?: string;
    sortOrder?: number;
  }
) {
  await fixturePool.query(
    `
      insert into public.deal_items (
        deal_id,
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
      dealId,
      options.name,
      options.category ?? null,
      options.description ?? null,
      options.dealPrice ?? null,
      options.regularPrice ?? null,
      options.discountText ?? null,
      options.sortOrder ?? 0
    ]
  );
}

async function createDealSource(
  dealId: string,
  source: { type: string; url: string | null; label: string | null }
) {
  await fixturePool.query(
    `
      insert into public.deal_sources (
        deal_id,
        source_type,
        source_url,
        source_label,
        last_checked_at
      ) values ($1, $2, $3, $4, $5)
    `,
    [dealId, source.type, source.url, source.label, LA_SUNDAY_17_00]
  );
}

async function createFixedSchedule(
  dealId: string,
  options: { dayOfWeek?: number; startTime?: string; endTime?: string } = {}
) {
  await fixturePool.query(
    `
      insert into public.deal_schedule_windows (
        deal_id,
        day_of_week,
        start_time,
        end_time,
        ends_at_venue_close
      ) values ($1, $2, $3::time, $4::time, false)
    `,
    [dealId, options.dayOfWeek ?? 0, options.startTime ?? '16:00', options.endTime ?? '18:00']
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
  const deals = await getNearbyDeals(options);
  return new Set(deals.map((deal) => deal.deal.id));
}

async function getNearbyDeals(options: { radiusMiles?: number } = {}) {
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
  return body.deals;
}
