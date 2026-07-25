-- Ensure the existing RPC helpers do not resolve objects through a caller-
-- controlled search path.
alter function public.refresh_place_rating() set search_path = public, pg_temp;
alter function public.search_places(text, integer) set search_path = public, pg_temp;
alter function public.search_places_by_category_near(text, text, integer, integer) set search_path = public, pg_temp;
alter function public.search_places_nearby(double precision, double precision, integer, integer) set search_path = public, pg_temp;
alter function public.get_route(text, text) set search_path = public, pg_temp;

-- Foreign-key indexes for the user-content and route queries used by the app.
create index if not exists collections_user_created_idx on public.collections (user_id, created_at);
create index if not exists collection_items_place_idx on public.collection_items (place_id);
create index if not exists community_tips_user_idx on public.community_tips (user_id);
create index if not exists community_tip_comments_user_idx on public.community_tip_comments (user_id);
create index if not exists community_tip_votes_user_idx on public.community_tip_votes (user_id);
create index if not exists reviews_user_idx on public.reviews (user_id);
create index if not exists place_relations_related_place_idx on public.place_relations (related_place_id);
create index if not exists route_stops_place_idx on public.route_stops (place_id);
create index if not exists routes_start_place_idx on public.routes (start_place_id);
create index if not exists routes_end_place_idx on public.routes (end_place_id);
create index if not exists saved_routes_route_idx on public.saved_routes (route_id);
