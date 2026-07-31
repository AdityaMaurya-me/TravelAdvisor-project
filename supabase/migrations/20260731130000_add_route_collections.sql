create table public.route_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.route_collection_items (
  collection_id uuid not null references public.route_collections(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, route_id)
);

create index route_collections_user_created_idx on public.route_collections(user_id, created_at);
alter table public.route_collections enable row level security;
alter table public.route_collection_items enable row level security;
grant select, insert, update, delete on public.route_collections, public.route_collection_items to authenticated;
create policy "Users manage their route collections" on public.route_collections for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage route collection items" on public.route_collection_items for all to authenticated using (exists (select 1 from public.route_collections c where c.id = collection_id and c.user_id = (select auth.uid()))) with check (exists (select 1 from public.route_collections c where c.id = collection_id and c.user_id = (select auth.uid())));
