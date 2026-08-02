create table public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(action) between 1 and 100),
  target_type text not null check (char_length(target_type) between 1 and 100),
  target_id uuid,
  target_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_activity_logs_created_idx on public.admin_activity_logs(created_at desc);
alter table public.admin_activity_logs enable row level security;
grant select, insert on public.admin_activity_logs to authenticated;
create policy "Admins read activity logs" on public.admin_activity_logs for select to authenticated using (exists (select 1 from public.curator_roles where user_id=(select auth.uid()) and role='admin'));
create policy "Admins write activity logs" on public.admin_activity_logs for insert to authenticated with check ((select auth.uid())=admin_id and exists (select 1 from public.curator_roles where user_id=(select auth.uid()) and role='admin'));
