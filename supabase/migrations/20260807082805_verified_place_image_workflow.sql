-- Keep user-uploaded imagery separate from factual approval. A photograph is
-- never used as a public cover merely because it was uploaded with a request.
alter table public.location_candidates
  add column if not exists canonical_google_place_id text,
  add column if not exists canonical_google_name text,
  add column if not exists canonical_google_address text,
  add column if not exists image_verification_status text not null default 'not_provided'
    check (image_verification_status in ('not_provided', 'pending', 'approved', 'rejected')),
  add column if not exists image_verification_notes text,
  add column if not exists image_verified_at timestamptz,
  add column if not exists image_verified_by uuid references auth.users(id) on delete set null;

create index if not exists location_candidates_google_place_idx
  on public.location_candidates (canonical_google_place_id)
  where canonical_google_place_id is not null;

-- Existing uploads must be reviewed too; they are not grandfathered into
-- public presentation just because they predate this workflow.
update public.location_candidates
set image_verification_status = case when image_url is null then 'not_provided' else 'pending' end
where image_verification_status = 'not_provided';

create or replace function public.protect_location_candidate_image_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  can_review boolean;
begin
  select exists (
    select 1 from public.curator_roles
    where user_id = (select auth.uid()) and role in ('reviewer', 'admin')
  ) into can_review;

  if tg_op = 'INSERT' then
    new.image_verification_status := case when nullif(trim(coalesce(new.image_url, '')), '') is null then 'not_provided' else 'pending' end;
    new.image_verification_notes := null;
    new.image_verified_at := null;
    new.image_verified_by := null;
  elsif not can_review then
    if new.image_url is distinct from old.image_url then
      new.image_verification_status := case when nullif(trim(coalesce(new.image_url, '')), '') is null then 'not_provided' else 'pending' end;
      new.image_verification_notes := null;
      new.image_verified_at := null;
      new.image_verified_by := null;
    else
      new.image_verification_status := old.image_verification_status;
      new.image_verification_notes := old.image_verification_notes;
      new.image_verified_at := old.image_verified_at;
      new.image_verified_by := old.image_verified_by;
    end if;
  elsif new.image_verification_status in ('approved', 'rejected') then
    new.image_verified_at := now();
    new.image_verified_by := (select auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists protect_location_candidate_image_verification on public.location_candidates;
create trigger protect_location_candidate_image_verification
before insert or update on public.location_candidates
for each row execute function public.protect_location_candidate_image_verification();

-- Publishing a location remains a curator action. An uploaded photo may only
-- become its cover after a reviewer has explicitly approved it.
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
  ) then
    raise exception 'Only assigned curators can publish locations';
  end if;

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
  if candidate.canonical_google_place_id is not null and exists (
    select 1 from public.places where google_place_id = candidate.canonical_google_place_id
  ) then
    raise exception 'This Google Maps place is already linked to a published location';
  end if;

  select * into destination from public.places where id = candidate.destination_id;
  insert into public.places (
    slug, name, level, parent_id, city, state, country, location, description,
    cover_image, opening_hours, entry_fee, website_url, phone, source_url,
    source_reference, last_verified_at, is_pet_friendly, has_parking,
    has_washroom, has_ev_charging, typical_visit_minutes, google_place_id, is_published
  ) values (
    p_slug, candidate.name, p_level, candidate.destination_id,
    case when found then destination.name else null end,
    case when found then destination.state else null end,
    coalesce(case when found then destination.country else null end, 'India'),
    public.st_setsrid(public.st_makepoint(candidate.longitude, candidate.latitude), 4326)::public.geography,
    candidate.description,
    case when candidate.image_verification_status = 'approved' then candidate.image_url else null end,
    candidate.opening_hours, candidate.entry_fee, candidate.website_url, candidate.phone,
    candidate.source_url, candidate.source_reference, now(),
    candidate.is_pet_friendly, candidate.has_parking, candidate.has_washroom,
    candidate.has_ev_charging, candidate.typical_visit_minutes,
    candidate.canonical_google_place_id, true
  ) returning id into new_place_id;

  insert into public.place_categories (place_id, category_id)
  select new_place_id, id from public.categories
  where slug = any(candidate.proposed_categories)
  on conflict do nothing;
  if not exists (select 1 from public.place_categories where place_id = new_place_id) then
    raise exception 'None of the candidate categories exist in the catalogue';
  end if;

  update public.location_candidates
  set status = 'published', published_place_id = new_place_id,
      review_notes = coalesce(review_notes, 'Published by an assigned curator.'),
      updated_at = now()
  where id = candidate.id;
  return new_place_id;
end;
$$;

revoke all on function public.publish_location_candidate(uuid, text, public.place_level) from public, anon;
grant execute on function public.publish_location_candidate(uuid, text, public.place_level) to authenticated;
