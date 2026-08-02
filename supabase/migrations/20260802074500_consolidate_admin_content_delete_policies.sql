-- Keep a single DELETE policy per table. It grants a delete when the user
-- owns the row or has the explicitly assigned admin curator role.
drop policy if exists "Users delete their own tips" on public.community_tips;
drop policy if exists "Admins can delete any community tip" on public.community_tips;

create policy "Owners and admins delete community tips"
  on public.community_tips for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

drop policy if exists "Users delete their own tip comments" on public.community_tip_comments;
drop policy if exists "Admins can delete any community tip comment" on public.community_tip_comments;

create policy "Owners and admins delete community tip comments"
  on public.community_tip_comments for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );
