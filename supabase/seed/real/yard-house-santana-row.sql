-- Curated real-world development data for Yard House - San Jose - Santana Row.
-- Deal content and source URLs in this file are manually curated from the official
-- Yard House happy-hour page. Coordinates are included as curated development data
-- and should be manually confirmed against an authoritative map/geocoding source
-- before relying on them outside local development.
--
-- Important limitation: the current venue_hours schema requires open_time. This
-- task only has curated closing-time guidance for Yard House, not authoritative
-- opening times, so venue_hours rows are intentionally NOT inserted here. As a
-- result, the late-night happy hour remains pending and unpublished for now.

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
  -- Coordinates are curated from a third-party business listing and require later
  -- confirmation against a first-party or map-authoritative source before relying
  -- on them outside local development.
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
