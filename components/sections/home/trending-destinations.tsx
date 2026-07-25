// components/sections/home/trending-destinations.tsx

import { DestinationCard } from "@/components/cards/destination-card";

import { getDestinationSummaries } from "@/lib/mock-data/home";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export async function TrendingDestinations() {
  const destinations = await getDestinationSummaries();

  return (
    <section className="py-10">
        <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight px-10">
            Trending Destinations
          </h2>

          <p className="mt-2 text-muted-foreground px-10">
            Discover the most popular destinations this month
          </p>
        </div>

        <Link
          href="/destinations"
          className="
            flex
            items-center
            gap-1
            text-sm
            font-medium
            text-cyan-400
            transition-colors
            hover:text-cyan-100
            pr-10
          "
        >
          View all

          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    
      <div
        className="
        mt-8
          grid
          px-10
          gap-6
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-5
        "
      >
        
        {destinations.map((destination) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            backHref="/"
            backLabel="Back to Home"
          />
        ))}
      </div>
    </section>
  );
}
