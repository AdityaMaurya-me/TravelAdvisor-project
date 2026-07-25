"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";

import { SaveDestinationButton } from "@/components/ui/save-destination-button";
import { UniversalBackLink } from "@/components/navigation/universal-back-link";
import type { PlaceDetail } from "@/lib/mock-data/places";

interface PlaceHeroProps {
  place: PlaceDetail;
  backHref?: string;
  backLabel?: string;
}

const MAX_VISIBLE_THUMBNAILS = 4;

export function PlaceHero({ place, backHref, backLabel }: PlaceHeroProps) {
  const [activeImage, setActiveImage] = useState(place.images[0]);

  const visibleThumbnails = place.images.slice(0, MAX_VISIBLE_THUMBNAILS);
  const remainingCount = place.images.length - MAX_VISIBLE_THUMBNAILS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <UniversalBackLink
          fallbackHref={backHref ?? `/destination/${place.destinationSlug}`}
          fallbackLabel={backLabel ?? `Back to ${place.destinationTitle}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <SaveDestinationButton placeSlug={place.slug} />
      </div>

      <div className="space-y-3">
        <div className="relative aspect-16/10 overflow-hidden rounded-2xl border border-border/60 bg-card">
          <Image
            src={activeImage}
            alt={place.title}
            fill
            priority
            sizes="(min-width: 1024px) 66vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          {visibleThumbnails.map((image, index) => {
            const isLastVisible = index === MAX_VISIBLE_THUMBNAILS - 1;
            const showOverlay = isLastVisible && remainingCount > 0;

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveImage(image)}
                aria-label={showOverlay ? `View ${remainingCount} more photos` : `Show photo ${index + 1} of ${place.title}`}
                aria-pressed={activeImage === image}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border/60 transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {showOverlay && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
                    +{remainingCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {place.title}
          </h1>
          <BadgeCheck aria-label="Verified place" className="h-6 w-6 text-primary" />
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/85 sm:text-base">
          {place.description}
        </p>
      </div>
    </div>
  );
}
