create table public.source_targets (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete set null,
  source_type text not null,
  canonical_url text not null,
  source_external_id text,
  label text,
  enabled boolean not null default true,
  next_collect_at timestamptz,
  last_attempted_at timestamptz,
  last_succeeded_at timestamptz,
  last_run_status text,
  last_outcome_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_targets_source_type_check
    check (source_type in ('official_website', 'instagram')),
  constraint source_targets_last_run_status_check
    check (last_run_status is null or last_run_status in ('running', 'succeeded', 'duplicate', 'failed')),
  constraint source_targets_canonical_url_nonblank_check
    check (length(trim(canonical_url)) > 0)
);

create unique index source_targets_source_type_canonical_url_uidx
  on public.source_targets (source_type, canonical_url);
create index source_targets_enabled_next_collect_at_idx
  on public.source_targets (enabled, next_collect_at)
  where enabled = true;
create index source_targets_venue_id_idx on public.source_targets (venue_id);

comment on table public.source_targets is 'Durable internal catalog of collection targets. Targets never publish deals directly.';
comment on column public.source_targets.next_collect_at is 'Optional scheduler-ready timestamp; no scheduler consumes it yet.';
comment on column public.source_targets.last_outcome_code is 'Sanitized machine-readable outcome from the latest collection attempt.';

create table public.source_collection_runs (
  id uuid primary key default gen_random_uuid(),
  source_target_id uuid not null references public.source_targets(id) on delete cascade,
  status text not null default 'running',
  outcome_code text,
  outcome_message text,
  candidate_id uuid references public.deal_candidates(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint source_collection_runs_status_check
    check (status in ('running', 'succeeded', 'duplicate', 'failed')),
  constraint source_collection_runs_completion_check check (
    (status = 'running' and finished_at is null and outcome_code is null)
    or
    (status <> 'running' and finished_at is not null and outcome_code is not null)
  )
);

create index source_collection_runs_target_started_at_idx
  on public.source_collection_runs (source_target_id, started_at desc);
create index source_collection_runs_candidate_id_idx
  on public.source_collection_runs (candidate_id)
  where candidate_id is not null;

comment on table public.source_collection_runs is 'Auditable internal record of each source collection attempt and its sanitized outcome.';
comment on column public.source_collection_runs.outcome_message is 'Controlled operator-facing message; never store provider response bodies, credentials, or secrets.';

create trigger set_source_targets_updated_at
before update on public.source_targets
for each row
execute function public.set_updated_at();

alter table public.source_targets enable row level security;
alter table public.source_collection_runs enable row level security;
