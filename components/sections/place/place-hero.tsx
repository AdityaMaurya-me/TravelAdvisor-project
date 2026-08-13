"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Star } from "lucide-react";

import { SaveDestinationButton } from "@/components/ui/save-destination-button";
import { PlacePhoto } from "@/components/ui/place-photo";
import { UniversalBackLink } from "@/components/navigation/universal-back-link";
import type { PlaceDetail } from "@/lib/mock-data/places";

interface PlaceHeroProps {
  place: PlaceDetail;
  backHref?: string;
  backLabel?: string;
}

const MAX_VISIBLE_THUMBNAILS = 4;

export function PlaceHero({ place, backHref, backLabel }: PlaceHeroProps) {
  // Empty image rows can exist while an admin is editing a place. Never pass
  // them to next/image: an empty src makes the browser request the page itself.
  const images = useMemo(() => (Array.isArray(place.images) ? place.images : []).filter((image): image is string => typeof image === "string" && image.trim().length > 0), [place.images]);
  const [activeImage, setActiveImage] = useState<string | null>(place.coverImage || images[0] || null);
  const heroImage = typeof activeImage === "string" && activeImage.trim().length > 0 ? activeImage.trim() : null;

  useEffect(() => {
    setActiveImage(place.coverImage || images[0] || null);
  }, [images, place.coverImage]);

  const visibleThumbnails = images.slice(0, MAX_VISIBLE_THUMBNAILS);
  const remainingCount = images.length - MAX_VISIBLE_THUMBNAILS;
  const defaultBackHref = place.destinationSlug ? `/destination/${place.destinationSlug}` : "/";
  const defaultBackLabel = place.destinationTitle ? `Back to ${place.destinationTitle}` : "Back to home";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <UniversalBackLink
          fallbackHref={backHref ?? defaultBackHref}
          fallbackLabel={backLabel ?? defaultBackLabel}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <SaveDestinationButton placeSlug={place.slug} />
      </div>

      <div className="space-y-3">
        <div className="relative aspect-16/10 overflow-hidden rounded-2xl border border-border/60 bg-card">
          {heroImage ? <PlacePhoto
            src={heroImage}
            alt={place.title}
            query={`${place.title} ${place.destinationTitle}`}
            googlePhotoName={place.googlePhotoName}
            googlePhotoAuthor={place.googlePhotoAuthor}
            sizes="(min-width: 1024px) 66vw, 100vw"
            quality={90}
            className="object-cover"
          /> : <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">A photo for this place has not been added yet.</div>}
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
                aria-pressed={heroImage === image}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border/60 transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlacePhoto
                  src={image}
                  alt=""
                  query={`${place.title} ${place.destinationTitle}`}
                  googlePhotoName={place.googlePhotoName}
                  googlePhotoAuthor={place.googlePhotoAuthor}
                  sizes="120px"
                  quality={75}
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
          {place.googleRating !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-sm font-medium text-amber-700 dark:text-amber-200">
              <Star className="h-4 w-4 fill-current" />
              {place.googleRating.toFixed(1)}
              {place.googleRatingCount ? ` (${place.googleRatingCount.toLocaleString()})` : ""}
              <span className="ml-1 text-xs font-normal text-muted-foreground">TravelAdvisor demo rating</span>
            </span>
          )}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/85 sm:text-base">
          {place.description}
        </p>
      </div>
    </div>
  );
}
