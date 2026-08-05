import Link from "next/link";

import { PlaceCard } from "@/components/cards/place-card";
import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { isGoogleDestinationPlace, type GooglePlace } from "@/lib/google-places";
import type { SearchResultSet } from "@/lib/mock-data/search";

function liveDestinationHref(place: GooglePlace, from: string, fromLabel: string) {
  const params = new URLSearchParams({ name: place.name, address: place.address, from, fromLabel, lat: String(place.latitude), lng: String(place.longitude) });
  return `/discover-destination/${encodeURIComponent(place.id)}?${params}`;
}

function livePlaceHref(place: GooglePlace, from: string, fromLabel: string) {
  const params = new URLSearchParams({ name: place.name, address: place.address, from, fromLabel, lat: String(place.latitude), lng: String(place.longitude) });
  return `/discover/${encodeURIComponent(place.id)}?${params}`;
}

export function SearchResultsPage({ query, results, googlePlaces = [] }: { query: string; results: SearchResultSet; googlePlaces?: GooglePlace[] }) {
  const hasResults = results.places.length > 0 || results.categories.length > 0 || googlePlaces.length > 0;
  const searchHref = `/search/${encodeURIComponent(query)}`;
  const liveDestinations = googlePlaces.filter(isGoogleDestinationPlace);
  const livePlaces = googlePlaces.filter((place) => !isGoogleDestinationPlace(place));

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-cyan-300">Search results</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Results for &ldquo;{decodeURIComponent(query)}&rdquo;</h1>
        {!hasResults ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8">
            <h2 className="text-xl font-semibold">No matching places yet</h2>
            <p className="mt-2 text-muted-foreground">Try a destination, a known place, or a category such as Waterfalls, Cafes, or Viewpoints.</p>
            {results.suggestion && <section className="mt-6"><p className="text-sm font-medium text-cyan-200">Did you mean?</p><div className="mt-3 max-w-xs"><PlaceCard place={results.suggestion} backHref={searchHref} backLabel="Back to search results" /></div></section>}
            <Link href="/categories" className="mt-5 inline-block text-cyan-300 hover:text-cyan-200">Explore categories</Link>
          </div>
        ) : (
          <>
            {results.categories.length > 0 && <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{results.categories.map((category) => <Link key={category.slug} href={`/categories/${category.slug}`} className="rounded-xl border border-border bg-card p-5 transition hover:border-cyan-400/60"><p className="text-xs text-cyan-300">{category.count} places</p><h2 className="mt-2 font-semibold">{category.title}</h2></Link>)}</div>}
            {results.places.length > 0 && <section className="mt-10"><h2 className="text-xl font-semibold">TravelAdvisor places</h2><div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{results.places.map((place) => <PlaceCard key={place.id} place={place} backHref={searchHref} backLabel="Back to search results" />)}</div></section>}
            {liveDestinations.length > 0 && (
              <section className="mt-10">
                <p className="text-sm font-medium text-cyan-300">Live destinations</p>
                <h2 className="mt-1 text-xl font-semibold">Explore an entire area</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{liveDestinations.map((place) => <Link key={place.id} href={liveDestinationHref(place, searchHref, "Back to search")} className="group rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-5 transition hover:border-cyan-400/70 hover:bg-cyan-400/10"><p className="text-xs font-medium uppercase tracking-wide text-cyan-300">Google destination</p><h3 className="mt-2 text-lg font-semibold group-hover:text-cyan-100">{place.name}</h3><p className="mt-2 min-h-10 text-sm text-muted-foreground">{place.address}</p><span className="mt-5 inline-block text-sm font-medium text-cyan-300">Browse places in this destination &rarr;</span></Link>)}</div>
              </section>
            )}
            {livePlaces.length > 0 && (
              <section className="mt-10">
                <p className="text-sm font-medium text-cyan-300">Live results</p>
                <h2 className="mt-1 text-xl font-semibold">More places from Google</h2>
                <p className="mt-1 text-sm text-muted-foreground">Live place data, not yet verified by TravelAdvisor.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {livePlaces.map((place) => (
                    <Link key={place.id} href={livePlaceHref(place, searchHref, "Back to search")} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-cyan-400/60 hover:bg-accent/40">
                      <p className="text-xs font-medium uppercase tracking-wide text-cyan-300">Google place</p>
                      <h3 className="mt-2 text-lg font-semibold group-hover:text-cyan-100">{place.name}</h3>
                      <p className="mt-2 min-h-10 text-sm text-muted-foreground">{place.address}</p>
                      <span className="mt-5 inline-block text-sm font-medium text-cyan-300">View destination details &rarr;</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}
