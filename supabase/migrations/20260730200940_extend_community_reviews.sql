alter table public.community_tips
  add column if not exists rating numeric(2,1),
  add column if not exists image_url text;

alter table public.community_tips
  drop constraint if exists community_tips_rating_check;

alter table public.community_tips
  add constraint community_tips_rating_check check (rating is null or (rating >= 1 and rating <= 5));

create index if not exists community_tips_place_rating_created_idx
  on public.community_tips (place_id, rating desc, created_at desc)
  where rating is not null;

-- Existing cards already display aggregate values from places. Include ratings from
-- both legacy reviews and the place-specific community reviews in that aggregate.
create or replace function public.refresh_place_rating()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected_place_id uuid := coalesce(new.place_id, old.place_id);
begin
  update public.places
  set rating = (
        select coalesce(round(avg(source.rating), 1), 0)
        from (
          select rating from public.reviews where place_id = affected_place_id
          union all
          select rating from public.community_tips where place_id = affected_place_id and rating is not null
        ) as source
      ),
      review_count = (
        select count(*)
        from (
          select rating from public.reviews where place_id = affected_place_id
          union all
          select rating from public.community_tips where place_id = affected_place_id and rating is not null
        ) as source
      )
  where id = affected_place_id;

  return null;
end;
$$;

drop trigger if exists trg_refresh_place_rating_from_community_tip on public.community_tips;
create trigger trg_refresh_place_rating_from_community_tip
  after insert or delete or update of rating, place_id on public.community_tips
  for each row execute function public.refresh_place_rating();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-images', 'review-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Users upload review photos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'review-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own review photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'review-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
