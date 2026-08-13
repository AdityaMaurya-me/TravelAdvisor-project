import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getGooglePlaceById } from "@/lib/google-places";

type GoogleRatingCandidate = {
  id: string;
  google_place_id: string;
};

const MIN_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 20;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Refreshes a deliberately small batch of exact Google Place matches.  This
 * endpoint is admin-only and persists only Google's aggregate rating/count;
 * it never copies review text.  Cached rows power every public card.
 */
export async function refreshGoogleRatingCache(batchSize = DEFAULT_BATCH_SIZE, placeId?: string) {
  const supabase = serviceClient();
  if (!supabase) return { refreshed: 0, skipped: 0, unavailable: true };

  const limit = Math.min(Math.max(Math.floor(batchSize), 1), MAX_BATCH_SIZE);
  const staleBefore = new Date(Date.now() - MIN_REFRESH_INTERVAL_MS).toISOString();
  let query = supabase
    .from("places")
    .select("id,google_place_id")
    .eq("is_published", true)
    .not("google_place_id", "is", null)
    .order("google_rating_checked_at", { ascending: true, nullsFirst: true });
  if (placeId) query = query.eq("id", placeId);
  else query = query.or(`google_rating_checked_at.is.null,google_rating_checked_at.lt.${staleBefore}`).limit(limit);

  const { data, error } = await query;

  if (error) throw new Error("Could not load Google rating refresh queue.");

  let refreshed = 0;
  let skipped = 0;
  for (const place of (data ?? []) as GoogleRatingCandidate[]) {
    const details = await getGooglePlaceById(place.google_place_id);
    if (details?.rating === undefined && details?.userRatingCount === undefined) {
      skipped += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("places")
      .update({
        google_rating: details.rating ?? null,
        google_rating_count: details.userRatingCount ?? null,
        google_rating_checked_at: new Date().toISOString(),
      })
      .eq("id", place.id);
    if (updateError) throw new Error("Could not save a Google rating snapshot.");
    refreshed += 1;
  }

  return { refreshed, skipped, unavailable: false };
}
