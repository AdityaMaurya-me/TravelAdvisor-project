import Link from "next/link";

import { PlaceCard } from "@/components/cards/place-card";
import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import type { GooglePlace } from "@/lib/google-places";
import type { SearchResultSet } from "@/lib/mock-data/search";

export function SearchResultsPage({ query, results, googlePlaces = [] }: { query: string; results: SearchResultSet; googlePlaces?: GooglePlace[] }) {
  const hasResults = results.places.length > 0 || results.categories.length > 0 || googlePlaces.length > 0;
  const searchHref = `/search/${encodeURIComponent(query)}`;

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
            {googlePlaces.length > 0 && (
              <section className="mt-10">
                <p className="text-sm font-medium text-cyan-300">Live results</p>
                <h2 className="mt-1 text-xl font-semibold">More places from Google</h2>
                <p className="mt-1 text-sm text-muted-foreground">Live place data, not yet verified by TravelAdvisor.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {googlePlaces.map((place) => (
                    <Link key={place.id} href={`/discover/${encodeURIComponent(place.id)}?from=${encodeURIComponent(searchHref)}&fromLabel=Back%20to%20search`} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-cyan-400/60 hover:bg-accent/40">
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
