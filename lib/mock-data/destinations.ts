import { createClient } from "@/lib/supabase/server";
import { getDestinationMapMarkers, type DetailMapMarker } from "@/lib/data/detail-maps";
import { getGooglePlaceById } from "@/lib/google-places";

export type DestinationFactIcon =
  | "route"
  | "calendar"
  | "wallet";

export type DestinationCategoryIcon =
  | "landmark"
  | "viewpoint"
  | "gem"
  | "waterfall"
  | "cafe"
  | "food"
  | "temple"
  | "camera";

export interface DestinationFact {
  label: string;
  value: string;
  detail: string;
  icon: DestinationFactIcon;
}

export interface DestinationCategory {
  id: string;
  title: string;
  placeCount: number;
  icon: DestinationCategoryIcon;
  href: string;
}

export interface PlacePreview {
  id: string;
  title: string;
  location: string;
  image: string;
  href: string;
  distance?: string;
  description?: string;
  googlePhotoName?: string;
  googlePhotoAuthor?: string;
}

export interface DestinationDetail {
  slug: string;
  title: string;
  location: string;
  description: string;
  image: string;
  rating: number | null;
  reviewCount: number | null;
  facts: DestinationFact[];
  categories: DestinationCategory[];
  routePlaces: PlacePreview[];
  communityFavorites: PlacePreview[];
  mapPlaces: DetailMapMarker[];
  routeHref?: string;
  /** Live destination records use the same page shell but are not curated. */
  isLive?: boolean;
  googlePlaceId?: string;
  googlePhotoName?: string;
  googlePhotoAuthor?: string;
  browseCategoriesHref?: string;
  livePlacesHref?: string;
  livePlaces?: PlacePreview[];
}

export interface DestinationSummary {
  id: string;
  title: string;
  location: string;
  image: string;
  rating: number | null;
  reviewCount: number | null;
  href: string;
  googlePhotoName?: string;
  googlePhotoAuthor?: string;
}

// ------------------------------------------------------------
// Icon lookup — the DB just stores a plain slug/icon string
// (e.g. "waterfall"), this maps it to the union type the UI expects.
// ------------------------------------------------------------
const CATEGORY_ICON_MAP: Record<string, DestinationCategoryIcon> = {
  attractions: "landmark",
  viewpoints: "viewpoint",
  "hidden-gems": "gem",
  waterfalls: "waterfall",
  cafes: "cafe",
  "local-food": "food",
  temples: "temple",
  "photo-spots": "camera",
};

/**
 * Replaces the old static DESTINATION_SUMMARIES array.
 * Powers homepage "Trending Destinations" and any destination-picker list.
 */
export async function getDestinationSummaries(): Promise<DestinationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("places")
    .select("id,slug,name,city,state,country,cover_image,google_place_id")
    .eq("level", "city")
    .eq("is_published", true)
    .eq("is_external", false)
    .order("name");

  if (error || !data) return [];

  return Promise.all(data.map(async (row) => {
    const googlePlace = typeof row.google_place_id === "string" ? await getGooglePlaceById(row.google_place_id) : null;
    return {
      id: row.slug ?? "",
      title: row.name ?? "Untitled destination",
      location: [row.city, row.state, row.country].filter(Boolean).join(", "),
      image: row.cover_image ?? "/placeholder.jpg",
      rating: googlePlace?.rating ?? null,
      reviewCount: googlePlace?.userRatingCount ?? null,
      href: `/destination/${row.slug ?? ""}`,
      googlePhotoName: googlePlace?.photo?.name,
      googlePhotoAuthor: googlePlace?.photo?.authorName,
    };
  }));
}

/**
 * Replaces the old getDestinationBySlug — now hits Supabase instead of
 * the static mock array. Returns null instead of a fallback object when
 * the destination doesn't exist, so the page can 404 properly.
 */
