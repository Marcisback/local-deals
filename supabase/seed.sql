begin;

set timezone = 'UTC';

-- Deterministic local-development seed data for nearby venue and active-deal testing.
-- Venue coordinates use longitude first, latitude second when constructing geography points.

insert into public.venues (
  id,
  name,
  venue_type,
  address_line_1,
  address_line_2,
  city,
  region,
  postal_code,
  country_code,
  location,
  timezone,
  status,
  is_verified,
  created_at,
  updated_at
) values
  (
    '11111111-1111-4111-8111-000000000001',
    'Signal House Kitchen',
    'restaurant',
    '220 S 1st St',
    null,
    'San Jose',
    'CA',
    '95113',
    'US',
    st_setsrid(st_makepoint(-121.8896, 37.3361), 4326)::geography,
    'America/Los_Angeles',
    'active',
    true,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '11111111-1111-4111-8111-000000000002',
    'Meridian Pour House',
    'bar',
    '47 E San Fernando St',
    'Suite 2',
    'San Jose',
    'CA',
    '95112',
    'US',
    st_setsrid(st_makepoint(-121.8889, 37.3335), 4326)::geography,
    'America/Los_Angeles',
    'active',
    false,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '11111111-1111-4111-8111-000000000003',
    'Willow & Vine Cafe',
    'cafe',
    '1170 Lincoln Ave',
    null,
    'San Jose',
    'CA',
    '95125',
    'US',
    st_setsrid(st_makepoint(-121.8944, 37.3009), 4326)::geography,
    'America/Los_Angeles',
    'active',
    true,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '11111111-1111-4111-8111-000000000004',
    'Prune Street Brewery Co.',
    'brewery',
    '100 S Central Ave',
    null,
    'Campbell',
    'CA',
    '95008',
    'US',
    st_setsrid(st_makepoint(-121.9509, 37.2871), 4326)::geography,
    'America/Los_Angeles',
    'active',
    false,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '11111111-1111-4111-8111-000000000005',
    'Rowhouse Tap Kitchen',
    'restaurant',
    '377 Santana Row',
    'Level 1',
    'San Jose',
    'CA',
    '95128',
    'US',
    st_setsrid(st_makepoint(-121.9472, 37.3219), 4326)::geography,
    'America/Los_Angeles',
    'active',
    false,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '11111111-1111-4111-8111-000000000006',
    'Paper Lantern Lounge',
    'bar',
    '211 N 13th St',
    null,
    'San Jose',
    'CA',
    '95112',
    'US',
    st_setsrid(st_makepoint(-121.9015, 37.3492), 4326)::geography,
    'America/Los_Angeles',
    'active',
    true,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '11111111-1111-4111-8111-000000000007',
    'Alviso Harbor Cafe',
    'cafe',
    '1000 N First St',
    null,
    'San Jose',
    'CA',
    '95002',
    'US',
    st_setsrid(st_makepoint(-121.9795, 37.4245), 4326)::geography,
    'America/Los_Angeles',
    'active',
    false,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '11111111-1111-4111-8111-000000000008',
    'Evergreen Arcade Bar',
    'bar',
    '3380 Alum Rock Ave',
    null,
    'San Jose',
    'CA',
    '95127',
    'US',
    st_setsrid(st_makepoint(-121.8043, 37.3561), 4326)::geography,
    'America/Los_Angeles',
    'inactive',
    false,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  );

insert into public.deals (
  id,
  venue_id,
  title,
  description,
  status,
  starts_on,
  ends_on,
  created_at,
  updated_at
) values
  (
    '22222222-2222-4222-8222-000000000001',
    '11111111-1111-4111-8111-000000000001',
    'Golden Hour Happy Hour',
    'House cocktails and snacks at a weekday discount.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000002',
    '11111111-1111-4111-8111-000000000001',
    'Half-Price Appetizers',
    'Selected starters are half off during the early evening.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000003',
    '11111111-1111-4111-8111-000000000001',
    'Late Night Bites',
    'Late-night menu for Friday and Saturday service.',
    'inactive',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000004',
    '11111111-1111-4111-8111-000000000002',
    '$6 Cocktail Cart',
    'Select cocktails for a limited summer run.',
    'active',
    date '2026-07-01',
    date '2026-08-31',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000005',
    '11111111-1111-4111-8111-000000000002',
    'Vinyl & Drafts',
    'Small-batch drafts with an evening music set.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000006',
    '11111111-1111-4111-8111-000000000003',
    'Morning Pastry Pairings',
    'Coffee and pastry combo pricing on weekday mornings.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000007',
    '11111111-1111-4111-8111-000000000003',
    'Quiet Pour-Over Hour',
    'Weekend pour-over specials before the lunch rush.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000008',
    '11111111-1111-4111-8111-000000000004',
    'Taco Tuesday',
    'Tacos and pints available every Tuesday evening.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000009',
    '11111111-1111-4111-8111-000000000004',
    'Late Afternoon Pints',
    'Draft specials for the after-work window.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000010',
    '11111111-1111-4111-8111-000000000005',
    'Sunset Small Plates',
    'Shared plates and spritz pairings for weekday evenings.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000011',
    '11111111-1111-4111-8111-000000000005',
    'Weekend Spritz Social',
    'Weekend-only spritz and snack pairing special.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000012',
    '11111111-1111-4111-8111-000000000006',
    'Sushi + Sake Happy Hour',
    'Small plates and sake by the glass during the early evening.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000013',
    '11111111-1111-4111-8111-000000000006',
    'Midnight Udon Special',
    'Late-night bowl special for weekend service.',
    'inactive',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000014',
    '11111111-1111-4111-8111-000000000007',
    'Harbor Roast Brunch',
    'Seasonal brunch and coffee pairing near the airport corridor.',
    'active',
    date '2026-07-15',
    date '2026-09-15',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000015',
    '11111111-1111-4111-8111-000000000008',
    'Pilot Flight Fridays',
    'A Friday beer-and-bites special at the inactive test venue.',
    'active',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  );

