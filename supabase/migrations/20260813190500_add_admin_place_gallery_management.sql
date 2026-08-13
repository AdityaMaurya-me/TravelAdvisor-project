-- Public visitors may read location gallery entries. Only an explicitly
-- assigned administrator can make an uploaded image visible, edit its
-- metadata/order, or remove it.
grant select, insert, update, delete on public.place_images to authenticated;

create policy "Admins manage place gallery metadata"
  on public.place_images
  for all
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
