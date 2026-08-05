-- Keep a small, refreshable snapshot of Google Place Details for places that
-- are discovered through search. External rows remain unlisted and unverified;
-- curated records are still the only entries shown in destination/category UI.
alter table public.places
  add column if not exists external_details jsonb not null default '{}'::jsonb;

create or replace function public.upsert_external_google_place_details(
  p_google_place_id text,
  p_name text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_rating numeric,
  p_review_count integer,
  p_photo_url text,
  p_details jsonb
)
returns table (id uuid, slug text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  saved_place public.places%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;
  if p_google_place_id !~ '^[A-Za-z0-9_-]{8,200}$' then
    raise exception 'Invalid Google place identifier';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 200 then
    raise exception 'Invalid place name';
  end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Invalid place coordinates';
  end if;
  if p_rating is not null and p_rating not between 0 and 5 then
    raise exception 'Invalid rating';
  end if;
  if p_review_count is not null and p_review_count < 0 then
    raise exception 'Invalid review count';
  end if;

  insert into public.places (
    slug, name, level, address, country, location, description, cover_image,
    google_place_id, is_published, is_external, external_source,
    rating, review_count, external_details
  ) values (
    'google-' || substr(md5(p_google_place_id), 1, 20),
    trim(p_name),
    'attraction',
    nullif(trim(coalesce(p_address, '')), ''),
    'India',
    public.st_setsrid(public.st_makepoint(p_longitude, p_latitude), 4326)::public.geography,
    'Live Google Maps place. Details may change.',
    nullif(trim(coalesce(p_photo_url, '')), ''),
    p_google_place_id, false, true, 'google',
    p_rating, p_review_count, coalesce(p_details, '{}'::jsonb)
  )
  on conflict (google_place_id) where google_place_id is not null
  do update set
    name = excluded.name,
    address = excluded.address,
    location = excluded.location,
    rating = excluded.rating,
    review_count = excluded.review_count,
    cover_image = coalesce(excluded.cover_image, public.places.cover_image),
    external_details = excluded.external_details,
    updated_at = now()
  returning * into saved_place;

  return query select saved_place.id, saved_place.slug;
end;
$$;

revoke all on function public.upsert_external_google_place_details(text, text, text, double precision, double precision, numeric, integer, text, jsonb) from public, anon;
grant execute on function public.upsert_external_google_place_details(text, text, text, double precision, double precision, numeric, integer, text, jsonb) to authenticated;