export async function getDestinationBySlug(slug: string): Promise<DestinationDetail | null> {
  const supabase = await createClient();
  // 1. Core place row
  const { data: place, error: placeError } = await supabase
    .from("places")
    .select("*")
    .eq("slug", slug)
    .eq("level", "city")
    .single();

  if (placeError || !place) return null;
  const googlePlace = typeof place.google_place_id === "string" ? await getGooglePlaceById(place.google_place_id) : null;

  // 2. Category counts scoped to this destination's attractions
  const { data: taggedPlaces } = await supabase
    .from("places")
    .select("id, place_categories(category_id, categories(slug, name, icon))")
    .eq("parent_id", place.id)
    .eq("level", "attraction")
    .eq("is_published", true)
    .eq("is_external", false);

  const categoryCounts = new Map<string, { title: string; icon: string; count: number }>();
  (taggedPlaces ?? []).forEach((p: any) => {
    (p.place_categories ?? []).forEach((pc: any) => {
      const cat = pc.categories;
      if (!cat) return;
      const existing = categoryCounts.get(cat.slug);
      if (existing) {
        existing.count += 1;
      } else {
        categoryCounts.set(cat.slug, { title: cat.name, icon: cat.icon, count: 1 });
      }
    });
  });

  const categories: DestinationCategory[] = Array.from(categoryCounts.entries()).map(
    ([slugKey, val]) => ({
      id: slugKey,
      title: val.title,
      placeCount: val.count,
      icon: CATEGORY_ICON_MAP[slugKey] ?? "landmark",
      href: `/categories/${slugKey}?destination=${encodeURIComponent(place.slug)}`,
    })
  ).sort((first, second) => first.title.localeCompare(second.title));

  // 3. Places that belong to this destination (children in the hierarchy)
  const { data: children } = await supabase
    .from("places")
    .select("slug, name, cover_image, google_place_id")
    .eq("parent_id", place.id)
    .eq("level", "attraction")
    .eq("is_published", true)
    .eq("is_external", false)
    .order("name");

  const toPreview = async (row: any): Promise<PlacePreview> => {
    const googlePlace = typeof row.google_place_id === "string" ? await getGooglePlaceById(row.google_place_id) : null;
    return {
    id: row.slug,
    title: row.name,
    location: place.name,
    image: row.cover_image || "/placeholder.jpg",
    href: `/place/${row.slug}`,
    googlePhotoName: googlePlace?.photo?.name,
    googlePhotoAuthor: googlePlace?.photo?.authorName,
  };
  };

  const allChildren = await Promise.all((children ?? []).map(toPreview));
  const [{ data: route }, mapPlaces] = await Promise.all([
    supabase
    .from("routes")
    .select("slug")
    .eq("end_place_id", place.id)
    .limit(1)
    .maybeSingle(),
    getDestinationMapMarkers(place.id),
  ]);

  return {
    slug: place.slug,
    title: place.name,
    location: [place.city, place.state].filter(Boolean).join(", "),
    description: place.description ?? "",
    image: place.cover_image ?? "/placeholder.jpg",
    rating: googlePlace?.rating ?? null,
    reviewCount: googlePlace?.userRatingCount ?? null,
    facts: [
      { label: "Distance", value: "Plan your route", detail: "From your location", icon: "route" },
      { label: "Best season", value: "Seasonal", detail: "Explore monthly highlights", icon: "calendar" },
      { label: "Typical budget", value: "Varies", detail: "Based on your plans", icon: "wallet" },
    ],
    // Categories on a verified destination are strictly its published child
    // places. Mixing in a live Google search here made one destination's
    // category cards lead to the generic catalogue and appear to change.
    categories,
    routePlaces: allChildren.slice(0, 4),
    communityFavorites: allChildren.slice(0, 4),
    mapPlaces,
    routeHref: route ? `/route/${route.slug}` : undefined,
    googlePhotoName: googlePlace?.photo?.name,
    googlePhotoAuthor: googlePlace?.photo?.authorName,
  };
}

export async function getDestinationBySearchQuery(query: string): Promise<DestinationDetail | null> {
  const slug = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return getDestinationBySlug(slug);
}
