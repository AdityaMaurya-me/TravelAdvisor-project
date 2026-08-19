-- AI suggestions that resolve to a Google Place already use public.places so
-- travellers can save them, add travel status, and join the discussion. Keep
-- those records pending until an administrator explicitly publishes them.
alter table public.user_notifications
  add column if not exists place_id uuid references public.places(id) on delete cascade;

alter table public.user_notifications
  drop constraint if exists user_notifications_type_check;
alter table public.user_notifications
  add constraint user_notifications_type_check
  check (type in (
    'location_request_received',
    'location_request_rejected',
    'location_request_approved',
    'location_request_resubmitted',
    'external_place_pending_review'
  ));

create index if not exists user_notifications_recipient_place_created_idx
  on public.user_notifications (recipient_id, place_id, created_at desc)
  where place_id is not null;

-- Only fires on the first insert. The Google upsert refreshes an existing row
-- on subsequent searches, so administrators do not receive duplicate alerts.
create or replace function public.notify_admin_of_external_place_pending_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_external is true
    and new.is_published is false
    and new.external_source = 'google' then
    insert into public.user_notifications (recipient_id, place_id, type, title, body)
    select
      role.user_id,
      new.id,
      'external_place_pending_review',
      'Google place needs review',
      new.name || ' was added by the AI assistant and is ready to review.'
    from public.curator_roles as role
    where role.role = 'admin';
  end if;

  return new;
end;
$$;

revoke all on function public.notify_admin_of_external_place_pending_review() from public, anon, authenticated;

drop trigger if exists external_google_place_pending_review_after_insert on public.places;
create trigger external_google_place_pending_review_after_insert
  after insert on public.places
  for each row execute function public.notify_admin_of_external_place_pending_review();
