-- Deliver notification inserts to the authenticated recipient's active browser
-- session. RLS on user_notifications remains the access boundary.
alter publication supabase_realtime add table public.user_notifications;
