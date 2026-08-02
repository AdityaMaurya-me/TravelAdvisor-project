-- A submitted location request belongs to its author until publication. Only
-- the explicitly assigned admin can remove somebody else's request.
drop policy if exists "Owners can remove drafts and curators can manage requests" on public.location_candidates;

create policy "Owners and admins delete location candidates"
  on public.location_candidates for delete
  to authenticated
  using (
    ((select auth.uid()) = created_by and status <> 'published')
    or exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );
