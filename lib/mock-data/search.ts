import { createClient } from "@/lib/supabase/server";
import type { PlacePreview } from "@/lib/mock-data/destinations";

export interface SearchResultSet {
  places: PlacePreview[];
  categories: Array<{ slug: string; title: string; count: number }>;
  suggestion?: PlacePreview;
}

const INTENT_ALIASES: Record<string, string[]> = {
  breakfast: ["cafes"],
  food: ["cafes", "local-food"],
  hidden: ["hidden-gems"],
  "hidden-places": ["hidden-gems"],
};

const editDistance = (left: string, right: string) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex];
      row[rightIndex] = Math.min(row[rightIndex] + 1, row[rightIndex - 1] + 1, previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[right.length];
};

const similarity = (query: string, candidate: string) => {
  const normalizedCandidate = candidate.toLowerCase();
  const bestCandidate = [normalizedCandidate, ...normalizedCandidate.split(/[^a-z0-9]+/)].reduce((best, item) => Math.max(best, 1 - editDistance(query, item) / Math.max(query.length, item.length, 1)), 0);
  return bestCandidate;
};

export async function getSearchResults(query: string): Promise<SearchResultSet> {
  const supabase = await createClient();
  const normalized = decodeURIComponent(query).trim().toLowerCase();
  const terms = normalized.split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const { data: allPlaces } = await supabase
    .from("places")
    .select("slug, name, city, state, cover_image, description, is_published, place_categories(categories(slug, name))")
    .eq("is_published", true);
  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, slug, name, place_categories(place_id)");

  const placePreviews = (allPlaces ?? []).map((place: any) => ({
    id: place.slug,
    title: place.name,
    location: [place.city, place.state].filter(Boolean).join(", "),
    image: place.cover_image || "/placeholder.jpg",
    href: `/place/${place.slug}`,
    description: place.description ?? undefined,
    categories: (place.place_categories ?? []).map((item: any) => item.categories).filter(Boolean),
  }));
  const places = placePreviews
    .filter((place) => {
      const haystack = [place.title, place.location, place.description, ...place.categories.flatMap((category: any) => [category.slug, category.name])].filter(Boolean).join(" ").toLowerCase();
      return terms.length > 0 && terms.every((term) => haystack.includes(term));
    })
    .map(({ categories: _categories, ...place }) => place);

  const aliases = Object.entries(INTENT_ALIASES)
    .filter(([intent]) => normalized.includes(intent))
    .flatMap(([, slugs]) => slugs);
  const categories = (allCategories ?? [])
    .filter((category: any) => aliases.includes(category.slug) || terms.some((term) => category.slug.includes(term) || category.name.toLowerCase().includes(term)))
    .map((category: any) => ({ slug: category.slug, title: category.name, count: category.place_categories?.length ?? 0 }));

  const suggestion = places.length === 0 && categories.length === 0 && normalized.length >= 3
    ? placePreviews.map(({ categories: _categories, ...place }) => ({ place, score: similarity(normalized, place.title) })).sort((left, right) => right.score - left.score)[0]
    : undefined;

  return { places, categories, suggestion: suggestion && suggestion.score >= 0.55 ? suggestion.place : undefined };
}
