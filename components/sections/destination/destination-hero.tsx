import { BadgeCheck, MapPin, Star } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SaveDestinationButton } from "@/components/ui/save-destination-button";
import { ExternalGoogleSaveButton } from "@/components/ui/external-google-save-button";
import { PlacePhoto } from "@/components/ui/place-photo";
import { UniversalBackLink } from "@/components/navigation/universal-back-link";
import type { DestinationDetail } from "@/lib/mock-data/destinations";

interface DestinationHeroProps {
  destination: DestinationDetail;
  backHref?: string;
  backLabel?: string;
}

export function DestinationHero({
  destination,
  backHref = "/",
  backLabel = "Back to search",
}: DestinationHeroProps) {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 -z-20"><PlacePhoto src={destination.image} alt={destination.title} query={`${destination.title} ${destination.location}`} googlePhotoName={destination.googlePhotoName} googlePhotoAuthor={destination.googlePhotoAuthor} sizes="100vw" className="object-cover" /></div>
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-background via-background/85 to-background/45" />

      <PageContainer className="max-w-360 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between gap-4">
          <UniversalBackLink
            fallbackHref={backHref}
            fallbackLabel={backLabel}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {destination.isLive && destination.googlePlaceId ? <ExternalGoogleSaveButton googlePlaceId={destination.googlePlaceId} /> : <SaveDestinationButton placeSlug={destination.slug} />}
        </div>

        <div className="max-w-2xl pb-16 pt-20 sm:pb-20 sm:pt-28">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {destination.title}
            </h1>
            {destination.isLive ? <span className="rounded-full border border-cyan-300/30 bg-slate-950/50 px-2.5 py-1 text-xs font-medium text-cyan-100">Live Google destination</span> : <BadgeCheck aria-label="Verified destination" className="h-6 w-6 text-primary" />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              {destination.location}
            </span>
            {destination.rating !== null && destination.reviewCount !== null ? (
              <span className="inline-flex items-center gap-1.5 text-foreground"><Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />{destination.rating.toFixed(1)} ({destination.reviewCount.toLocaleString()} Google ratings)</span>
            ) : <span className="text-xs">Google rating pending verification</span>}
          </div>
          <p className="mt-6 max-w-xl text-sm leading-6 text-foreground/85 sm:text-base">
            {destination.description}
          </p>
        </div>
      </PageContainer>
    </section>
  );
}
