-- Supply parent ownership so destination maps can show only their own places.
-- The view remains security-invoker, so existing RLS on public.places applies.
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
  p.rating,
  st_y(p.location::geometry) as latitude,
  st_x(p.location::geometry) as longitude,
  p.parent_id
from public.places p
where p.is_published = true
  and p.location is not null;

grant select on public.v_place_map_marker to anon, authenticated;
