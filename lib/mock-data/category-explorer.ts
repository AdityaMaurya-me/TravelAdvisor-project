import { createClient } from "@/lib/supabase/server";

export interface CategoryExplorerPlace {
  id: string;
  slug: string;
  title: string;
  location: string;
  description: string;
  image: string;
  rating: number | null;
  reviewCount: number | null;
  distance: string;
  googlePhotoName?: string;
  googlePhotoAuthor?: string;
  googleRatingCheckedAt?: string;
}

export interface CategoryExplorer {
  slug: string;
  title: string;
  heading: string;
  description: string;
  placeCount: number;
  accent: string;
  places: CategoryExplorerPlace[];
  destination?: { slug: string; title: string };
}

const CATEGORY_COPY: Record<string, { heading: string; description: string }> = {
  waterfalls: {
    heading: "Waterfalls Near You",
    description: "Chase misty cascades, forest pools, and monsoon viewpoints.",
  },
  cafes: { heading: "Cafés Worth the Detour", description: "Slow mornings, great coffee, and memorable views." },
  forts: { heading: "Forts Near You", description: "Historic climbs, expansive views, and stories from the Sahyadris." },
  viewpoints: { heading: "Viewpoints Near You", description: "Wide horizons, golden-hour hills, and photo-worthy stops." },
  "local-food": { heading: "Local Food Near You", description: "Regional favourites, roadside classics, and must-try flavours." },
  temples: { heading: "Temples Near You", description: "Quiet heritage spaces and meaningful local landmarks." },
  "road-trips": { heading: "Road Trips Near You", description: "Routes that turn the journey into the best part of the weekend." },
  camping: { heading: "Camping Near You", description: "Starry nights, lakeside tents, and a break from the city." },
};

const defaultCopy = (title: string) => ({
  heading: `${title} Near You`,
  description: "Discover memorable places for your next journey.",
});

function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toExplorerPlace(place: any): CategoryExplorerPlace {
  return {
    id: place.slug,
    slug: place.slug,
    title: place.name,
    location: [place.city, place.state].filter(Boolean).join(", ") || place.address || "Maharashtra",
    description: place.description ?? "More details coming soon.",
    image: place.cover_image || "/placeholder.jpg",
    rating: numericOrNull(place.rating),
    reviewCount: numericOrNull(place.review_count),
    distance: "Explore nearby",
    googlePhotoName: place.googlePhotoName,
    googlePhotoAuthor: place.googlePhotoAuthor,
  };
}

export async function getCategoryExplorer(slug: string, destinationSlug?: string): Promise<CategoryExplorer | null> {
  const supabase = await createClient();
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name")
    .eq("slug", slug)
    .single();

  if (categoryError || !category) return null;

  let destination: { id: string; slug: string; name: string } | null = null;
  if (destinationSlug) {
    const { data } = await supabase
      .from("places")
      .select("id, slug, name")
      .eq("slug", destinationSlug)
      .eq("level", "city")
      .maybeSingle();
    destination = data;
  }

  const { data: mappings } = await supabase
    .from("place_categories")
    .select("places(slug, name, city, state, address, description, cover_image, rating, review_count, google_rating, google_rating_count, google_rating_checked_at, is_published, is_external, parent_id, google_place_id)")
    .eq("category_id", category.id);

  const rawPlaces = (mappings ?? [])
    .map((mapping: any) => mapping.places)
    .filter((place: any) => place?.is_published && !place?.is_external && (!destination || place.parent_id === destination.id));
  const places = rawPlaces.map(toExplorerPlace)
    .sort((first, second) => first.title.localeCompare(second.title));
  const copy = CATEGORY_COPY[category.slug] ?? defaultCopy(category.name);

  return {
    slug: category.slug,
    title: category.name,
    heading: copy.heading,
    description: copy.description,
    placeCount: places.length,
    accent: "cyan",
    places,
    destination: destination ? { slug: destination.slug, title: destination.name } : undefined,
  };
}

export async function getCategoryExplorers(destinationSlug?: string): Promise<CategoryExplorer[]> {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("slug").order("name");
  const explorers = await Promise.all((categories ?? []).map((category) => getCategoryExplorer(category.slug, destinationSlug)));
  return explorers
    .filter((category): category is CategoryExplorer => Boolean(category))
    // A destination browser should only advertise categories that have
    // locations in that destination. The generic browser still shows every
    // category across the catalogue.
    .filter((category) => !destinationSlug || category.placeCount > 0);
}

export async function findCategoryFromSearch(query: string) {
  const supabase = await createClient();
  const normalized = decodeURIComponent(query).trim().toLowerCase();
  const { data: categories } = await supabase.from("categories").select("slug, name");

  const aliases: Record<string, string> = { breakfast: "cafes", food: "local-food", hidden: "hidden-gems", "hidden-places": "hidden-gems" };
  const alias = Object.entries(aliases).find(([term]) => normalized.includes(term))?.[1];
  return (categories ?? []).find((category) => {
    const slug = category.slug.toLowerCase();
    const singular = slug.replace(/s$/, "");
    const name = category.name.toLowerCase();
    return category.slug === alias || normalized.includes(slug) || normalized.includes(singular) || normalized.includes(name);
  });
}

export async function findCategoryPlaceFromSearch(query: string) {
  const supabase = await createClient();
  const normalized = decodeURIComponent(query).trim().toLowerCase();
  if (!normalized) return undefined;

  const { data: places } = await supabase
    .from("places")
    .select("slug, name")
    .eq("is_published", true)
    .eq("level", "attraction");

  return (places ?? []).find((place) => {
    const name = place.name.toLowerCase();
    return normalized === place.slug || normalized === name || name.includes(normalized) || normalized.includes(name);
  });
}
