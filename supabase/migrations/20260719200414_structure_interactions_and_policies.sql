-- Community interactions used by the existing Community page.  They are
-- separate from community_tips so a user can only vote once and can only
-- edit or remove their own comments.
create table if not exists public.community_tip_comments (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.community_tips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_tip_votes (
  tip_id uuid not null references public.community_tips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tip_id, user_id)
);

create index if not exists community_tip_comments_tip_created_idx
  on public.community_tip_comments (tip_id, created_at desc);

create index if not exists community_tip_votes_tip_idx
  on public.community_tip_votes (tip_id);

alter table public.community_tip_comments enable row level security;
alter table public.community_tip_votes enable row level security;

create policy "Published tip comments are readable"
  on public.community_tip_comments for select
  to anon, authenticated
  using (true);

create policy "Users create their own tip comments"
  on public.community_tip_comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own tip comments"
  on public.community_tip_comments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own tip comments"
  on public.community_tip_comments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Tip votes are readable"
  on public.community_tip_votes for select
  to anon, authenticated
  using (true);

create policy "Users create their own tip votes"
  on public.community_tip_votes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own tip votes"
  on public.community_tip_votes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Replace broad `public` ALL policies with explicit authenticated owner
-- policies.  This removes unnecessary work for anonymous visitors and keeps
-- all collection, profile, review, and tip mutations scoped to the owner.
drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
  on public.profiles for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users manage their own collections" on public.collections;
create policy "Users view their own collections"
  on public.collections for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users create their own collections"
  on public.collections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own collections"
  on public.collections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own collections"
  on public.collections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage items in their own collections" on public.collection_items;
create policy "Users manage items in their own collections"
  on public.collection_items for all
  to authenticated
  using (exists (
    select 1 from public.collections collection
    where collection.id = collection_items.collection_id
      and collection.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.collections collection
    where collection.id = collection_items.collection_id
      and collection.user_id = (select auth.uid())
  ));

drop policy if exists "Users manage their own tips" on public.community_tips;
create policy "Users manage their own tips"
  on public.community_tips for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own reviews" on public.reviews;
create policy "Users manage their own reviews"
  on public.reviews for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The database advisor reports this index duplicates route_stops_route_sort_idx.
drop index if exists public.idx_route_stops_route;
