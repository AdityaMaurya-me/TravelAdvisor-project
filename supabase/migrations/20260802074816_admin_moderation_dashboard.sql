-- Reports are private to their reporter, except for the explicitly assigned
-- administrator who needs them to moderate submitted content.
create policy "Admins view community tip reports"
  on public.community_tip_reports for select
  to authenticated
  using (
    exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create policy "Admins view community comment reports"
  on public.community_comment_reports for select
  to authenticated
  using (
    exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );
