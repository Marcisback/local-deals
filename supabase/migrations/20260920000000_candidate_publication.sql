alter table public.deal_candidates
add column published_deal_id uuid unique references public.deals(id) on delete restrict;

alter table public.deal_candidates
add column published_at timestamptz;

alter table public.deal_candidates
add constraint deal_candidates_publication_shape_check
check (
  (published_deal_id is null and published_at is null)
  or
  (published_deal_id is not null and published_at is not null)
);

comment on column public.deal_candidates.published_deal_id is 'Production deal created by an explicit publication action. Null until publication succeeds.';
comment on column public.deal_candidates.published_at is 'Timestamp when explicit candidate publication completed successfully.';

alter table public.deal_sources
drop constraint deal_sources_source_type_check;

alter table public.deal_sources
add constraint deal_sources_source_type_check
check (
  source_type in (
    'official_website',
    'instagram',
    'facebook',
    'phone',
    'business_submission',
    'user_submission',
    'manual',
    'other',
    'seed'
  )
);
