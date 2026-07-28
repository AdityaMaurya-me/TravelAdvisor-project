-- Replace only the original seeded artwork with place-specific photographs.
-- Wikimedia URLs are 1280px derivatives; Unsplash URLs already request 1080px.
with curated_images(slug, url, alt_text) as (
  values
    ('bhivpuri-waterfalls', 'https://upload.wikimedia.org/wikipedia/commons/4/47/Bhivpuri-Waterfall.jpg', 'Bhivpuri Waterfall, Maharashtra (Wikimedia Commons)'),
    ('devkund-waterfall', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Devkund_Waterfall.JPG/1280px-Devkund_Waterfall.JPG', 'Devkund Waterfall, Maharashtra (Wikimedia Commons)'),
    ('dudhsagar-falls', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Dudhsagar_Falls%2C_Goa_%2851821730751%29.jpg/1280px-Dudhsagar_Falls%2C_Goa_%2851821730751%29.jpg', 'Dudhsagar Falls, Goa (Wikimedia Commons)'),
    ('ekvira-devi-temple', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Ekvira_Devi_Temple%2C_Lonavala.jpg/1280px-Ekvira_Devi_Temple%2C_Lonavala.jpg', 'Ekvira Devi Temple, Lonavala (Wikimedia Commons)'),
    ('elephanta-caves', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Elephanta_Caves_in_Mumbai.jpg/1280px-Elephanta_Caves_in_Mumbai.jpg', 'Elephanta Caves, Mumbai (Wikimedia Commons)'),
    ('karla-caves', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/KARLA%27S_CAVES.JPG/1280px-KARLA%27S_CAVES.JPG', 'Karla Caves, Maharashtra (Wikimedia Commons)'),
    ('chapora-fort', 'https://images.unsplash.com/photo-1642516864335-2ca9d8b3a511?auto=format&fit=crop&w=1080&q=80', 'Vagator beach view from Chapora Fort, Goa (photo by Avin CP via Unsplash)'),
    ('fontainhas', 'https://images.unsplash.com/photo-1656155316674-d8fab9e65eab?auto=format&fit=crop&w=1080&q=80', 'Fontainhas, Goa (photo by Vivek via Unsplash)'),
    ('goa', 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1080&q=80', 'Goa, India (photo by alexey turenkov via Unsplash)'),
    ('kanheri-caves', 'https://images.unsplash.com/photo-1752432477286-8b9020f5f926?auto=format&fit=crop&w=1080&q=80', 'Kanheri Caves, Mumbai (photo by joejo joestar via Unsplash)'),
    ('lonavala', 'https://images.unsplash.com/photo-1618805714320-f8825019c1be?auto=format&fit=crop&w=1080&q=80', 'Lonavala region, Maharashtra (photo by Sonika Agarwal via Unsplash)'),
    ('manali', 'https://images.unsplash.com/photo-1597167231350-d057a45dc868?auto=format&fit=crop&w=1080&q=80', 'Manali, Himachal Pradesh (photo by Naman jaswani via Unsplash)'),
    ('mumbai', 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1080&q=80', 'Marine Drive, Mumbai (photo by Satyajeet Mazumdar via Unsplash)'),
    ('munnar', 'https://images.unsplash.com/photo-1580818135730-ebd11086660b?auto=format&fit=crop&w=1080&q=80', 'Munnar, Kerala (photo by Dream Holidays via Unsplash)'),
    ('pawna-lake', 'https://images.unsplash.com/photo-1620915227466-6d471f99ef9b?auto=format&fit=crop&w=1080&q=80', 'Pawna Lake, Maharashtra (photo by Sanket Kumbhar via Unsplash)'),
    ('rajmachi-fort', 'https://images.unsplash.com/photo-1712186870325-00427d06341a?auto=format&fit=crop&w=1080&q=80', 'Rajmachi Fort, Maharashtra (photo by Zoshua Colah via Unsplash)'),
    ('tiger-point', 'https://images.unsplash.com/photo-1689172324767-f180880ccdec?auto=format&fit=crop&w=1080&q=80', 'Tiger Point, Lonavala (photo by Harshit Suryawanshi via Unsplash)'),
    ('udaipur', 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1080&q=80', 'Udaipur, Rajasthan (photo by Jainam Mehta via Unsplash)')
)
update public.places as place
set cover_image = curated.url
from curated_images as curated
where place.slug = curated.slug
  and (place.cover_image is null or place.cover_image like '/%');

delete from public.place_images as image
using public.places as place
where image.place_id = place.id
  and place.slug in (
    'bhivpuri-waterfalls', 'devkund-waterfall', 'dudhsagar-falls',
    'ekvira-devi-temple', 'elephanta-caves', 'karla-caves', 'chapora-fort',
    'fontainhas', 'goa', 'kanheri-caves', 'lonavala', 'manali', 'mumbai',
    'munnar', 'pawna-lake', 'rajmachi-fort', 'tiger-point', 'udaipur'
  )
  and image.url like '/%';

with curated_images(slug, url, alt_text) as (
  values
    ('bhivpuri-waterfalls', 'https://upload.wikimedia.org/wikipedia/commons/4/47/Bhivpuri-Waterfall.jpg', 'Bhivpuri Waterfall, Maharashtra (Wikimedia Commons)'),
    ('devkund-waterfall', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Devkund_Waterfall.JPG/1280px-Devkund_Waterfall.JPG', 'Devkund Waterfall, Maharashtra (Wikimedia Commons)'),
    ('dudhsagar-falls', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Dudhsagar_Falls%2C_Goa_%2851821730751%29.jpg/1280px-Dudhsagar_Falls%2C_Goa_%2851821730751%29.jpg', 'Dudhsagar Falls, Goa (Wikimedia Commons)'),
    ('ekvira-devi-temple', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Ekvira_Devi_Temple%2C_Lonavala.jpg/1280px-Ekvira_Devi_Temple%2C_Lonavala.jpg', 'Ekvira Devi Temple, Lonavala (Wikimedia Commons)'),
    ('elephanta-caves', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Elephanta_Caves_in_Mumbai.jpg/1280px-Elephanta_Caves_in_Mumbai.jpg', 'Elephanta Caves, Mumbai (Wikimedia Commons)'),
    ('karla-caves', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/KARLA%27S_CAVES.JPG/1280px-KARLA%27S_CAVES.JPG', 'Karla Caves, Maharashtra (Wikimedia Commons)'),
    ('chapora-fort', 'https://images.unsplash.com/photo-1642516864335-2ca9d8b3a511?auto=format&fit=crop&w=1080&q=80', 'Vagator beach view from Chapora Fort, Goa (photo by Avin CP via Unsplash)'),
    ('fontainhas', 'https://images.unsplash.com/photo-1656155316674-d8fab9e65eab?auto=format&fit=crop&w=1080&q=80', 'Fontainhas, Goa (photo by Vivek via Unsplash)'),
    ('goa', 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1080&q=80', 'Goa, India (photo by alexey turenkov via Unsplash)'),
    ('kanheri-caves', 'https://images.unsplash.com/photo-1752432477286-8b9020f5f926?auto=format&fit=crop&w=1080&q=80', 'Kanheri Caves, Mumbai (photo by joejo joestar via Unsplash)'),
    ('lonavala', 'https://images.unsplash.com/photo-1618805714320-f8825019c1be?auto=format&fit=crop&w=1080&q=80', 'Lonavala region, Maharashtra (photo by Sonika Agarwal via Unsplash)'),
    ('manali', 'https://images.unsplash.com/photo-1597167231350-d057a45dc868?auto=format&fit=crop&w=1080&q=80', 'Manali, Himachal Pradesh (photo by Naman jaswani via Unsplash)'),
    ('mumbai', 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1080&q=80', 'Marine Drive, Mumbai (photo by Satyajeet Mazumdar via Unsplash)'),
    ('munnar', 'https://images.unsplash.com/photo-1580818135730-ebd11086660b?auto=format&fit=crop&w=1080&q=80', 'Munnar, Kerala (photo by Dream Holidays via Unsplash)'),
    ('pawna-lake', 'https://images.unsplash.com/photo-1620915227466-6d471f99ef9b?auto=format&fit=crop&w=1080&q=80', 'Pawna Lake, Maharashtra (photo by Sanket Kumbhar via Unsplash)'),
    ('rajmachi-fort', 'https://images.unsplash.com/photo-1712186870325-00427d06341a?auto=format&fit=crop&w=1080&q=80', 'Rajmachi Fort, Maharashtra (photo by Zoshua Colah via Unsplash)'),
    ('tiger-point', 'https://images.unsplash.com/photo-1689172324767-f180880ccdec?auto=format&fit=crop&w=1080&q=80', 'Tiger Point, Lonavala (photo by Harshit Suryawanshi via Unsplash)'),
    ('udaipur', 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1080&q=80', 'Udaipur, Rajasthan (photo by Jainam Mehta via Unsplash)')
)
insert into public.place_images (place_id, url, alt_text, sort_order)
select place.id, curated.url, curated.alt_text, 0
from curated_images as curated
join public.places as place on place.slug = curated.slug
where not exists (
  select 1 from public.place_images as image
  where image.place_id = place.id and image.url = curated.url
);
