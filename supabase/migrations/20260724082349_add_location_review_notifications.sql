alter table public.location_candidates
  drop constraint location_candidates_status_check;
alter table public.location_candidates
  add constraint location_candidates_status_check
  check (status in ('draft', 'review', 'approved', 'rejected', 'published'));

create table public.location_review_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.location_candidates(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('submitted', 'resubmitted', 'rejected', 'approved')),
  reason text,
  created_at timestamptz not null default now()
);

create index location_review_events_candidate_created_idx
  on public.location_review_events (candidate_id, created_at desc);

alter table public.location_review_events enable row level security;
grant select on public.location_review_events to authenticated;

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  candidate_id uuid references public.location_candidates(id) on delete cascade,
  type text not null check (type in ('location_request_received', 'location_request_rejected', 'location_request_approved', 'location_request_resubmitted')),
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index user_notifications_recipient_created_idx
  on public.user_notifications (recipient_id, is_read, created_at desc);

alter table public.user_notifications enable row level security;
grant select, update on public.user_notifications to authenticated;
create policy "Recipients read their notifications"
  on public.user_notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);
create policy "Recipients mark their notifications read"
  on public.user_notifications for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

create policy "Request owners and curators read review history"
  on public.location_review_events for select to authenticated
  using (
    exists (
      select 1 from public.location_candidates c
      where c.id = candidate_id
        and (c.created_by = (select auth.uid()) or exists (
          select 1 from public.curator_roles r
          where r.user_id = (select auth.uid()) and r.role in ('reviewer', 'admin')
        ))
    )
  );

create or replace function public.record_location_candidate_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.location_review_events (candidate_id, actor_id, event_type)
    values (new.id, new.created_by, 'submitted');
    insert into public.user_notifications (recipient_id, candidate_id, type, title, body)
    select user_id, new.id, 'location_request_received', 'New location request', new.name || ' is ready for review.'
    from public.curator_roles where role in ('reviewer', 'admin');
    return new;
  end if;

  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    insert into public.location_review_events (candidate_id, actor_id, event_type, reason)
    values (new.id, (select auth.uid()), 'rejected', new.review_notes);
    insert into public.user_notifications (recipient_id, candidate_id, type, title, body)
    values (new.created_by, new.id, 'location_request_rejected', 'Location request needs changes', coalesce(new.review_notes, 'Please review the request and submit it again.'));
  elsif new.status = 'published' and old.status is distinct from 'published' then
    insert into public.location_review_events (candidate_id, actor_id, event_type)
    values (new.id, (select auth.uid()), 'approved');
    insert into public.user_notifications (recipient_id, candidate_id, type, title, body)
    values (new.created_by, new.id, 'location_request_approved', 'Location request approved', new.name || ' is now available on TravelAdvisor.');
  elsif old.status = 'rejected' and new.status in ('draft', 'review') then
    insert into public.location_review_events (candidate_id, actor_id, event_type)
    values (new.id, (select auth.uid()), 'resubmitted');
    insert into public.user_notifications (recipient_id, candidate_id, type, title, body)
    select user_id, new.id, 'location_request_resubmitted', 'Location request resubmitted', new.name || ' was updated and resubmitted for review.'
    from public.curator_roles where role in ('reviewer', 'admin');
  end if;
  return new;
end;
$$;

revoke all on function public.record_location_candidate_activity() from public, anon, authenticated;

create trigger location_candidate_activity_after_insert
  after insert on public.location_candidates
  for each row execute function public.record_location_candidate_activity();
create trigger location_candidate_activity_after_update
  after update of status, review_notes on public.location_candidates
  for each row execute function public.record_location_candidate_activity();
