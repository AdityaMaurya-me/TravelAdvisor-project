create policy "Admins manage place categories"
  on public.place_categories for all
  to authenticated
  using (exists (select 1 from public.curator_roles where user_id = (select auth.uid()) and role = 'admin'))
  with check (exists (select 1 from public.curator_roles where user_id = (select auth.uid()) and role = 'admin'));
