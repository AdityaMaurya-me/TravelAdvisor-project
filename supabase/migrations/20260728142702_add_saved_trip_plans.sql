create table public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin_place_id uuid not null references public.places(id) on delete restrict,
  destination_place_id uuid not null references public.places(id) on delete restrict,
  buffer_km integer not null check (buffer_km between 2 and 25),
  stops jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (origin_place_id <> destination_place_id)
);

create index trip_plans_user_created_idx on public.trip_plans (user_id, created_at desc);

alter table public.trip_plans enable row level security;
grant select, insert, delete on public.trip_plans to authenticated;

create policy "Users manage their own trip plans"
  on public.trip_plans for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own trip plans"
  on public.trip_plans for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own trip plans"
  on public.trip_plans for delete to authenticated
  using ((select auth.uid()) = user_id);
