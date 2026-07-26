create extension if not exists pgcrypto;
create extension if not exists postgis;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue_type text not null,
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country_code text not null default 'US',
  location geography(Point, 4326) not null,
  timezone text not null,
  status text not null default 'active',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_status_check check (status in ('active', 'inactive')),
  constraint venues_venue_type_check check (venue_type in ('restaurant', 'bar', 'brewery', 'cafe', 'other')),
  constraint venues_country_code_check check (char_length(country_code) = 2),
  constraint venues_location_is_point_check check (st_geometrytype(location::geometry) = 'ST_Point')
);

comment on column public.venues.location is 'Geography point stored as longitude, latitude in SRID 4326 for radius queries.';

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active',
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_status_check check (status in ('active', 'inactive')),
  constraint deals_date_order_check check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

create table public.deal_schedule_windows (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_schedule_windows_day_of_week_check check (day_of_week between 0 and 6),
  constraint deal_schedule_windows_time_order_check check (end_time > start_time)
);

comment on column public.deal_schedule_windows.day_of_week is 'Recurring weekly schedule where 0 = Sunday and 6 = Saturday.';
comment on table public.deal_schedule_windows is 'Cross-midnight schedules are represented as two rows instead of allowing end_time <= start_time.';

create index venues_location_gix on public.venues using gist (location);
create index deals_venue_id_idx on public.deals (venue_id);
create index deal_schedule_windows_deal_id_idx on public.deal_schedule_windows (deal_id);
create index deals_status_idx on public.deals (status);

create trigger set_venues_updated_at
before update on public.venues
for each row
execute function public.set_updated_at();

create trigger set_deals_updated_at
before update on public.deals
for each row
execute function public.set_updated_at();

create trigger set_deal_schedule_windows_updated_at
before update on public.deal_schedule_windows
for each row
execute function public.set_updated_at();

alter table public.venues enable row level security;
alter table public.deals enable row level security;
alter table public.deal_schedule_windows enable row level security;
