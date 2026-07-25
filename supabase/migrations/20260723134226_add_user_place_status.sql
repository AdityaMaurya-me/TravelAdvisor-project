create table public.user_place_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  status text not null check (status in ('want_to_visit', 'visited')),
  visited_at date,
  personal_note text check (personal_note is null or char_length(personal_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, place_id),
  check (status <> 'visited' or visited_at is null or visited_at <= current_date)
);

create index user_place_status_user_status_idx on public.user_place_status (user_id, status, updated_at desc);
create index user_place_status_place_idx on public.user_place_status (place_id);

alter table public.user_place_status enable row level security;
grant select, insert, update, delete on public.user_place_status to authenticated;

create policy "Users view their own place statuses"
  on public.user_place_status for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users create their own place statuses"
  on public.user_place_status for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own place statuses"
  on public.user_place_status for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own place statuses"
  on public.user_place_status for delete to authenticated
  using ((select auth.uid()) = user_id);
