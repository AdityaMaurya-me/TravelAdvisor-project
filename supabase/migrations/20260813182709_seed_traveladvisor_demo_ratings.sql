-- Demo-only catalogue scores let the project demonstrate sorting and rating
-- cards without claiming that paid Google review data has been imported.
-- The formula is deterministic per place, so a place keeps its score across
-- reseeds. Real community reviews can replace these values later.
update public.places
set
  rating = round((4.0 + ((('x' || substr(md5(id::text), 1, 4))::bit(16)::int % 10)::numeric / 10)), 1),
  review_count = 20 + (('x' || substr(md5(id::text), 5, 4))::bit(16)::int % 731)
where is_published = true
  and is_external = false;
