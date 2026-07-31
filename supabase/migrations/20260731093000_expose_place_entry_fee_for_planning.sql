-- Entry-fee data is already curated on places. Expose it through the safe,
-- published-only marker view so discovery tools can offer useful budget filters.
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
  p.parent_id,
  p.is_pet_friendly,
  p.has_parking,
  p.has_washroom,
  p.has_ev_charging,
  p.typical_visit_minutes,
  p.entry_fee
from public.places p
where p.is_published = true
  and p.location is not null;

grant select on public.v_place_map_marker to anon, authenticated;
