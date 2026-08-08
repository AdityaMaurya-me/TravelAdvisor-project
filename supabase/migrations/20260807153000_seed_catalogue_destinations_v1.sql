-- Catalogue expansion v1: destination foundations.
-- The existing database already contains Goa, Lonavala, Manali, Mumbai,
-- Munnar, and Udaipur.  This migration makes the initial destination
-- catalogue 20 records wide. Individual places are intentionally added in
-- source-backed curation batches; a destination must not imply that every
-- nearby search result has already been verified by TravelAdvisor.

insert into public.places (
  slug, name, level, city, state, country, location, description,
  source_url, source_reference, is_published
)
values
  ('pune', 'Pune', 'city', 'Pune', 'Maharashtra', 'India', st_setsrid(st_makepoint(73.8567, 18.5204), 4326)::geography, 'A cultural and food-focused base for historic landmarks, hill escapes, museums, cafés, and road trips across western Maharashtra.', 'https://www.incredibleindia.gov.in/en/maharashtra/pune', 'Incredible India destination reference', true),
  ('delhi', 'Delhi', 'city', 'New Delhi', 'Delhi', 'India', st_setsrid(st_makepoint(77.1025, 28.7041), 4326)::geography, 'A city destination for heritage monuments, museums, markets, gardens, cafés, and food trails.', 'https://www.incredibleindia.gov.in/en/delhi', 'Incredible India destination reference', true),
  ('jaipur', 'Jaipur', 'city', 'Jaipur', 'Rajasthan', 'India', st_setsrid(st_makepoint(75.7873, 26.9124), 4326)::geography, 'A heritage destination for forts, palaces, museums, bazaars, traditional food, and photo walks.', 'https://www.incredibleindia.gov.in/en/rajasthan/jaipur', 'Incredible India destination reference', true),
  ('bengaluru', 'Bengaluru', 'city', 'Bengaluru', 'Karnataka', 'India', st_setsrid(st_makepoint(77.5946, 12.9716), 4326)::geography, 'A city destination for gardens, heritage sites, cafés, food neighbourhoods, and nearby nature breaks.', 'https://www.incredibleindia.gov.in/en/karnataka/bengaluru', 'Incredible India destination reference', true),
  ('hyderabad', 'Hyderabad', 'city', 'Hyderabad', 'Telangana', 'India', st_setsrid(st_makepoint(78.4867, 17.3850), 4326)::geography, 'A city destination for historic landmarks, museums, food experiences, lakes, and cultural neighbourhoods.', 'https://www.incredibleindia.gov.in/en/telangana/hyderabad', 'Incredible India destination reference', true),
  ('kolkata', 'Kolkata', 'city', 'Kolkata', 'West Bengal', 'India', st_setsrid(st_makepoint(88.3639, 22.5726), 4326)::geography, 'A destination for colonial architecture, art, riverside walks, markets, cafés, and Bengali food.', 'https://www.incredibleindia.gov.in/en/west-bengal/kolkata', 'Incredible India destination reference', true),
  ('ahmedabad', 'Ahmedabad', 'city', 'Ahmedabad', 'Gujarat', 'India', st_setsrid(st_makepoint(72.5714, 23.0225), 4326)::geography, 'A destination for UNESCO heritage, stepwells, museums, riverfront walks, food, and craft traditions.', 'https://www.incredibleindia.gov.in/en/gujarat/ahmedabad', 'Incredible India destination reference', true),
  ('chandigarh', 'Chandigarh', 'city', 'Chandigarh', 'Chandigarh', 'India', st_setsrid(st_makepoint(76.7794, 30.7333), 4326)::geography, 'A planned-city destination for architecture, gardens, lakeside walks, museums, and gateway road trips.', 'https://www.incredibleindia.gov.in/en/chandigarh', 'Incredible India destination reference', true),
  ('rishikesh', 'Rishikesh', 'city', 'Rishikesh', 'Uttarakhand', 'India', st_setsrid(st_makepoint(78.2676, 30.0869), 4326)::geography, 'A Himalayan gateway for riverside walks, temples, yoga, rafting, cafés, and scenic viewpoints.', 'https://www.incredibleindia.gov.in/en/uttarakhand/rishikesh', 'Incredible India destination reference', true),
  ('varanasi', 'Varanasi', 'city', 'Varanasi', 'Uttar Pradesh', 'India', st_setsrid(st_makepoint(82.9739, 25.3176), 4326)::geography, 'A riverfront heritage destination for ghats, temples, walking routes, food, crafts, and cultural experiences.', 'https://www.incredibleindia.gov.in/en/uttar-pradesh/varanasi', 'Incredible India destination reference', true),
  ('darjeeling', 'Darjeeling', 'city', 'Darjeeling', 'West Bengal', 'India', st_setsrid(st_makepoint(88.2627, 27.0360), 4326)::geography, 'A hill destination for tea estates, mountain viewpoints, heritage rail, cafés, monasteries, and nature walks.', 'https://www.incredibleindia.gov.in/en/west-bengal/darjeeling', 'Incredible India destination reference', true),
  ('srinagar', 'Srinagar', 'city', 'Srinagar', 'Jammu and Kashmir', 'India', st_setsrid(st_makepoint(74.7973, 34.0837), 4326)::geography, 'A Kashmir valley destination for lakes, gardens, heritage, local food, and mountain viewpoints.', 'https://www.incredibleindia.gov.in/en/jammu-and-kashmir/srinagar', 'Incredible India destination reference', true),
  ('ooty', 'Ooty', 'city', 'Ooty', 'Tamil Nadu', 'India', st_setsrid(st_makepoint(76.6950, 11.4064), 4326)::geography, 'A Nilgiri hill destination for gardens, lakes, viewpoints, heritage rail, tea, and nature walks.', 'https://www.incredibleindia.gov.in/en/tamil-nadu/ooty', 'Incredible India destination reference', true),
  ('puducherry', 'Puducherry', 'city', 'Puducherry', 'Puducherry', 'India', st_setsrid(st_makepoint(79.8083, 11.9416), 4326)::geography, 'A coastal destination for promenade walks, heritage quarters, cafés, beaches, temples, and local food.', 'https://www.incredibleindia.gov.in/en/puducherry', 'Incredible India destination reference', true)
on conflict (slug) do update
set name = excluded.name,
    level = excluded.level,
    city = excluded.city,
    state = excluded.state,
    country = excluded.country,
    location = excluded.location,
    description = excluded.description,
    source_url = excluded.source_url,
    source_reference = excluded.source_reference,
    is_published = true,
    updated_at = now();
