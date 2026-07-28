import Navbar from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { NearbyPlacesList } from "@/components/sections/place/nearby-places-list";
import { PlaceFacts } from "@/components/sections/place/place-facts";
import { PlaceHero } from "@/components/sections/place/place-hero";
import { PlaceCommunityDiscussion } from "@/components/sections/place/place-community-discussion";
import { PlaceTravelStatus } from "@/components/sections/place/place-travel-status";
import { PlaceVerifiedInformation } from "@/components/sections/place/place-verified-information";
import { DetailMap } from "@/components/maps/detail-map";
import type { PlaceDetail } from "@/lib/mock-data/places";

interface PlaceDetailsProps {
  place: PlaceDetail;
  backHref?: string;
  backLabel?: string;
}

export function PlaceDetails({ place, backHref, backLabel }: PlaceDetailsProps) {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <PageContainer className="max-w-360 space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,0.85fr)] lg:items-start">
          <div>
            <PlaceHero place={place} backHref={backHref} backLabel={backLabel} />
            <div className="mt-8">
              <PlaceCommunityDiscussion placeSlug={place.slug} placeName={place.title} />
            </div>
          </div>
          <aside className="space-y-5 lg:sticky lg:top-24">
            <PlaceTravelStatus placeId={place.id} placeName={place.title} destinationName={place.destinationTitle} />
            <PlaceVerifiedInformation info={place.verifiedInfo} />
            <DetailMap markers={place.mapMarker ? [place.mapMarker] : []} title={place.title} mode="place" />
            <NearbyPlacesList
              places={place.nearbyPlaces}
              href={`/destination/${place.destinationSlug}`}
              backHref={`/place/${place.slug}`}
              backLabel={`Back to ${place.title}`}
            />
            <PlaceFacts facts={place.facts} compact />
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
