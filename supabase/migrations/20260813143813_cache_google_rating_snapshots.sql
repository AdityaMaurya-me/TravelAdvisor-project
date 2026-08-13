-- Google aggregate ratings are a distinct, external source.  Keep them out
-- of places.rating/review_count, which are maintained from TravelAdvisor's
-- own community reviews.
alter table public.places
  add column if not exists google_rating numeric(2, 1),
  add column if not exists google_rating_count integer,
  add column if not exists google_rating_checked_at timestamptz;

alter table public.places
  drop constraint if exists places_google_rating_range,
  add constraint places_google_rating_range
    check (google_rating is null or google_rating between 0 and 5),
  drop constraint if exists places_google_rating_count_nonnegative,
  add constraint places_google_rating_count_nonnegative
    check (google_rating_count is null or google_rating_count >= 0);

create index if not exists places_google_rating_refresh_idx
  on public.places (google_rating_checked_at asc nulls first)
  where google_place_id is not null and is_published = true;

-- The public map projection must expose the display-safe aggregate so nearby
-- cards and pins use the same rating source as detail cards.
create or replace view public.v_place_map_marker
with (security_invoker = true)
as
select
  p.id,
  p.slug,
  p.name,
  p.level,
  coalesce(nullif(p.city, ''), nullif(p.state, ''), p.country, 'India') as location_label,
  p.cover_image,
  coalesce(p.google_rating, p.rating) as rating,
  st_y(p.location::geometry) as latitude,
  st_x(p.location::geometry) as longitude,
  p.parent_id,
  p.is_pet_friendly,
  p.has_parking,
  p.has_washroom,
  p.has_ev_charging,
  p.typical_visit_minutes,
  p.entry_fee,
  -- New view columns must be appended: PostgreSQL preserves existing view
  -- column positions when using CREATE OR REPLACE VIEW.
  p.google_rating_count as google_rating_count
from public.places p
where p.is_published = true
  and p.location is not null;

grant select on public.v_place_map_marker to anon, authenticated;
