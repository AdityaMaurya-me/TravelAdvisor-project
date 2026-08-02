"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Clock3, MapPin, Navigation, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";

import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { CategoryExplorer } from "@/lib/mock-data/category-explorer";

export function CategoryExplorerPage({ category }: { category: CategoryExplorer }) {
  const [filter, setFilter] = useState<"all" | "rating" | "reviews">("all");
  const categoryHref = `/categories/${category.slug}${category.destination ? `?destination=${encodeURIComponent(category.destination.slug)}` : ""}`;

  const visiblePlaces = useMemo(() => {
    const places = [...category.places];
    if (filter === "rating") return places.filter((place) => place.rating >= 4.5).sort((a, b) => b.rating - a.rating);
    if (filter === "reviews") return places.sort((a, b) => b.reviewCount - a.reviewCount);
    return places;
  }, [category.places, filter]);

  const filters = [
    { id: "all" as const, label: `All (${category.placeCount})` },
    { id: "rating" as const, label: "Top rated (4.5+)" },
    { id: "reviews" as const, label: "Most reviewed" },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="hover:text-cyan-300">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/categories" className="hover:text-cyan-300">Categories</Link>
          {category.destination && <><ChevronRight className="h-3.5 w-3.5" /><Link href={`/destination/${category.destination.slug}`} className="hover:text-cyan-300">{category.destination.title}</Link></>}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-200">{category.title}</span>
        </nav>

        <header className="mt-5">
          <p className="text-sm font-medium text-cyan-300">Explore by category</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-5xl">{category.destination ? `${category.title} in ${category.destination.title}` : category.heading}</h1>
          <p className="mt-3 text-slate-400">{category.placeCount} places in Maharashtra · {category.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-full border px-4 py-2 text-sm transition-colors ${filter === item.id ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(380px,1.04fr)]">
          <section aria-label={`${category.title} places`} className="space-y-3">
            {visiblePlaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8">
                <h2 className="text-lg font-semibold">{category.places.length === 0 ? "Places are being added" : "No places match this filter"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{category.places.length === 0 ? `We have not published any ${category.title.toLowerCase()} places yet. Explore another category or check back soon.` : "Try a different filter to see every available place in this category."}</p>
                {category.places.length === 0 ? <Link href="/categories" className="mt-5 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-200">Browse all categories</Link> : <button type="button" onClick={() => setFilter("all")} className="mt-5 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-200">Show all places</button>}
              </div>
            ) : visiblePlaces.map((place, index) => (
              <Link key={place.id} href={`/place/${place.slug}?from=${encodeURIComponent(categoryHref)}&fromLabel=Back%20to%20${encodeURIComponent(category.destination ? `${category.title} in ${category.destination.title}` : category.title)}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111e]">
              <article className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-2 transition hover:border-cyan-500/50">
                <div className="flex gap-4">
                  <Image src={place.image} alt="" width={150} height={120} className="h-28 w-32 rounded-xl object-cover sm:w-40" />
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-white sm:text-lg">{place.title}</h2>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5" />{place.location}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />{index === 0 ? "140 min" : `${65 + index * 20} min`}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-300">{place.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-amber-300"><Star className="h-3.5 w-3.5 fill-current" />{place.rating}</span>
                      <span>{place.reviewCount} reviews</span><span>·</span><span>{place.distance}</span>
                    </div>
                  </div>
                  <ChevronRight className="mr-2 mt-4 hidden h-5 w-5 text-slate-500 sm:block" />
                </div>
              </article>
              </Link>
            ))}
          </section>

          <aside className="relative min-h-100 overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-24 lg:h-[520px]">
            <Image src="/hero-bg.jpg" alt="Map preview of the Pune and Lonavala region" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover opacity-35 saturate-50" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_42%,rgba(6,182,212,.25),transparent_28%),linear-gradient(135deg,rgba(5,20,35,.55),rgba(10,40,56,.85))]" />
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-lg bg-slate-950/75 px-3 py-2 text-sm font-medium backdrop-blur"><Search className="h-4 w-4 text-slate-400" />Map preview</div>
            <div className="absolute right-5 top-5 flex items-center gap-2 rounded-lg bg-slate-950/75 px-3 py-2 text-xs text-slate-200 backdrop-blur"><Navigation className="h-3.5 w-3.5" />My location</div>
            {[[27, 26], [48, 37], [62, 24], [69, 57], [43, 68], [79, 71], [33, 53]].slice(0, visiblePlaces.length).map(([left, top], index) => {
              const place = visiblePlaces[index];
              return <Link key={place.id} aria-label={`Open ${place.title}`} href={`/place/${place.slug}?from=${encodeURIComponent(categoryHref)}&fromLabel=Back%20to%20${encodeURIComponent(category.destination ? `${category.title} in ${category.destination.title}` : category.title)}`} className="absolute grid h-9 w-9 place-items-center rounded-full border-2 border-white/70 bg-cyan-500 text-xs font-bold shadow-lg shadow-cyan-950/80 transition hover:scale-110" style={{ left: `${left}%`, top: `${top}%` }}><MapPin className="h-4 w-4" /></Link>;
            })}
            <p className="absolute bottom-5 left-5 rounded-lg bg-slate-950/75 px-3 py-2 text-sm text-slate-200 backdrop-blur">Pune · Lonavala · Karjat</p>
          </aside>
        </div>

        <section className="mt-12">
          <div className="flex items-end justify-between"><div><h2 className="text-2xl font-bold">Explore similar categories</h2><p className="mt-1 text-sm text-slate-400">More ways to plan your next stop.</p></div><Link href="/categories" className="text-sm text-cyan-300 hover:text-cyan-200">View all</Link></div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[{ title: "Forts", slug: "forts" }, { title: "Cafés", slug: "cafes" }, { title: "Viewpoints", slug: "viewpoints" }, { title: "Camping", slug: "camping" }, { title: "Local food", slug: "local-food" }].map((item, index) => <Link key={item.slug} href={`/categories/${item.slug}`} className="group relative h-32 overflow-hidden rounded-xl border border-slate-800"><Image src={`/attraction-${(index % 4) + 1}.png`} alt="" fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover opacity-55 transition group-hover:scale-105" /><span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950 to-transparent px-3 pb-3 pt-8 text-sm font-semibold">{item.title}</span></Link>)}
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
