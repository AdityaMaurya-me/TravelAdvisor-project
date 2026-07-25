create table public.community_tip_reports (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.community_tips(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'Reported by a community member',
  created_at timestamptz not null default now(),
  unique (tip_id, reporter_id)
);

create index community_tip_reports_reporter_idx
  on public.community_tip_reports (reporter_id, created_at desc);

alter table public.community_tip_reports enable row level security;

grant select, insert on public.community_tip_reports to authenticated;

create policy "Users view their own tip reports"
on public.community_tip_reports
for select
to authenticated
using ((select auth.uid()) = reporter_id);

create policy "Users report tips as themselves"
on public.community_tip_reports
for insert
to authenticated
with check ((select auth.uid()) = reporter_id);
