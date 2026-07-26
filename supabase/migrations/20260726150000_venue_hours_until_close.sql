create table public.venue_hours (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  day_of_week smallint not null,
  open_time time not null,
  close_time time not null,
  closes_next_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_hours_day_of_week_check check (day_of_week between 0 and 6),
  constraint venue_hours_time_window_check check (
    (closes_next_day = false and close_time > open_time)
    or
    (closes_next_day = true and close_time < open_time)
  )
);

comment on table public.venue_hours is 'Recurring weekly operating hours where day_of_week uses 0 = Sunday through 6 = Saturday. Multiple rows per venue/day are allowed for split hours.';
comment on column public.venue_hours.closes_next_day is 'True when a venue closes after midnight on the following calendar day for the given source day.';

create index venue_hours_venue_id_day_of_week_idx on public.venue_hours (venue_id, day_of_week);

create trigger set_venue_hours_updated_at
before update on public.venue_hours
for each row
execute function public.set_updated_at();

alter table public.venue_hours enable row level security;

alter table public.deal_schedule_windows
add column ends_at_venue_close boolean not null default false;

alter table public.deal_schedule_windows
alter column end_time drop not null;

alter table public.deal_schedule_windows
drop constraint deal_schedule_windows_time_order_check;

alter table public.deal_schedule_windows
add constraint deal_schedule_windows_end_time_shape_check
check (
  (ends_at_venue_close = false and end_time is not null)
  or
  (ends_at_venue_close = true and end_time is null)
);

alter table public.deal_schedule_windows
add constraint deal_schedule_windows_fixed_time_order_check
check (
  ends_at_venue_close = true
  or end_time > start_time
);

comment on column public.deal_schedule_windows.ends_at_venue_close is 'True when the deal window ends at the venue closing time instead of a fixed end_time.';
comment on column public.deal_schedule_windows.end_time is 'Nullable only for until-close windows where ends_at_venue_close = true.';
