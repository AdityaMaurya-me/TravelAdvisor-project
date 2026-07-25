insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-images', 'place-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users upload their place images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'place-images' and (select auth.uid())::text = owner_id);
create policy "Users update their own place images"
  on storage.objects for update to authenticated
  using (bucket_id = 'place-images' and (select auth.uid())::text = owner_id)
  with check (bucket_id = 'place-images' and (select auth.uid())::text = owner_id);
create policy "Users delete their own place images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'place-images' and (select auth.uid())::text = owner_id);
