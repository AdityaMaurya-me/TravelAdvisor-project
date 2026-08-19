-- Preserve the UI-ready response shape so reopening an AI chat does not turn
-- a saved itinerary, shortlist, or comparison back into a plain paragraph.
alter table public.ai_messages
  add column if not exists response_data jsonb not null default '{}'::jsonb;
