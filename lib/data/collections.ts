import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserCollections() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("collections")
    .select("id, title, description, is_public, created_at, collection_items(place_id, sort_order, added_at, places(id, slug, name, city, state, cover_image))")
    .eq("user_id", userId)
    .order("created_at");

  if (error) throw error;
  return data;
}
