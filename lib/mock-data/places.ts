import type { PlacePreview } from "@/lib/mock-data/destinations";
import { createClient } from "@/lib/supabase/server";
import { getPlaceMapMarker, type DetailMapMarker } from "@/lib/data/detail-maps";

export type PlaceFactIcon = "sunrise" | "ticket" | "clock" | "timer" | "camera";

export interface PlaceFact {
  label: string;
  value: string;
  icon: PlaceFactIcon;
}

export interface PlaceDetail {
  id: string;
  slug: string;
  title: string;
  /** Slug of the parent DestinationDetail this place belongs to — keeps the two pages linkable. */
  destinationSlug: string;
  destinationTitle: string;
  description: string;
  images: string[];
  facts: PlaceFact[];
  verifiedInfo: { openingHours?: string; entryFee?: string; websiteUrl?: string; phone?: string; sourceUrl?: string; sourceReference?: string; lastVerifiedAt?: string; hasParking?: boolean | null; hasWashroom?: boolean | null; isPetFriendly?: boolean | null };
  nearbyPlaces: PlacePreview[];
  mapMarker: DetailMapMarker | null;
}

/**
 * Replaces the old static getPlaceBySlug — now hits Supabase instead of
 * hardcoded fixtures. Returns null when the place doesn't exist so the
 * page can 404 properly.
 */
export async function getPlaceBySlug(
  slug: string,
  destinationSlugHint?: string
): Promise<PlaceDetail | null> {
  const supabase = await createClient();
  // 1. Core place row, joined with its parent destination's slug/name
  const { data: place, error } = await supabase
    .from("places")
    .select("*, parent:parent_id(slug, name)")
    .eq("slug", slug)
    .eq("level", "attraction")
    .single();

  if (error || !place) return null;

  const destinationSlug = (place.parent as any)?.slug ?? destinationSlugHint ?? "";
  const destinationTitle = (place.parent as any)?.name ?? "";

  // 2. Image gallery
  const { data: images } = await supabase
    .from("place_images")
    .select("url")
    .eq("place_id", place.id)
    .order("sort_order");

  // 3. Nearby places (from place_relations, relation_type = 'nearby')
  const { data: nearby } = await supabase
    .from("v_place_relations_card")
    .select("*")
    .eq("place_id", place.id)
    .eq("relation_type", "nearby")
    .order("sort_order");

  const nearbyPlaces: PlacePreview[] = (nearby ?? []).map((row: any) => ({
    id: row.slug,
    title: row.title,
    location: destinationTitle,
    image: row.image,
    href: `/place/${row.slug}`,
    distance: row.distance_km ? `${row.distance_km} km` : undefined,
  }));

  // Facts are stored as jsonb directly on the place row (see facts column)
  const facts: PlaceFact[] = Array.isArray(place.facts)
    ? place.facts.flatMap((fact) => {
        if (!fact || typeof fact !== "object" || Array.isArray(fact)) return [];
        const record = fact as Record<string, unknown>;
        if (typeof record.label !== "string" || typeof record.value !== "string" || typeof record.icon !== "string") return [];
        return [{ label: record.label, value: record.value, icon: record.icon as PlaceFactIcon }];
      })
    : [];

  const mapMarker = await getPlaceMapMarker(place.id);

  return {
    id: place.id,
    slug: place.slug,
    title: place.name,
    destinationSlug,
    destinationTitle,
    description: place.description ?? "",
    images: (images ?? []).map((img) => img.url),
    facts,
    verifiedInfo: { openingHours: (place as any).opening_hours ?? undefined, entryFee: (place as any).entry_fee ?? undefined, websiteUrl: (place as any).website_url ?? undefined, phone: (place as any).phone ?? undefined, sourceUrl: (place as any).source_url ?? undefined, sourceReference: (place as any).source_reference ?? undefined, lastVerifiedAt: (place as any).last_verified_at ?? undefined, hasParking: (place as any).has_parking, hasWashroom: (place as any).has_washroom, isPetFriendly: (place as any).is_pet_friendly },
    nearbyPlaces,
    mapMarker,
  };
}
