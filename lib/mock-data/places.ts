import type { PlacePreview } from "@/lib/mock-data/destinations";
import { createClient } from "@/lib/supabase/server";
import { getPlaceMapMarker, type DetailMapMarker } from "@/lib/data/detail-maps";
import { getGooglePlaceById } from "@/lib/google-places";

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
  /** Canonical card image. Detail pages always lead with this same image. */
  coverImage: string;
  images: string[];
  googlePhotoName?: string;
  googlePhotoAuthor?: string;
  facts: PlaceFact[];
  verifiedInfo: { openingHours?: string; entryFee?: string; websiteUrl?: string; phone?: string; sourceUrl?: string; sourceReference?: string; lastVerifiedAt?: string; hasParking?: boolean | null; hasWashroom?: boolean | null; isPetFriendly?: boolean | null; hasEvCharging?: boolean | null; typicalVisitMinutes?: number | null };
  nearbyPlaces: PlacePreview[];
  mapMarker: DetailMapMarker | null;
}

function hasRelatedGalleryCaption(
  caption: unknown,
  placeName: string,
  destinationName: string,
) {
  if (typeof caption !== "string") return false;
  const searchable = caption.toLocaleLowerCase();
  const placeWords = placeName.toLocaleLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 4);
  const destinationWords = destinationName.toLocaleLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 4);

  // A gallery upload without a meaningful caption cannot be verified as this
  // place. Hiding it is safer than showing an unrelated landmark photograph.
  return [...placeWords, ...destinationWords].some((word) => searchable.includes(word));
}

/**
 * Saved Google listings are deliberately kept out of curated browse data.
 * Resolve them before rendering a curated place card so a collection never
 * sends visitors to an attraction page with an empty destination relationship.
 */
export async function getExternalGooglePlaceBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("places")
    .select("google_place_id, canonical:canonical_place_id(slug)")
    .eq("slug", slug)
    .eq("is_external", true)
    .maybeSingle();

  if (!data?.google_place_id) return null;
  return {
    googlePlaceId: data.google_place_id as string,
    canonicalSlug: (data.canonical as { slug?: string } | null)?.slug ?? null,
  };
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
    .select("url, alt_text")
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
  const googlePlace = typeof (place as any).google_place_id === "string"
    ? await getGooglePlaceById((place as any).google_place_id)
    : null;

  const coverImage = typeof place.cover_image === "string" && place.cover_image.trim()
    ? place.cover_image.trim()
    : "/placeholder.jpg";
  const galleryImages = (images ?? [])
    .filter((image) => typeof image.url === "string" && image.url.trim())
    .filter((image) => hasRelatedGalleryCaption(image.alt_text, place.name, destinationTitle))
    .map((image) => image.url.trim());
  const displayImages = [...new Set([coverImage, ...galleryImages])];

  return {
    id: place.id,
    slug: place.slug,
    title: place.name,
    destinationSlug,
    destinationTitle,
    description: place.description ?? "",
    coverImage,
    images: displayImages,
    googlePhotoName: googlePlace?.photo?.name,
    googlePhotoAuthor: googlePlace?.photo?.authorName,
    facts,
    verifiedInfo: { openingHours: (place as any).opening_hours ?? undefined, entryFee: (place as any).entry_fee ?? undefined, websiteUrl: (place as any).website_url ?? undefined, phone: (place as any).phone ?? undefined, sourceUrl: (place as any).source_url ?? undefined, sourceReference: (place as any).source_reference ?? undefined, lastVerifiedAt: (place as any).last_verified_at ?? undefined, hasParking: (place as any).has_parking, hasWashroom: (place as any).has_washroom, isPetFriendly: (place as any).is_pet_friendly, hasEvCharging: (place as any).has_ev_charging, typicalVisitMinutes: (place as any).typical_visit_minutes },
    nearbyPlaces,
    mapMarker,
  };
}
