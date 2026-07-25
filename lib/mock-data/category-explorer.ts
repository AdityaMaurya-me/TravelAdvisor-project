import { createClient } from "@/lib/supabase/server";

export interface CategoryExplorerPlace {
  id: string;
  slug: string;
  title: string;
  location: string;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  distance: string;
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

function toExplorerPlace(place: any): CategoryExplorerPlace {
  return {
    id: place.slug,
    slug: place.slug,
    title: place.name,
    location: [place.city, place.state].filter(Boolean).join(", ") || place.address || "Maharashtra",
    description: place.description ?? "More details coming soon.",
    image: place.cover_image || "/placeholder.jpg",
    rating: Number(place.rating ?? 0),
    reviewCount: Number(place.review_count ?? 0),
    distance: "Explore nearby",
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
    .select("places(slug, name, city, state, address, description, cover_image, rating, review_count, is_published, parent_id)")
    .eq("category_id", category.id);

  const places = (mappings ?? [])
    .map((mapping: any) => mapping.places)
    .filter((place: any) => place?.is_published && (!destination || place.parent_id === destination.id))
    .map(toExplorerPlace);
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

export async function getCategoryExplorers(): Promise<CategoryExplorer[]> {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("slug").order("name");
  const explorers = await Promise.all((categories ?? []).map((category) => getCategoryExplorer(category.slug)));
  return explorers.filter((category): category is CategoryExplorer => Boolean(category));
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
