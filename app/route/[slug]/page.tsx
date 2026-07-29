import { notFound } from "next/navigation";

import { JourneyRoutePage } from "@/components/sections/route/journey-route-page";
import { getJourneyRouteBySlug, getRoutePlaceOptions, type RoutePlaceOption } from "@/lib/mock-data/routes";

export default async function JourneyRoute({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string; fromLabel?: string; origin?: string; destination?: string; destinationName?: string; destinationLat?: string; destinationLng?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const route = await getJourneyRouteBySlug(slug);
  if (!route) notFound();
  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  const places = await getRoutePlaceOptions();
  const latitude = Number(query.destinationLat); const longitude = Number(query.destinationLng);
  const externalDestination: RoutePlaceOption | undefined = query.destinationName && Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    ? { id: `google-${query.destinationName}-${latitude}-${longitude}`, slug: "google-place", name: query.destinationName, locationLabel: "Google place", latitude, longitude }
    : undefined;
  return <JourneyRoutePage route={route} places={places} initialOriginSlug={query.origin} initialDestinationSlug={query.destination} initialExternalDestination={externalDestination} backHref={backHref} backLabel={query.fromLabel} />;
}
