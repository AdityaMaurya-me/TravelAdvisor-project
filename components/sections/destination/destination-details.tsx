import Navbar from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeader } from "@/components/layout/section-header";
import { DestinationCategoryGrid } from "@/components/sections/destination/destination-category-grid";
import { DestinationFacts } from "@/components/sections/destination/destination-facts";
import { DestinationHero } from "@/components/sections/destination/destination-hero";
import { DetailMap } from "@/components/maps/detail-map";
import { PlaceRailSection } from "@/components/sections/destination/place-rail-section";
import { PlaceCommunityDiscussion } from "@/components/sections/place/place-community-discussion";
import { ExternalDestinationCommunity } from "@/components/sections/destination/external-destination-community";
import type { DestinationDetail } from "@/lib/mock-data/destinations";

interface DestinationDetailsProps {
  destination: DestinationDetail;
  backHref?: string;
  backLabel?: string;
}

export function DestinationDetails({ destination, backHref, backLabel }: DestinationDetailsProps) {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <DestinationHero destination={destination} backHref={backHref} backLabel={backLabel} />

      <PageContainer className="max-w-360 space-y-16 px-4 py-10 sm:px-6 sm:py-12 lg:space-y-20 lg:px-8 xl:px-10">
        <DestinationFacts facts={destination.facts} />

        <section>
          <SectionHeader
            title={`Explore around ${destination.title}`}
            description="Find the places that make this destination worth the journey."
            href={destination.browseCategoriesHref ?? `/categories?destination=${encodeURIComponent(destination.slug)}`}
            actionLabel={destination.isLive ? "Browse live categories" : "Browse categories"}
          />
          <div className="mt-6">
            <DestinationCategoryGrid categories={destination.categories} destinationSlug={destination.slug} />
          </div>
          <div className="mt-8">
            <DetailMap markers={destination.mapPlaces} title={`${destination.title} explorer`} mode="destination" />
          </div>
        </section>

        {destination.routeHref && !destination.isLive && (
          <PlaceRailSection
            title="On the way"
            description="Worthwhile stops to add to your journey."
            href={`${destination.routeHref}?from=/destination/${destination.slug}&fromLabel=Back%20to%20${encodeURIComponent(destination.title)}`}
            actionLabel="View route"
            places={destination.routePlaces}
          />
        )}

        {destination.isLive && <PlaceRailSection title={`Live places around ${destination.title}`} description="Current Google listings for this destination. Open a card for full details, saving, routes, and discussions." href={destination.livePlacesHref} actionLabel="View all live places" places={destination.communityFavorites} />}

        {!destination.isLive && destination.livePlaces && <PlaceRailSection title={`Live places around ${destination.title}`} description="Current Google listings near this destination. Open a card for full details, saving, routes, and discussions." href={destination.livePlacesHref ?? `/search/${encodeURIComponent(`places to visit in ${destination.title}`)}`} actionLabel="View all live places" places={destination.livePlaces} />}

        {destination.isLive && destination.googlePlaceId ? <ExternalDestinationCommunity googlePlaceId={destination.googlePlaceId} placeName={destination.title} /> : <PlaceCommunityDiscussion placeSlug={destination.slug} placeName={destination.title} />}
      </PageContainer>
    </main>
  );
}
