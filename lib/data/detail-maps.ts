import { createClient } from "@/lib/supabase/server";

export type DetailMapMarker = {
  id: string;
  slug: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  rating: number | null;
};

function toMarker(row: any): DetailMapMarker | null {
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    locationLabel: row.location_label,
    latitude,
    longitude,
    rating: row.rating === null ? null : Number(row.rating),
  };
}

export async function getDestinationMapMarkers(destinationId: string): Promise<DetailMapMarker[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("v_place_map_marker")
    .select("id, slug, name, location_label, rating, latitude, longitude")
    .eq("parent_id", destinationId)
    .order("name")
    .limit(200);

  if (error || !data) return [];
  return data.flatMap((row: any) => {
    const marker = toMarker(row);
    return marker ? [marker] : [];
  });
}

export async function getPlaceMapMarker(placeId: string): Promise<DetailMapMarker | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("v_place_map_marker")
    .select("id, slug, name, location_label, rating, latitude, longitude")
    .eq("id", placeId)
    .maybeSingle();

  if (error || !data) return null;
  return toMarker(data);
}
