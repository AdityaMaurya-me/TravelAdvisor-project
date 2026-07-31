alter table public.trip_plans
  add column if not exists is_public boolean not null default false,
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists trip_plans_share_token_key on public.trip_plans (share_token);
create index if not exists trip_plans_public_share_token_idx on public.trip_plans (share_token) where is_public = true;

-- A token is the only way to read a shared itinerary. This deliberately does
-- not expose the trip owner or any collection/private account data.
create or replace function public.get_shared_trip_plan(p_share_token uuid)
returns table (
  origin_name text,
  destination_name text,
  buffer_km integer,
  stops jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select origin.name, destination.name, trip.buffer_km, trip.stops, trip.created_at
  from public.trip_plans trip
  join public.places origin on origin.id = trip.origin_place_id
  join public.places destination on destination.id = trip.destination_place_id
  where trip.share_token = p_share_token and trip.is_public = true
  limit 1;
$$;

revoke all on function public.get_shared_trip_plan(uuid) from public;
grant execute on function public.get_shared_trip_plan(uuid) to anon, authenticated;
