-- Exact Google Maps place pin supplied by the project owner on 2026-07-29.
-- Google Maps resolved place coordinates: 18.9549237, 73.3134369.
update public.places
set
  location = public.st_setsrid(public.st_makepoint(73.3134369, 18.9549237), 4326)::public.geography,
  source_url = 'https://www.google.com/maps/place/Bhivpuri+Waterfalls/@18.9549237,73.3086733,17z/data=!4m7!3m6!1s0x3be7fb9e2840e1e7:0x947b470500e4a37!8m2!3d18.9549237!4d73.3134369!15sChJiaGl2cHVyaSB3YXRlcmZhbGySARJ0b3VyaXN0X2F0dHJhY3Rpb27gAQA!16s%2Fg%2F11rn22yp15',
  source_reference = 'Google Maps place pin supplied by the project owner',
  last_verified_at = now()
where slug = 'bhivpuri-waterfalls';
