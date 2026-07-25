import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PlacePreview } from "@/lib/mock-data/destinations";

interface NearbyPlacesListProps {
  places: PlacePreview[];
  href?: string;
  backHref?: string;
  backLabel?: string;
}

export function NearbyPlacesList({ places, href, backHref, backLabel }: NearbyPlacesListProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <h2 className="text-lg font-semibold text-foreground">Nearby Places</h2>

      <ul className="mt-5 space-y-4">
        {places.map((place) => (
          <li key={place.id}>
            <Link
              href={backHref ? `${place.href}?from=${encodeURIComponent(backHref)}&fromLabel=${encodeURIComponent(backLabel ?? "Back to place")}` : place.href}
              className="group flex items-center gap-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/60">
                <Image
                  src={place.image}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                  {place.title}
                </p>
                {place.distance && (
                  <p className="text-xs text-muted-foreground">{place.distance}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {href && (
        <Link
          href={href}
          className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View more
          <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
