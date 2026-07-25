-- A hidden per-user collection keeps the central "Saved places" view
-- independent from the editable trip collections created by the user.
alter table public.collections
  add column if not exists is_system boolean not null default false;

-- Preserve the behaviour of the earlier implementation, which created one
-- collection titled "Saved places" for a user's primary saved list.
update public.collections as collection
set is_system = true
where collection.title = 'Saved places'
  and collection.is_system = false
  and not exists (
    select 1
    from public.collections as existing_system
    where existing_system.user_id = collection.user_id
      and existing_system.is_system = true
  );

create unique index if not exists collections_one_system_per_user_idx
  on public.collections (user_id)
  where is_system = true;
