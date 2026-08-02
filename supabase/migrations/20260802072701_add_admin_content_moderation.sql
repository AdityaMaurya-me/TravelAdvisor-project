-- Owner deletion remains available to every user. These additive policies are
-- intentionally limited to the explicitly assigned `admin` curator role, so
-- reviewers and ordinary users cannot remove another traveller's content.
create policy "Admins can delete any community tip"
  on public.community_tips for delete
  to authenticated
  using (
    exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create policy "Admins can delete any community tip comment"
  on public.community_tip_comments for delete
  to authenticated
  using (
    exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );
