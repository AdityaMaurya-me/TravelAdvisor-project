-- A journey may start at a device GPS position, which deliberately has no
-- matching public `places` row. Verified places continue to use the existing
-- foreign keys; snapshots only preserve private, per-user route endpoints.
alter table public.trip_plans
  alter column origin_place_id drop not null,
  alter column destination_place_id drop not null,
  add column if not exists origin_snapshot jsonb,
  add column if not exists destination_snapshot jsonb;

alter table public.trip_plans
  add constraint trip_plans_origin_endpoint_check
    check (origin_place_id is not null or origin_snapshot is not null),
  add constraint trip_plans_destination_endpoint_check
    check (destination_place_id is not null or destination_snapshot is not null);
