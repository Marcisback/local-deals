alter table public.deals
add column verification_status text;

alter table public.deals
add column last_verified_at timestamptz;

update public.deals
set
  verification_status = 'verified',
  last_verified_at = coalesce(last_verified_at, now())
where verification_status is null;

alter table public.deals
alter column verification_status set default 'pending';

alter table public.deals
alter column verification_status set not null;

alter table public.deals
add constraint deals_verification_status_check
check (verification_status in ('pending', 'verified', 'rejected', 'stale'));

comment on column public.deals.verification_status is 'Publication safety state separate from operational deal status. Only verified deals should be published to consumers.';
comment on column public.deals.last_verified_at is 'Timestamp of the latest successful verification applied to the deal record.';

create index deals_verification_status_idx on public.deals (verification_status);

create table public.deal_sources (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  source_type text not null,
  source_url text,
  source_label text,
  discovered_at timestamptz not null default now(),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_sources_source_type_check
    check (source_type in ('official_website', 'phone', 'business_submission', 'user_submission', 'manual', 'seed'))
);

create table public.deal_verifications (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  source_id uuid references public.deal_sources(id) on delete set null,
  verification_method text not null,
  result text not null,
  notes text,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint deal_verifications_verification_method_check
    check (verification_method in ('website', 'phone', 'business', 'manual')),
  constraint deal_verifications_result_check
    check (result in ('confirmed', 'rejected', 'unable_to_verify'))
);

create index deal_sources_deal_id_idx on public.deal_sources (deal_id);
create index deal_verifications_deal_id_idx on public.deal_verifications (deal_id);
create index deal_verifications_source_id_idx on public.deal_verifications (source_id);

create trigger set_deal_sources_updated_at
before update on public.deal_sources
for each row
execute function public.set_updated_at();

alter table public.deal_sources enable row level security;
alter table public.deal_verifications enable row level security;
