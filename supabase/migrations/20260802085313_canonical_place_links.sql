-- External Google records can point to a verified canonical location. The
-- relationship is set only by the admin through the existing places policy.
alter table public.places
  add column if not exists canonical_place_id uuid references public.places(id) on delete set null;

create index if not exists places_canonical_place_id_idx
  on public.places(canonical_place_id)
  where canonical_place_id is not null;

alter table public.places
  add constraint external_place_canonical_target_check
  check (canonical_place_id is null or is_external = true);