insert into public.deal_schedule_windows (
  id,
  deal_id,
  day_of_week,
  start_time,
  end_time,
  created_at,
  updated_at
) values
  -- 0 = Sunday, 6 = Saturday.
  (
    '33333333-3333-4333-8333-000000000001',
    '22222222-2222-4222-8222-000000000001',
    1,
    time '16:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000002',
    '22222222-2222-4222-8222-000000000001',
    2,
    time '16:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000003',
    '22222222-2222-4222-8222-000000000001',
    3,
    time '16:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000004',
    '22222222-2222-4222-8222-000000000001',
    4,
    time '16:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000005',
    '22222222-2222-4222-8222-000000000001',
    5,
    time '16:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000006',
    '22222222-2222-4222-8222-000000000002',
    2,
    time '16:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000007',
    '22222222-2222-4222-8222-000000000002',
    3,
    time '16:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000008',
    '22222222-2222-4222-8222-000000000002',
    4,
    time '16:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000009',
    '22222222-2222-4222-8222-000000000003',
    5,
    time '21:00',
    time '23:59:59',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000010',
    '22222222-2222-4222-8222-000000000003',
    6,
    time '00:00',
    time '01:30',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000011',
    '22222222-2222-4222-8222-000000000004',
    3,
    time '16:00',
    time '19:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000012',
    '22222222-2222-4222-8222-000000000004',
    4,
    time '16:00',
    time '19:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000013',
    '22222222-2222-4222-8222-000000000004',
    5,
    time '16:00',
    time '19:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000014',
    '22222222-2222-4222-8222-000000000005',
    4,
    time '17:00',
    time '20:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000015',
    '22222222-2222-4222-8222-000000000005',
    6,
    time '18:00',
    time '21:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000016',
    '22222222-2222-4222-8222-000000000006',
    1,
    time '07:00',
    time '11:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000017',
    '22222222-2222-4222-8222-000000000006',
    2,
    time '07:00',
    time '11:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000018',
    '22222222-2222-4222-8222-000000000006',
    3,
    time '07:00',
    time '11:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000019',
    '22222222-2222-4222-8222-000000000006',
    4,
    time '07:00',
    time '11:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000020',
    '22222222-2222-4222-8222-000000000006',
    5,
    time '07:00',
    time '11:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000021',
    '22222222-2222-4222-8222-000000000007',
    6,
    time '08:00',
    time '10:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000022',
    '22222222-2222-4222-8222-000000000007',
    0,
    time '08:00',
    time '10:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000023',
    '22222222-2222-4222-8222-000000000008',
    2,
    time '16:00',
    time '21:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000024',
    '22222222-2222-4222-8222-000000000009',
    4,
    time '15:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000025',
    '22222222-2222-4222-8222-000000000009',
    5,
    time '15:00',
    time '18:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000026',
    '22222222-2222-4222-8222-000000000010',
    1,
    time '16:00',
    time '18:30',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000027',
    '22222222-2222-4222-8222-000000000010',
    2,
    time '16:00',
    time '18:30',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000028',
    '22222222-2222-4222-8222-000000000010',
    3,
    time '16:00',
    time '18:30',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000029',
    '22222222-2222-4222-8222-000000000010',
    4,
    time '16:00',
    time '18:30',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000030',
    '22222222-2222-4222-8222-000000000011',
    5,
    time '17:00',
    time '20:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000031',
    '22222222-2222-4222-8222-000000000011',
    6,
    time '17:00',
    time '20:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000032',
    '22222222-2222-4222-8222-000000000012',
    2,
    time '17:00',
    time '19:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000033',
    '22222222-2222-4222-8222-000000000012',
    3,
    time '17:00',
    time '19:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000034',
    '22222222-2222-4222-8222-000000000012',
    4,
    time '17:00',
    time '19:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000035',
    '22222222-2222-4222-8222-000000000012',
    5,
    time '17:00',
    time '19:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000036',
    '22222222-2222-4222-8222-000000000013',
    5,
    time '22:00',
    time '23:59:59',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000037',
    '22222222-2222-4222-8222-000000000013',
    6,
    time '00:00',
    time '01:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000038',
    '22222222-2222-4222-8222-000000000014',
    6,
    time '10:00',
    time '14:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000039',
    '22222222-2222-4222-8222-000000000014',
    0,
    time '10:00',
    time '14:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '33333333-3333-4333-8333-000000000040',
    '22222222-2222-4222-8222-000000000015',
    5,
    time '16:00',
    time '19:00',
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  );

commit;
