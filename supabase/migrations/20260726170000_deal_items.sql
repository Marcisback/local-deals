create table public.deal_items (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  name text not null,
  category text,
  description text,
  deal_price numeric(10,2),
  regular_price numeric(10,2),
  discount_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_items_name_not_blank_check check (btrim(name) <> ''),
  constraint deal_items_deal_price_nonnegative_check check (deal_price is null or deal_price >= 0),
  constraint deal_items_regular_price_nonnegative_check check (regular_price is null or regular_price >= 0),
  constraint deal_items_sort_order_nonnegative_check check (sort_order >= 0)
);

comment on table public.deal_items is 'Zero-or-many itemized offers attached to a deal. Items are optional and existing deals do not require them.';
comment on column public.deal_items.category is 'Flexible V1 category label for normalized values such as food, cocktail, beer, wine, or other.';
comment on column public.deal_items.deal_price is 'Promotional/current deal price when a reliable item price is known.';
comment on column public.deal_items.regular_price is 'Ordinary/reference item price when known.';
comment on column public.deal_items.discount_text is 'Source-described discount language such as $2 off or Half off. Null pricing does not invalidate an item.';
comment on column public.deal_items.sort_order is 'Non-unique source/display ordering within a deal.';

create index deal_items_deal_id_sort_order_idx on public.deal_items (deal_id, sort_order);

create trigger set_deal_items_updated_at
before update on public.deal_items
for each row
execute function public.set_updated_at();

alter table public.deal_items enable row level security;
