-- The admin can inspect unpublished records and change publication status.
-- Public and normal signed-in users keep their existing read-only scope.
create policy "Admins view all places"
  on public.places for select
  to authenticated
  using (
    exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

create policy "Admins update places"
  on public.places for update
  to authenticated
  using (
    exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );
