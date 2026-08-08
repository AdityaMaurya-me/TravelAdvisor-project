-- Catalogue expansion v1 / batch 01.
-- Sources: Google Places Text Search, four throttled requests on 2026-08-08.
-- Photo media is never copied into Supabase; cards use the place ID to obtain
-- a current provider image through the existing server-side photo route.

with seed (slug, destination_slug, category_slug, name, address, latitude, longitude, google_place_id, source_url, description) as (
  values
    ('shaniwar-wada', 'pune', 'attractions', 'Shaniwar Wada', 'Shaniwar Peth, Pune, Maharashtra 411030, India', 18.5195841, 73.8554208, 'ChIJEXtrIuLBwjsRi6ZcFwaBu6Q', 'https://maps.google.com/?cid=11870223106026808971', 'Historic fortification and former seat of the Peshwas in central Pune.'),
    ('darshan-museum', 'pune', 'attractions', 'Darshan Museum', '10, Sadhu Vaswani Rd, near G.P.O, Agarkar Nagar, Pune, Maharashtra 411001, India', 18.5240953, 73.8764697, 'ChIJIZF6bFrAwjsRKpKPBjMMLUA', 'https://maps.google.com/?cid=4624365805672305194', 'Museum in Pune focused on the life and work of Sadhu Vaswani.'),
    ('lal-mahal', 'pune', 'attractions', 'Lal Mahal', 'Chhatrapati Shivaji Maharaj Rd, Kasba Peth, Pune, Maharashtra 411011, India', 18.5187433, 73.8566483, 'ChIJoZE8eWXAwjsRkh_y2oBtIEo', 'https://maps.google.com/?cid=5341389558257950610', 'Historic Pune landmark associated with Chhatrapati Shivaji Maharaj.'),
    ('raja-dinkar-kelkar-museum', 'pune', 'attractions', 'Raja Dinkar Kelkar Museum', 'No. 1377/78, Kamal Kunj, Bajirao Rd, Natu Baag, Pune, Maharashtra 411002, India', 18.5106855, 73.8544307, 'ChIJ9R3gx3PAwjsR822UYgNrz0U', 'https://maps.google.com/?cid=5030356971079101939', 'Museum with a collection of Indian decorative arts and everyday objects.'),
    ('aga-khan-palace', 'pune', 'attractions', 'Aga Khan Palace', 'Palace View Society, Kalyani Nagar, Pune, Maharashtra 411006, India', 18.5525887, 73.9015388, 'ChIJW4H-TwDBwjsR3nvMCZSby50', 'https://maps.google.com/?cid=11370352744348810206', 'Historic palace and memorial site in Pune.'),
    ('cafe-flying-gypsys', 'pune', 'cafes', 'CAFE FLYING GYPSYS', '1201-A/4, GH Patil Path, Shivajinagar, Pune, Maharashtra 411004, India', 18.5239789, 73.8424699, 'ChIJTWY0G2TBwjsR9M0AcA-mZ0A', 'https://maps.google.com/?cid=4640860526262406644', 'Coffee shop in Shivajinagar, Pune.'),
    ('boho-boho-pune', 'pune', 'cafes', 'Boho Boho', '398, S Main Rd, Koregaon Park, Pune, Maharashtra 411001, India', 18.5328908, 73.8985645, 'ChIJl7B9UmfBwjsRWfk8VWfYlL4', 'https://maps.google.com/?cid=13732839102082775385', 'Bistro and food venue in Koregaon Park, Pune.'),
    ('cafe-the-voyage', 'pune', 'cafes', 'Cafe - The Voyage', 'Ashiyana Park, Koregaon Park, Pune, Maharashtra 411001, India', 18.5394855, 73.8976045, 'ChIJqUxTFuXBwjsRBE5MLhGy0W0', 'https://maps.google.com/?cid=7913301807127612932', 'Cafe in Koregaon Park, Pune.'),
    ('zen-cafe-pune', 'pune', 'cafes', 'Zen Cafe', 'Galaxy Garden, N Main Rd, Koregaon Park, Pune, Maharashtra 411001, India', 18.5386430, 73.8865596, 'ChIJPXazeGvBwjsRaU3g6SORo5s', 'https://maps.google.com/?cid=11214967080516341097', 'Cafe in Koregaon Park, Pune.'),
    ('cafe-kathaa', 'pune', 'cafes', 'Cafe Kathaa', 'F C Road, Deccan Gymkhana, Pune, Maharashtra 411004, India', 18.5207640, 73.8405691, 'ChIJRecQlI6_wjsRdAd2NBK8S1c', 'https://maps.google.com/?cid=6290328090928613236', 'Cafe and tea house on F C Road in Pune.'),
    ('india-gate', 'delhi', 'attractions', 'India Gate', 'Kartavya Path, New Delhi, Delhi 110001, India', 28.6129120, 77.2295097, 'ChIJC03rqdriDDkRXT6SJRGXFwc', 'https://maps.google.com/?cid=511043182630420061', 'War memorial and landmark on Kartavya Path in New Delhi.'),
    ('mehrauli-archaeological-park-walk', 'delhi', 'attractions', 'Mehrauli Archaeological Park Walk', 'Anuvrat Marg, Mehrauli, New Delhi, Delhi 110030, India', 28.5202041, 77.1876790, 'ChIJI85HXAMeDTkRUnfV6u6dkSw', 'https://maps.google.com/?cid=3211521658759509842', 'Heritage walk through monuments in the Mehrauli archaeological area.'),
    ('humayuns-tomb', 'delhi', 'attractions', 'Humayuns Tomb', 'Hazrat Nizamuddin, New Delhi, Delhi 110013, India', 28.5932848, 77.2507492, 'ChIJpwtG6BzjDDkRDajfOy268bk', 'https://maps.google.com/?cid=13398695069844744205', 'Mughal-era garden tomb and UNESCO World Heritage Site in New Delhi.'),
    ('purana-qila', 'delhi', 'attractions', 'Purana Qila', 'Mathura Rd, Pragati Maidan, New Delhi, Delhi 110001, India', 28.6095744, 77.2437371, 'ChIJcWc7SyHjDDkRs8yyCmF5khM', 'https://maps.google.com/?cid=1410323091018665139', 'Historic fort complex near Pragati Maidan in New Delhi.'),
    ('safdarjung-tomb', 'delhi', 'attractions', 'Safdarjung Tomb', 'Delhi Race Club, New Delhi, Delhi 110003, India', 28.5894156, 77.2106219, 'ChIJVcXN6ZHiDDkR7DeT_RtRCc0', 'https://maps.google.com/?cid=14774429233225873388', 'Eighteenth-century garden tomb in New Delhi.'),
    ('triveni-terrace-cafe', 'delhi', 'cafes', 'Triveni Terrace Cafe', '205, Tansen Marg, Mandi House, New Delhi, Delhi 110001, India', 28.6272268, 77.2324197, 'ChIJgYWp8Cz9DDkRHGRazZ5BlZg', 'https://maps.google.com/?cid=10994766215600825372', 'Cafe at Triveni Kala Sangam in Mandi House.'),
    ('cafe-de-flora', 'delhi', 'cafes', 'Cafe De Flora', 'Santushti Shopping Complex, Chanakyapuri, New Delhi, Delhi 110021, India', 28.5946051, 77.1983804, 'ChIJ1z_p_ejjDDkRl8BOSsrcIps', 'https://maps.google.com/?cid=11178739986475171991', 'Restaurant and cafe in Chanakyapuri, New Delhi.'),
    ('farzi-cafe-delhi', 'delhi', 'cafes', 'Farzi Cafe', 'Inner Circle, Connaught Place, New Delhi, Delhi 110001, India', 28.6325985, 77.2214946, 'ChIJhSQX4zb9DDkRWCjFRnNLnyA', 'https://maps.google.com/?cid=2350680488991336536', 'Restaurant and cafe in Connaught Place, New Delhi.'),
    ('cafe-lota', 'delhi', 'cafes', 'Cafe Lota', 'National Crafts Museum, Pragati Maidan, New Delhi, Delhi 110001, India', 28.6136111, 77.2425000, 'ChIJP_oFxSfjDDkRG_HG59ndSus', 'https://maps.google.com/?cid=16954607675155869979', 'Cafe at the National Crafts Museum in New Delhi.'),
    ('seven-seeds-coffee', 'delhi', 'cafes', 'Seven Seeds Coffee', 'Block W, Arjun Nagar, Green Park, New Delhi, Delhi 110016, India', 28.5592028, 77.2007181, 'ChIJg6OiO2rjDDkRSCm30REQsFs', 'https://maps.google.com/?cid=6606798322071447880', 'Coffee shop in Green Park, New Delhi.')
)
insert into public.places (
  slug, name, level, parent_id, city, state, country, location, address,
  description, google_place_id, source_url, source_reference, last_verified_at,
  is_published, is_external, external_source, external_details
)
select
  seed.slug, seed.name, 'attraction'::public.place_level, destination.id,
  destination.name, destination.state, destination.country,
  st_setsrid(st_makepoint(seed.longitude, seed.latitude), 4326)::geography,
  seed.address, seed.description, seed.google_place_id, seed.source_url,
  'Google Places Text Search - catalogue batch 01', now(), true, false,
  'google_places', jsonb_build_object('catalogue_batch', 'pune-delhi-01')
