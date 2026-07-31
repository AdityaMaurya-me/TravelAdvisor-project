"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import SearchBar from "@/components/search/search-bar";
import { PageContainer } from "@/components/layout/page-container";

const POPULAR_SEARCHES = [
  { label: "Lonavala", href: "/search/lonavala" },
  { label: "Mumbai → Lonavala", href: "/route/mumbai-to-lonavala" },
  { label: "Waterfalls near Pune", href: "/search/waterfalls-near-pune" },
  { label: "Breakfast Stops", href: "/search/breakfast-stops" },
  { label: "Hidden Places", href: "/search/hidden-places" },
];

export function Hero() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query) router.push(`/search/${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative overflow-hidden">
      <PageContainer>
        <div className="relative min-h-168 overflow-hidden md:min-h-176 xl:min-h-184">
          <Image src="/hero-travel-v2.png" alt="Monsoon road through the Sahyadri mountains" width={1920} height={1080} priority className="absolute inset-0 h-full w-full object-cover" />
          <div className="travel-hero-overlay pointer-events-none absolute inset-0 bg-linear-to-r from-[#06111d]/95 via-[#06111d]/72 to-[#06111d]/20" />
          {/* <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#06111d]/65 via-transparent to-transparent" /> */}
          <div className="travel-hero-fade pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,#07111e_0%,rgba(7,17,30,.97)_10%,rgba(7,17,30,.76)_25%,rgba(7,17,30,.28)_43%,transparent_58%)]" />
          <div className="relative z-10 flex min-h-168 py-12 md:min-h-176 md:py-16 xl:min-h-184 xl:py-20">
            <div className="w-full max-w-7xl px-6 md:px-12 lg:px-20 xl:px-28">
              <h1 className="travel-hero-title max-w-6xl text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl xl:text-7xl 2xl:text-8xl">Discover Every Place Worth Stopping For</h1>
              <p className="travel-hero-copy mt-5 max-w-2xl text-lg leading-8 text-white/80 xl:text-xl">Search any place, route, or experience and find attractions, food, hidden gems, and more.</p>
              <div className="mt-8 w-full max-w-4xl"><SearchBar value={searchQuery} onChange={setSearchQuery} onSubmit={handleSearch} onPlaceSelect={(place) => router.push(`/discover/${encodeURIComponent(place.id)}?from=/&fromLabel=Back%20to%20home`)} /></div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {POPULAR_SEARCHES.map((item) => <Link key={item.label} href={item.href} className="travel-hero-chip rounded-full border border-white/10 bg-white/10 px-6 py-2 text-sm text-white transition-colors duration-200 hover:bg-white/20">{item.label}</Link>)}
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
