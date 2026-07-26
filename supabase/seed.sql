begin;

set timezone = 'UTC';

-- Deterministic local-development seed data for nearby venue and active-deal testing.
-- Venue coordinates use longitude first, latitude second when constructing geography points.
-- Curated real-world development data is stored separately and included at the end.

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
  verification_status,
  last_verified_at,
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
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
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-000000000016',
    '11111111-1111-4111-8111-000000000002',
    'Closing Bell Happy Hour',
    'Late-night specials available until venue close on Wednesday nights.',
    'active',
    'verified',
    timestamptz '2026-07-26 12:00:00+00',
    null,
    null,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  );

insert into public.deal_sources (
  id,
  deal_id,
  source_type,
  source_url,
  source_label,
  discovered_at,
  last_checked_at,
  created_at,
  updated_at
) values
  ('44444444-4444-4444-8444-000000000001', '22222222-2222-4222-8222-000000000001', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000002', '22222222-2222-4222-8222-000000000002', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000003', '22222222-2222-4222-8222-000000000003', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000004', '22222222-2222-4222-8222-000000000004', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000005', '22222222-2222-4222-8222-000000000005', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000006', '22222222-2222-4222-8222-000000000006', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000007', '22222222-2222-4222-8222-000000000007', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000008', '22222222-2222-4222-8222-000000000008', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000009', '22222222-2222-4222-8222-000000000009', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000010', '22222222-2222-4222-8222-000000000010', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000011', '22222222-2222-4222-8222-000000000011', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000012', '22222222-2222-4222-8222-000000000012', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000013', '22222222-2222-4222-8222-000000000013', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000014', '22222222-2222-4222-8222-000000000014', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000015', '22222222-2222-4222-8222-000000000015', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('44444444-4444-4444-8444-000000000016', '22222222-2222-4222-8222-000000000016', 'seed', null, 'Development seed fixture', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00');

insert into public.deal_verifications (
  id,
  deal_id,
  source_id,
  verification_method,
  result,
  notes,
  verified_at,
  created_at
) values
  ('55555555-5555-4555-8555-000000000001', '22222222-2222-4222-8222-000000000001', '44444444-4444-4444-8444-000000000001', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000002', '22222222-2222-4222-8222-000000000002', '44444444-4444-4444-8444-000000000002', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000003', '22222222-2222-4222-8222-000000000003', '44444444-4444-4444-8444-000000000003', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000004', '22222222-2222-4222-8222-000000000004', '44444444-4444-4444-8444-000000000004', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000005', '22222222-2222-4222-8222-000000000005', '44444444-4444-4444-8444-000000000005', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000006', '22222222-2222-4222-8222-000000000006', '44444444-4444-4444-8444-000000000006', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000007', '22222222-2222-4222-8222-000000000007', '44444444-4444-4444-8444-000000000007', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000008', '22222222-2222-4222-8222-000000000008', '44444444-4444-4444-8444-000000000008', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000009', '22222222-2222-4222-8222-000000000009', '44444444-4444-4444-8444-000000000009', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000010', '22222222-2222-4222-8222-000000000010', '44444444-4444-4444-8444-000000000010', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000011', '22222222-2222-4222-8222-000000000011', '44444444-4444-4444-8444-000000000011', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000012', '22222222-2222-4222-8222-000000000012', '44444444-4444-4444-8444-000000000012', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000013', '22222222-2222-4222-8222-000000000013', '44444444-4444-4444-8444-000000000013', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000014', '22222222-2222-4222-8222-000000000014', '44444444-4444-4444-8444-000000000014', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000015', '22222222-2222-4222-8222-000000000015', '44444444-4444-4444-8444-000000000015', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00'),
  ('55555555-5555-4555-8555-000000000016', '22222222-2222-4222-8222-000000000016', '44444444-4444-4444-8444-000000000016', 'manual', 'confirmed', 'Development seed fixture verified for local testing.', timestamptz '2026-07-26 12:00:00+00', timestamptz '2026-07-26 12:00:00+00');

insert into public.venue_hours (
  id,
  venue_id,
  day_of_week,
  open_time,
  close_time,
  closes_next_day,
  created_at,
  updated_at
) values
  (
    '66666666-6666-4666-8666-000000000001',
    '11111111-1111-4111-8111-000000000001',
    3,
    time '11:00',
    time '23:00',
    false,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  ),
  (
    '66666666-6666-4666-8666-000000000002',
    '11111111-1111-4111-8111-000000000002',
    3,
    time '11:00',
    time '01:00',
    true,
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

insert into public.deal_schedule_windows (
  id,
  deal_id,
  day_of_week,
  start_time,
  end_time,
  ends_at_venue_close,
  created_at,
  updated_at
) values
  (
    '33333333-3333-4333-8333-000000000041',
    '22222222-2222-4222-8222-000000000016',
    3,
    time '22:00',
    null,
    true,
    timestamptz '2026-07-26 12:00:00+00',
    timestamptz '2026-07-26 12:00:00+00'
  );

-- ============================================================
-- CURATED REAL-WORLD DATA
-- Yard House - San Jose, Santana Row
-- ============================================================
-- Deal content and source URLs in this section are manually curated from the
-- official Yard House happy-hour page. Coordinates are included as curated
-- development data and should be manually confirmed against an authoritative
-- map/geocoding source before relying on them outside local development.
--
-- Important limitation: the current venue_hours schema requires open_time.
-- This task only has curated closing-time guidance for Yard House, not
-- authoritative opening times, so venue_hours rows are intentionally NOT
-- inserted here. As a result, the late-night happy hour remains pending and
-- unpublished for now.

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
) values (
  '77777777-7777-4777-8777-000000000001',
  'Yard House',
  'restaurant',
  '300 Santana Row',
  'Suite 101',
  'San Jose',
  'CA',
  '95128',
  'US',
  st_setsrid(st_makepoint(-121.94759, 37.32303), 4326)::geography,
  'America/Los_Angeles',
  'active',
  true,
  timestamptz '2026-07-26 12:00:00-07',
  timestamptz '2026-07-26 12:00:00-07'
);

insert into public.deals (
  id,
  venue_id,
  title,
  description,
  status,
  verification_status,
  last_verified_at,
  starts_on,
  ends_on,
  created_at,
  updated_at
) values
  (
    '88888888-8888-4888-8888-000000000001',
    '77777777-7777-4777-8777-000000000001',
    'Happy Hour',
    'Half off select appetizers and all pizzas. $2 off draft beer, wine, spirits and cocktails; $3 off 9 oz wine; $4 off half yards. Dine-in only.',
    'active',
    'verified',
    timestamptz '2026-07-26 12:00:00-07',
    null,
    null,
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07'
  ),
  (
    '88888888-8888-4888-8888-000000000002',
    '77777777-7777-4777-8777-000000000001',
    'Late Night Happy Hour',
    'Drink specials only: $2 off draft beer, wine, spirits and cocktails; $3 off 9 oz wine; $4 off half yards. Dine-in only.',
    'active',
    'pending',
    null,
    null,
    null,
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07'
  );

insert into public.deal_sources (
  id,
  deal_id,
  source_type,
  source_url,
  source_label,
  discovered_at,
  last_checked_at,
  created_at,
  updated_at
) values
  (
    '99999999-9999-4999-8999-000000000001',
    '88888888-8888-4888-8888-000000000001',
    'official_website',
    'https://www.yardhouse.com/happy-hour',
    'Yard House San Jose - Santana Row Happy Hour',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07'
  ),
  (
    '99999999-9999-4999-8999-000000000002',
    '88888888-8888-4888-8888-000000000002',
    'official_website',
    'https://www.yardhouse.com/happy-hour',
    'Yard House San Jose - Santana Row Late Night Happy Hour',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07'
  );

insert into public.deal_verifications (
  id,
  deal_id,
  source_id,
  verification_method,
  result,
  notes,
  verified_at,
  created_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
    '88888888-8888-4888-8888-000000000001',
    '99999999-9999-4999-8999-000000000001',
    'website',
    'confirmed',
    'Official Yard House San Jose - Santana Row happy-hour page manually checked.',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-000000000002',
    '88888888-8888-4888-8888-000000000002',
    '99999999-9999-4999-8999-000000000002',
    'website',
    'unable_to_verify',
    'Official late-night happy-hour details were manually checked, but venue closing hours still need first-party confirmation before publication.',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07'
  );

insert into public.deal_schedule_windows (
  id,
  deal_id,
  day_of_week,
  start_time,
  end_time,
  ends_at_venue_close,
  created_at,
  updated_at
) values
  ('cccccccc-cccc-4ccc-8ccc-000000000001', '88888888-8888-4888-8888-000000000001', 1, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000002', '88888888-8888-4888-8888-000000000001', 2, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000003', '88888888-8888-4888-8888-000000000001', 3, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000004', '88888888-8888-4888-8888-000000000001', 4, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000005', '88888888-8888-4888-8888-000000000001', 5, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000006', '88888888-8888-4888-8888-000000000002', 0, time '22:00', null, true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000007', '88888888-8888-4888-8888-000000000002', 1, time '22:00', null, true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000008', '88888888-8888-4888-8888-000000000002', 2, time '22:00', null, true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000009', '88888888-8888-4888-8888-000000000002', 3, time '22:00', null, true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07');

-- ============================================================
-- CURATED REAL-WORLD DATA
-- Lazy Dog Restaurant & Bar - San Jose
-- ============================================================
-- Official location, hours, and happy-hour schedule were manually checked from:
-- https://lazydogrestaurants.com/pages/san-jose-ca
-- Official menu items were manually checked from:
-- https://orders.lazydogrestaurants.com/menu/category/105326/happy-hour-late-night
--
-- Coordinates below are curated from third-party address listing data rather than
-- a first-party geocoded coordinate source, and should be manually confirmed
-- before relying on them outside local development.

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
) values (
  '77777777-7777-4777-8777-000000000002',
  'Lazy Dog Restaurant & Bar',
  'restaurant',
  '5305 Almaden Expy',
  null,
  'San Jose',
  'CA',
  '95118',
  'US',
  st_setsrid(st_makepoint(-121.876312, 37.253569), 4326)::geography,
  'America/Los_Angeles',
  'active',
  true,
  timestamptz '2026-07-26 12:00:00-07',
  timestamptz '2026-07-26 12:00:00-07'
);

insert into public.venue_hours (
  id,
  venue_id,
  day_of_week,
  open_time,
  close_time,
  closes_next_day,
  created_at,
  updated_at
) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000101', '77777777-7777-4777-8777-000000000002', 0, time '10:00', time '00:00', true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000102', '77777777-7777-4777-8777-000000000002', 1, time '11:00', time '00:00', true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000103', '77777777-7777-4777-8777-000000000002', 2, time '11:00', time '00:00', true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000104', '77777777-7777-4777-8777-000000000002', 3, time '11:00', time '00:00', true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000105', '77777777-7777-4777-8777-000000000002', 4, time '11:00', time '00:00', true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000106', '77777777-7777-4777-8777-000000000002', 5, time '11:00', time '00:00', true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-000000000107', '77777777-7777-4777-8777-000000000002', 6, time '10:00', time '00:00', true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07');

insert into public.deals (
  id,
  venue_id,
  title,
  description,
  status,
  verification_status,
  last_verified_at,
  starts_on,
  ends_on,
  created_at,
  updated_at
) values (
  '88888888-8888-4888-8888-000000000003',
  '77777777-7777-4777-8777-000000000002',
  'Happy Hour + Late Night',
  'Eats + sips starting at $3. Happy Hour and late-night food and drink specials.',
  'active',
  'verified',
  timestamptz '2026-07-26 12:00:00-07',
  null,
  null,
  timestamptz '2026-07-26 12:00:00-07',
  timestamptz '2026-07-26 12:00:00-07'
);

insert into public.deal_schedule_windows (
  id,
  deal_id,
  day_of_week,
  start_time,
  end_time,
  ends_at_venue_close,
  created_at,
  updated_at
) values
  ('cccccccc-cccc-4ccc-8ccc-000000000101', '88888888-8888-4888-8888-000000000003', 1, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000102', '88888888-8888-4888-8888-000000000003', 2, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000103', '88888888-8888-4888-8888-000000000003', 3, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000104', '88888888-8888-4888-8888-000000000003', 4, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000105', '88888888-8888-4888-8888-000000000003', 5, time '15:00', time '18:00', false, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000106', '88888888-8888-4888-8888-000000000003', 0, time '21:00', null, true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000107', '88888888-8888-4888-8888-000000000003', 1, time '21:00', null, true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000108', '88888888-8888-4888-8888-000000000003', 2, time '21:00', null, true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000109', '88888888-8888-4888-8888-000000000003', 3, time '21:00', null, true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('cccccccc-cccc-4ccc-8ccc-000000000110', '88888888-8888-4888-8888-000000000003', 4, time '21:00', null, true, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07');

insert into public.deal_items (
  id,
  deal_id,
  name,
  category,
  description,
  deal_price,
  regular_price,
  discount_text,
  sort_order,
  created_at,
  updated_at
) values
  ('dddddddd-dddd-4ddd-8ddd-000000000001', '88888888-8888-4888-8888-000000000003', 'Korean Fried Chicken Bao Buns', 'food', 'Gochugaru pepper glaze, kimchi aioli, pickled cucumbers', null, null, null, 1, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000002', '88888888-8888-4888-8888-000000000003', 'Chili Garlic Cucumbers', 'food', 'Chilled English cucumbers marinated in spicy chili garlic crunch, rice wine vinegar, bell peppers, sesame seeds', null, null, null, 2, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000003', '88888888-8888-4888-8888-000000000003', 'Brussels Sprouts', 'food', 'Lemon, garlic, butter, capers, crispy croutons, romano cheese', null, null, null, 3, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000004', '88888888-8888-4888-8888-000000000003', 'Tangy BBQ Chips', 'food', 'House chips tossed in a zesty cajun-bbq seasoning', null, null, null, 4, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000005', '88888888-8888-4888-8888-000000000003', 'Cheese + Garlic House Bread', 'food', 'Housemade blend of cheesy, garlicky goodness served toasted + warm', null, null, null, 5, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000006', '88888888-8888-4888-8888-000000000003', 'Tikka Masala Meatballs', 'food', 'Chicken meatballs topped with a spiced tomato curry sauce, cooling cucumber drizzle + micro cilantro', null, null, null, 6, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000007', '88888888-8888-4888-8888-000000000003', 'Hot Honey Feta Dip', 'food', 'Served with grilled herb french bread for dipping', null, null, null, 7, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000008', '88888888-8888-4888-8888-000000000003', 'Roasted Red Pepper Hummus', 'food', 'Served with veggies + garlic parmesan crisps', null, null, null, 8, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000009', '88888888-8888-4888-8888-000000000003', 'Inside Out Quesadilla', 'food', 'A crispy cheese crusted quesadilla stuffed with melted cheddar and jack cheeses, served with guacamole, sour cream + housemade salsa', null, null, null, 9, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000010', '88888888-8888-4888-8888-000000000003', 'Lemon Pepper Tots', 'food', 'Housemade buttermilk ranch for dipping', null, null, null, 10, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000011', '88888888-8888-4888-8888-000000000003', 'Cajun Fries', 'food', 'Crispy french fries, cajun + chile-lime seasonings, chipotle ranch dipping sauce', null, null, null, 11, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000012', '88888888-8888-4888-8888-000000000003', 'Onion Rings', 'food', 'With bark + bite sauce on the side', null, null, null, 12, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000013', '88888888-8888-4888-8888-000000000003', 'Bacon Candy', 'food', 'Bacon baked with brown sugar, crushed red pepper chili flakes, black pepper', null, null, null, 13, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000014', '88888888-8888-4888-8888-000000000003', 'Crispy Deviled Eggs', 'food', 'Lightly fried, topped with smoked paprika + bacon candy', null, null, null, 14, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000015', '88888888-8888-4888-8888-000000000003', 'Buffalo Wings', 'food', null, null, null, null, 15, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000016', '88888888-8888-4888-8888-000000000003', 'Togarashi Edamame Beans', 'food', 'Sea salt, chili flakes, orange peel, garlic, ginger, black pepper', null, null, null, 16, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000017', '88888888-8888-4888-8888-000000000003', 'Chicken Lettuce Wraps', 'food', 'Chicken breast, water chestnuts, peanuts, carrots, sesame soy sauce, pickled cucumbers, romaine spears', null, null, null, 17, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000018', '88888888-8888-4888-8888-000000000003', 'Watermelon Margarita', 'cocktail', 'Lunazul tequila, fresh watermelon, triple sec, tajin chamoy rim', null, null, null, 18, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000019', '88888888-8888-4888-8888-000000000003', 'Watermelon Margarita Pitcher', 'cocktail', null, null, null, null, 19, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000020', '88888888-8888-4888-8888-000000000003', 'Ankle Buster Blonde', 'beer', null, null, null, null, 20, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000021', '88888888-8888-4888-8888-000000000003', 'Huckleberry Haze IPA', 'beer', null, null, null, null, 21, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000022', '88888888-8888-4888-8888-000000000003', 'Sunspanked Red', 'other', null, null, null, null, 22, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000023', '88888888-8888-4888-8888-000000000003', 'Liquid Blanket', 'other', null, null, null, null, 23, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000024', '88888888-8888-4888-8888-000000000003', 'Whoa Nellie', 'other', null, null, null, null, 24, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000025', '88888888-8888-4888-8888-000000000003', 'Bonita Bonita', 'other', null, null, null, null, 25, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000026', '88888888-8888-4888-8888-000000000003', 'Old Pal White Ale', 'beer', null, null, null, null, 26, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000027', '88888888-8888-4888-8888-000000000003', 'Lightning Jack Lager', 'beer', null, null, null, null, 27, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000028', '88888888-8888-4888-8888-000000000003', 'Bud Light', 'beer', null, null, null, null, 28, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000029', '88888888-8888-4888-8888-000000000003', 'Coors Light', 'beer', null, null, null, null, 29, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000030', '88888888-8888-4888-8888-000000000003', 'Blue Hawaiian', 'cocktail', null, null, null, null, 30, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000031', '88888888-8888-4888-8888-000000000003', 'Lunazul Reposado Margarita', 'cocktail', null, null, null, null, 31, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000032', '88888888-8888-4888-8888-000000000003', 'Sailor Jerry Rum + Coke', 'cocktail', null, null, null, null, 32, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000033', '88888888-8888-4888-8888-000000000003', 'Cucumber + Mint Martini', 'cocktail', null, null, null, null, 33, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000034', '88888888-8888-4888-8888-000000000003', 'Cowboy Up', 'cocktail', null, null, null, null, 34, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000035', '88888888-8888-4888-8888-000000000003', 'Pomegranate Red Sangria', 'wine', null, null, null, null, 35, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000036', '88888888-8888-4888-8888-000000000003', 'Pomegranate Red Sangria Pitcher', 'wine', null, null, null, null, 36, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000037', '88888888-8888-4888-8888-000000000003', 'White Peach Sangria', 'wine', null, null, null, null, 37, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000038', '88888888-8888-4888-8888-000000000003', 'White Peach Sangria Pitcher', 'wine', null, null, null, null, 38, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000039', '88888888-8888-4888-8888-000000000003', 'Raspberry Rose Sangria', 'wine', null, null, null, null, 39, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000040', '88888888-8888-4888-8888-000000000003', 'Raspberry Rose Sangria Pitcher', 'wine', null, null, null, null, 40, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000041', '88888888-8888-4888-8888-000000000003', 'Flat Rock - Chardonnay - California 6 oz', 'wine', null, null, null, null, 41, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000042', '88888888-8888-4888-8888-000000000003', 'Flat Rock - Merlot - California 6 oz', 'wine', null, null, null, null, 42, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07'),
  ('dddddddd-dddd-4ddd-8ddd-000000000043', '88888888-8888-4888-8888-000000000003', 'Dark Horse Cabernet Sauvignon 6 oz', 'wine', null, null, null, null, 43, timestamptz '2026-07-26 12:00:00-07', timestamptz '2026-07-26 12:00:00-07');

insert into public.deal_sources (
  id,
  deal_id,
  source_type,
  source_url,
  source_label,
  discovered_at,
  last_checked_at,
  created_at,
  updated_at
) values
  (
    '99999999-9999-4999-8999-000000000003',
    '88888888-8888-4888-8888-000000000003',
    'official_website',
    'https://lazydogrestaurants.com/pages/san-jose-ca',
    'Lazy Dog San Jose Location + Happy Hour',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07'
  ),
  (
    '99999999-9999-4999-8999-000000000004',
    '88888888-8888-4888-8888-000000000003',
    'official_website',
    'https://orders.lazydogrestaurants.com/menu/category/105326/happy-hour-late-night',
    'Lazy Dog Happy Hour + Late Night Menu',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07',
    timestamptz '2026-07-26 12:00:00-07'
  );

insert into public.deal_verifications (
  id,
  deal_id,
  source_id,
  verification_method,
  result,
  notes,
  verified_at,
  created_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000003',
  '88888888-8888-4888-8888-000000000003',
  '99999999-9999-4999-8999-000000000003',
  'website',
  'confirmed',
  'Official Lazy Dog San Jose location page and official Happy Hour + Late Night menu were manually checked.',
  timestamptz '2026-07-26 12:00:00-07',
  timestamptz '2026-07-26 12:00:00-07'
);

-- ============================================================
-- FAKE CANDIDATE STAGING FIXTURE
-- Internal discovery queue testing only
-- ============================================================
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
  review_notes,
  reviewed_at,
  created_at,
  updated_at
) values (
  'eeeeeeee-eeee-4eee-8eee-000000000001',
  null,
  'https://example.com/fake-social-post',
  'instagram',
  'Fake development social post',
  'fake-post-001',
  'Taco Tuesday',
  '$2 tacos during a Tuesday happy-hour window.',
  'Taco Tuesday! $2 tacos every Tuesday from 4-7 PM.',
  timestamptz '2026-07-26 12:00:00+00',
  null,
  timestamptz '2026-07-26 12:00:00+00',
  'pending',
  0.8200,
  null,
  null,
  timestamptz '2026-07-26 12:00:00+00',
  timestamptz '2026-07-26 12:00:00+00'
);

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
) values (
  'ffffffff-ffff-4fff-8fff-000000000001',
  'eeeeeeee-eeee-4eee-8eee-000000000001',
  2,
  time '16:00',
  time '19:00',
  false,
  'every Tuesday from 4-7 PM',
  0.9500,
  timestamptz '2026-07-26 12:00:00+00'
);

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
) values (
  'abababab-abab-4bab-8bab-000000000001',
  'eeeeeeee-eeee-4eee-8eee-000000000001',
  'Taco',
  'food',
  null,
  2.00,
  null,
  null,
  '$2 tacos',
  0,
  0.9000,
  timestamptz '2026-07-26 12:00:00+00'
);

commit;