from seed
join public.places destination on destination.slug = seed.destination_slug
on conflict (slug) do update
set parent_id = excluded.parent_id,
    city = excluded.city,
    state = excluded.state,
    country = excluded.country,
    location = excluded.location,
    address = excluded.address,
    description = excluded.description,
    google_place_id = excluded.google_place_id,
    source_url = excluded.source_url,
    source_reference = excluded.source_reference,
    last_verified_at = excluded.last_verified_at,
    is_published = true,
    is_external = false,
    external_source = excluded.external_source,
    external_details = excluded.external_details,
    updated_at = now();

with seed (slug, category_slug) as (
  values
    ('shaniwar-wada', 'attractions'), ('darshan-museum', 'attractions'), ('lal-mahal', 'attractions'), ('raja-dinkar-kelkar-museum', 'attractions'), ('aga-khan-palace', 'attractions'),
    ('cafe-flying-gypsys', 'cafes'), ('boho-boho-pune', 'cafes'), ('cafe-the-voyage', 'cafes'), ('zen-cafe-pune', 'cafes'), ('cafe-kathaa', 'cafes'),
    ('india-gate', 'attractions'), ('mehrauli-archaeological-park-walk', 'attractions'), ('humayuns-tomb', 'attractions'), ('purana-qila', 'attractions'), ('safdarjung-tomb', 'attractions'),
    ('triveni-terrace-cafe', 'cafes'), ('cafe-de-flora', 'cafes'), ('farzi-cafe-delhi', 'cafes'), ('cafe-lota', 'cafes'), ('seven-seeds-coffee', 'cafes')
)
insert into public.place_categories (place_id, category_id)
select place.id, category.id
from seed
join public.places place on place.slug = seed.slug
join public.categories category on category.slug = seed.category_slug
on conflict do nothing;
