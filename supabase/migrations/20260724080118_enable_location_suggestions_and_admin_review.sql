drop policy "Curators view their own location candidates" on public.location_candidates;
drop policy "Curators create their own location candidates" on public.location_candidates;
drop policy "Curators update their own location candidates" on public.location_candidates;
drop policy "Curators delete their own location candidates" on public.location_candidates;

create policy "Candidates are visible to owners and curators"
  on public.location_candidates for select
  to authenticated
  using (
    (select auth.uid()) = created_by
    or exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role in ('reviewer', 'admin')
    )
  );

create policy "Authenticated users can suggest locations"
  on public.location_candidates for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and status = 'draft'
    and published_place_id is null
  );

create policy "Owners can correct drafts and curators can review"
  on public.location_candidates for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    or exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role in ('reviewer', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role in ('reviewer', 'admin')
    )
    or (
      (select auth.uid()) = created_by
      and status in ('draft', 'review')
      and published_place_id is null
    )
  );

create policy "Owners can remove drafts and curators can manage requests"
  on public.location_candidates for delete
  to authenticated
  using (
    exists (
      select 1 from public.curator_roles
      where user_id = (select auth.uid()) and role in ('reviewer', 'admin')
    ) or ((select auth.uid()) = created_by and status <> 'published')
  );
