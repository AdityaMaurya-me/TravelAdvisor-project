// import { notFound } from "next/navigation";
// import { DestinationDetails } from "@/components/sections/destination/destination-details";
// import { getDestinationBySearchQuery } from "@/lib/mock-data/destinations";

// interface SearchLocationPageProps {
//   params: Promise<{ location: string }>;
// }

// export default async function SearchLocationPage({
//   params,
// }: SearchLocationPageProps) {
//   const { location } = await params;
//   const destination = await getDestinationBySearchQuery(location);

//   if (!destination) {
//     notFound();
//   }

//   return <DestinationDetails destination={destination} />;
// }


import { notFound, redirect } from "next/navigation";
import { getDestinationBySearchQuery } from "@/lib/mock-data/destinations";
import { getCategoryBySlug } from "@/lib/mock-data/categories";
import { PlaceCard } from "@/components/cards/place-card";
import { findCategoryFromSearch, findCategoryPlaceFromSearch } from "@/lib/mock-data/category-explorer";
import { getSearchResults } from "@/lib/mock-data/search";
import { searchGooglePlaces } from "@/lib/google-places";
import { SearchResultsPage } from "@/components/sections/search/search-results-page";
import { createClient } from "@/lib/supabase/server";

interface SearchLocationPageProps {
  params: Promise<{ location: string }>;
}

export default async function SearchLocationPage({
  params,
}: SearchLocationPageProps) {
  const { location } = await params;
  const query = decodeURIComponent(location).trim();
  const supabase = await createClient();
  const { data: exactPlace } = await supabase.from("places").select("slug,level,name").eq("is_published", true).ilike("name", query).maybeSingle();
  if (exactPlace) redirect(exactPlace.level === "city" ? `/destination/${exactPlace.slug}` : `/place/${exactPlace.slug}`);

  // Static category route for the first front-end release. Database-backed
  // category results can replace this redirect later without changing URLs.
  const placeMatch = await findCategoryPlaceFromSearch(location);
  if (placeMatch) {
    redirect(`/place/${placeMatch.slug}`);
  }

  const categoryMatch = await findCategoryFromSearch(location);
  if (categoryMatch) {
    redirect(`/categories/${categoryMatch.slug}`);
  }

  const destination = await getDestinationBySearchQuery(location);
  if (destination) {
    redirect(`/destination/${destination.slug}`);
  }

  const category = await getCategoryBySlug(location);
  if (category) {
    return (
      <main className="min-h-screen bg-background px-4 py-24 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold text-white">{category.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {category.places.length > 0
              ? `${category.places.length} places tagged "${category.title}"`
              : "No places tagged with this category yet."}
          </p>

          {category.places.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {category.places.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  const [results, googlePlaces] = await Promise.all([getSearchResults(location), searchGooglePlaces(location)]);
  return <SearchResultsPage query={location} results={results} googlePlaces={googlePlaces} />;
}
