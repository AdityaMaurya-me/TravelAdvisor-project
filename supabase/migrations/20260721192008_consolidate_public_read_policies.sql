-- Keep public content readable while avoiding overlapping SELECT policies for
-- signed-in visitors. Write access remains scoped to the owning user.

drop policy if exists "Public read access to public collections" on public.collections;
drop policy if exists "Users view their own collections" on public.collections;
create policy "Public or owner collection reads"
  on public.collections for select
  to anon, authenticated
  using (
    is_public = true
    or (select auth.uid()) = user_id
  );

drop policy if exists "Users manage their own tips" on public.community_tips;
create policy "Users create their own tips"
  on public.community_tips for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own tips"
  on public.community_tips for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own tips"
  on public.community_tips for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own reviews" on public.reviews;
create policy "Users create their own reviews"
  on public.reviews for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own reviews"
  on public.reviews for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own reviews"
  on public.reviews for delete
  to authenticated
  using ((select auth.uid()) = user_id);
