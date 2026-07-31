create table public.route_collection_trip_plans (
  collection_id uuid not null references public.route_collections(id) on delete cascade,
  trip_plan_id uuid not null references public.trip_plans(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, trip_plan_id)
);
alter table public.route_collection_trip_plans enable row level security;
grant select, insert, delete on public.route_collection_trip_plans to authenticated;
create policy "Users manage planned route collection items" on public.route_collection_trip_plans for all to authenticated using (exists (select 1 from public.route_collections c where c.id = collection_id and c.user_id = (select auth.uid()))) with check (exists (select 1 from public.route_collections c where c.id = collection_id and c.user_id = (select auth.uid())));
