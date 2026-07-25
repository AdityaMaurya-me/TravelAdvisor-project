import { createClient } from "@/lib/supabase/server";

export async function searchPublishedPlaces(query: string) {
  const supabase = await createClient();
  const term = query.trim();
  if (!term) return [];

  const { data, error } = await supabase
    .from("places")
    .select("id, slug, name, city, state, cover_image, rating, review_count, description")
    .eq("is_published", true)
    .or(`name.ilike.%${term}%,slug.ilike.%${term}%,city.ilike.%${term}%`)
    .limit(24);

  if (error) throw error;
  return data;
}

export async function listCommunityPlaceOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("places")
    .select("id, name")
    .eq("is_published", true)
    .eq("level", "attraction")
    .order("name");

  if (error) throw error;
  return data;
}
