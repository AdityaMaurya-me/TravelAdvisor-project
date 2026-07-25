# Supabase backend

This folder tracks all schema changes made after the initial remote project setup.

- `migrations/` contains ordered, applied SQL migrations.
- `seed.sql` is reserved for reproducible local-only sample data; production content is never seeded automatically.
- `lib/supabase/` contains typed browser, server, and session-refresh clients.
- `app/actions/` contains the authenticated mutation boundary used by the UI.

The initial remote database migrations were created before this local folder existed. Their remote history is retained in the Supabase project; all subsequent changes are tracked here. `schema-baseline.sql` is the read-only export of that existing public schema and serves as its local backup.

## Current data model

- Catalogue: `places`, `categories`, `place_categories`, `place_images`, and `place_relations` provide one canonical record for every destination and place card.
- Journeys: `routes`, `route_stops`, and `saved_routes` back route discovery and saved itineraries.
- Personal data: `profiles`, `collections`, and `collection_items` support account-specific saves and custom collections.
- Community: `community_tips`, comments, votes, reports, and `reviews` cover user posts, moderation, and place-specific discussions.

All public catalogue data is readable without signing in. User-owned writes are protected by RLS ownership policies. Curated place data now covers Goa, Lonavala, Manali, Mumbai, Munnar, and Udaipur; reviews and community activity remain real user-generated data rather than fabricated seed records.

## One-time repository sync

To capture the initial remote schema as a local baseline, authenticate the Supabase CLI and run:

```powershell
cmd /c npx supabase login
cmd /c npx supabase link --project-ref gzkpnugqdyozzkppxcsn
cmd /c npx supabase db pull baseline_schema --linked --schema public --yes
```

`db pull` needs Docker Desktop running because the Supabase CLI creates a temporary local shadow database while it compares schemas. This is non-destructive: it writes a migration snapshot locally. Do not run `db reset --linked` against this project because it would erase remote data.
