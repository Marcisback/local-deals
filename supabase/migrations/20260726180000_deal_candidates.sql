create table public.deal_candidates (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete set null,
  source_url text not null,
  source_type text not null,
  source_label text,
  source_external_id text,
  title text,
  description text,
  raw_text text,
  discovered_at timestamptz not null default now(),
  source_published_at timestamptz,
  source_last_checked_at timestamptz,
  review_status text not null default 'pending',
  confidence numeric(5,4),
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_candidates_source_type_check check (
    source_type in ('official_website', 'instagram', 'facebook', 'business_submission', 'user_submission', 'manual', 'other')
  ),
  constraint deal_candidates_review_status_check check (
    review_status in ('pending', 'approved', 'rejected', 'needs_review')
  ),
  constraint deal_candidates_confidence_range_check check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

comment on table public.deal_candidates is 'Internal staging records for discovered deal information. Candidates are not production deals and are never published automatically.';
comment on column public.deal_candidates.confidence is 'Optional automated confidence score from 0 to 1. Human review remains authoritative.';
comment on column public.deal_candidates.raw_text is 'Relevant captured source evidence such as extracted website text, social captions, or manual notes. Not intended for full arbitrary HTML dumps.';
comment on column public.deal_candidates.review_status is 'Workflow state only. Approved does not automatically create or modify public.deals.';

create table public.deal_candidate_schedule_windows (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.deal_candidates(id) on delete cascade,
  day_of_week smallint not null,
  start_time time,
  end_time time,
  ends_at_venue_close boolean not null default false,
  raw_schedule_text text,
  confidence numeric(5,4),
  created_at timestamptz not null default now(),
  constraint deal_candidate_schedule_windows_day_of_week_check check (day_of_week between 0 and 6),
  constraint deal_candidate_schedule_windows_confidence_range_check check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

comment on table public.deal_candidate_schedule_windows is 'Staging schedule evidence for deal candidates. Structured times may be incomplete while raw_schedule_text preserves extracted source language.';

create table public.deal_candidate_items (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.deal_candidates(id) on delete cascade,
  name text,
  category text,
  description text,
  deal_price numeric(10,2),
  regular_price numeric(10,2),
  discount_text text,
  raw_item_text text,
  sort_order integer not null default 0,
  confidence numeric(5,4),
  created_at timestamptz not null default now(),
  constraint deal_candidate_items_deal_price_nonnegative_check check (deal_price is null or deal_price >= 0),
  constraint deal_candidate_items_regular_price_nonnegative_check check (regular_price is null or regular_price >= 0),
  constraint deal_candidate_items_sort_order_nonnegative_check check (sort_order >= 0),
  constraint deal_candidate_items_confidence_range_check check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

comment on table public.deal_candidate_items is 'Staging itemized offers for deal candidates. Candidate rows may be incomplete or ambiguous and do not imply publication.';

create index deal_candidates_review_status_discovered_at_idx on public.deal_candidates (review_status, discovered_at);
create index deal_candidates_venue_id_idx on public.deal_candidates (venue_id);
create unique index deal_candidates_source_type_external_id_uidx
  on public.deal_candidates (source_type, source_external_id)
  where source_external_id is not null;
create index deal_candidate_schedule_windows_candidate_id_idx on public.deal_candidate_schedule_windows (candidate_id);
create index deal_candidate_items_candidate_id_sort_order_idx on public.deal_candidate_items (candidate_id, sort_order);

create trigger set_deal_candidates_updated_at
before update on public.deal_candidates
for each row
execute function public.set_updated_at();

alter table public.deal_candidates enable row level security;
alter table public.deal_candidate_schedule_windows enable row level security;
alter table public.deal_candidate_items enable row level security;
