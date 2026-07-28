-- Replace the generic site artwork accidentally seeded for Bhushi Dam with
-- photographs explicitly identified as Bhushi Dam, Lonavala on Wikimedia
-- Commons. Each source is public-domain or Creative Commons licensed.
-- Source collection: https://commons.wikimedia.org/wiki/Category:Bhushi_Dam
do $bhushi$
declare
  bhushi_dam_id uuid;
begin
  select id into bhushi_dam_id
  from public.places
  where slug = 'bhushi-dam';

  if bhushi_dam_id is null then
    raise exception 'Expected Bhushi Dam place was not found';
  end if;

  update public.places
  set cover_image = 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Bhushi_dam.JPG'
  where id = bhushi_dam_id
    and cover_image = '/travel-hero.png';

  -- Delete only the known generic artwork records; preserve any later
  -- user-provided or curator-provided photographs.
  delete from public.place_images
  where place_id = bhushi_dam_id
    and url = any (array[
      '/attraction-1.png',
      '/attraction-2.png',
      '/attraction-3.png',
      '/attraction-4.png',
      '/travel-hero.png'
    ]);

  insert into public.place_images (place_id, url, alt_text, sort_order)
  values
    (bhushi_dam_id, 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Bhushi_dam.JPG', 'Bhushi Dam in the rainy season, Lonavala (public domain; Sobarwiki via Wikimedia Commons)', 0),
    (bhushi_dam_id, 'https://upload.wikimedia.org/wikipedia/commons/7/72/Bhushi_Dam_-_Lonavala.jpg', 'Bhushi Dam, Lonavala (CC BY-SA 3.0; Vivek Shrivastava via Wikimedia Commons)', 1),
    (bhushi_dam_id, 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Bhushi_Dam.JPG', 'Bhushi Dam, Lonavala (CC BY-SA 3.0; Ripanvc via Wikimedia Commons)', 2),
    (bhushi_dam_id, 'https://upload.wikimedia.org/wikipedia/commons/b/b0/BhushiDam.jpg', 'Bhushi Dam, Lonavala (CC BY-SA 4.0; Shaybajas via Wikimedia Commons)', 3),
    (bhushi_dam_id, 'https://upload.wikimedia.org/wikipedia/commons/3/31/Bhushi_Dam_an_anotherview_%2C_Lonovala.jpg', 'Bhushi Dam, Lonavala, another view (CC BY-SA 4.0; Shaybajas via Wikimedia Commons)', 4),
    (bhushi_dam_id, 'https://upload.wikimedia.org/wikipedia/commons/4/47/Bhushi_Dam_an_anotherview_%2C_Lonovala_2.jpg', 'Bhushi Dam, Lonavala, another view (CC BY-SA 4.0; Shaybajas via Wikimedia Commons)', 5)
  on conflict do nothing;
end;
$bhushi$;
