alter table public.places
  add column opening_hours text,
  add column entry_fee text,
  add column website_url text,
  add column phone text,
  add column source_url text,
  add column source_reference text,
  add column last_verified_at timestamptz;

alter table public.location_candidates
  add column opening_hours text,
  add column entry_fee text,
  add column website_url text,
  add column phone text,
  add column is_pet_friendly boolean,
  add column has_parking boolean,
  add column has_washroom boolean;

create index places_last_verified_idx on public.places (last_verified_at desc nulls last);

create or replace function public.publish_location_candidate(
  p_candidate_id uuid,
  p_slug text,
  p_level public.place_level default 'attraction'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate public.location_candidates%rowtype;
  destination public.places%rowtype;
  new_place_id uuid;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.curator_roles
    where user_id = (select auth.uid()) and role in ('reviewer', 'admin')
  ) then raise exception 'Only assigned curators can publish locations'; end if;
  select * into candidate from public.location_candidates
  where id = p_candidate_id and status in ('draft', 'review', 'approved', 'rejected');
  if not found then raise exception 'Candidate is unavailable for publishing'; end if;
  if candidate.latitude is null or candidate.longitude is null
    or coalesce(nullif(trim(candidate.description), ''), '') = ''
    or cardinality(candidate.proposed_categories) = 0
    or (coalesce(nullif(trim(candidate.source_url), ''), '') = '' and coalesce(nullif(trim(candidate.source_reference), ''), '') = '') then
    raise exception 'A source, coordinates, description, and category are required before publishing';
  end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Slug must use lowercase letters, numbers, and hyphens only'; end if;
  if exists (select 1 from public.places where slug = p_slug) then raise exception 'A place with this slug already exists'; end if;
  select * into destination from public.places where id = candidate.destination_id;
  insert into public.places (slug, name, level, parent_id, city, state, country, location, description, cover_image, opening_hours, entry_fee, website_url, phone, source_url, source_reference, last_verified_at, is_pet_friendly, has_parking, has_washroom, is_published)
  values (p_slug, candidate.name, p_level, candidate.destination_id, case when found then destination.name else null end, case when found then destination.state else null end, coalesce(case when found then destination.country else null end, 'India'), public.st_setsrid(public.st_makepoint(candidate.longitude, candidate.latitude), 4326)::public.geography, candidate.description, candidate.image_url, candidate.opening_hours, candidate.entry_fee, candidate.website_url, candidate.phone, candidate.source_url, candidate.source_reference, now(), candidate.is_pet_friendly, candidate.has_parking, candidate.has_washroom, true)
  returning id into new_place_id;
  insert into public.place_categories (place_id, category_id)
  select new_place_id, id from public.categories where slug = any(candidate.proposed_categories) on conflict do nothing;
  if not exists (select 1 from public.place_categories where place_id = new_place_id) then raise exception 'None of the candidate categories exist in the catalogue'; end if;
  update public.location_candidates set status = 'published', published_place_id = new_place_id, review_notes = coalesce(review_notes, 'Published by an assigned curator.'), updated_at = now() where id = candidate.id;
  return new_place_id;
end;
$$;

revoke all on function public.publish_location_candidate(uuid, text, public.place_level) from public, anon;
grant execute on function public.publish_location_candidate(uuid, text, public.place_level) to authenticated;
