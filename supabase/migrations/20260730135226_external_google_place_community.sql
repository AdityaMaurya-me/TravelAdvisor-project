-- Google-discovered places need a stable internal row so existing collections,
-- travel status, reviews, votes, reports, and community discussions can reuse
-- their current foreign keys. They remain outside curated browse/catalogue views.
alter table public.places
  add column if not exists is_external boolean not null default false,
  add column if not exists external_source text;

create index if not exists places_external_google_place_id_idx
  on public.places (google_place_id)
  where is_external = true;

drop policy if exists "Public read access to published places" on public.places;
drop policy if exists "Public read access to external places" on public.places;
create policy "Public read access to places"
  on public.places for select
  to anon, authenticated
  using (is_published = true or is_external = true);

-- This function is intentionally limited to authenticated users and validates
-- the minimal metadata before creating an unlisted external place. It has no
-- catalogue category and is_published stays false, so it cannot surface in the
-- curated destination/category experience until an editor verifies it.
create or replace function public.ensure_external_google_place(
  p_google_place_id text,
  p_name text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision
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

  insert into public.places (
    slug, name, level, address, country, location, description, cover_image,
    google_place_id, is_published, is_external, external_source
  ) values (
    'google-' || substr(md5(p_google_place_id), 1, 20),
    trim(p_name),
    'attraction',
    nullif(trim(coalesce(p_address, '')), ''),
    'India',
    public.st_setsrid(public.st_makepoint(p_longitude, p_latitude), 4326)::public.geography,
    'Live Google Maps place. Details may change.',
    '/placeholder.jpg',
    p_google_place_id,
    false,
    true,
    'google'
  )
  on conflict (google_place_id) where google_place_id is not null
  do update set updated_at = now()
  returning * into saved_place;

  return query select saved_place.id, saved_place.slug;
end;
$$;

revoke all on function public.ensure_external_google_place(text, text, text, double precision, double precision) from public, anon;
grant execute on function public.ensure_external_google_place(text, text, text, double precision, double precision) to authenticated;
