create table public.community_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.community_tip_comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'Reported by a community member',
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create index community_comment_reports_reporter_idx
  on public.community_comment_reports (reporter_id, created_at desc);

alter table public.community_comment_reports enable row level security;

grant select, insert on public.community_comment_reports to authenticated;

create policy "Users view their own comment reports"
on public.community_comment_reports
for select
to authenticated
using ((select auth.uid()) = reporter_id);

create policy "Users report comments as themselves"
on public.community_comment_reports
for insert
to authenticated
with check ((select auth.uid()) = reporter_id);
