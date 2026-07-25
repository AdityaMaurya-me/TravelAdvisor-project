-- Private staging queue for locations found through OpenStreetMap, field
-- research, or other verified sources. Candidates are never shown publicly
-- until a separate publish action creates a canonical `places` record.
create table public.location_candidates (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  destination_id uuid references public.places(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 180),
  source text not null default 'manual' check (source in ('manual', 'openstreetmap', 'wikidata', 'field_research')),
  source_url text,
  source_reference text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  proposed_categories text[] not null default '{}',
  description text,
  image_url text,
  image_attribution text,
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'rejected', 'published')),
  review_notes text,
  published_place_id uuid references public.places(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index location_candidates_owner_status_idx on public.location_candidates (created_by, status, created_at desc);
create index location_candidates_destination_idx on public.location_candidates (destination_id);

alter table public.location_candidates enable row level security;
grant select, insert, update, delete on public.location_candidates to authenticated;

create policy "Curators view their own location candidates"
  on public.location_candidates for select
  to authenticated
  using ((select auth.uid()) = created_by);
create policy "Curators create their own location candidates"
  on public.location_candidates for insert
  to authenticated
  with check ((select auth.uid()) = created_by);
create policy "Curators update their own location candidates"
  on public.location_candidates for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);
create policy "Curators delete their own location candidates"
  on public.location_candidates for delete
  to authenticated
  using ((select auth.uid()) = created_by);
