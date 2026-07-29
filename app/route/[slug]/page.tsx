import { notFound } from "next/navigation";

import { JourneyRoutePage } from "@/components/sections/route/journey-route-page";
import { getJourneyRouteBySlug, getRoutePlaceOptions } from "@/lib/mock-data/routes";

export default async function JourneyRoute({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string; fromLabel?: string; origin?: string; destination?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const route = await getJourneyRouteBySlug(slug);
  if (!route) notFound();
  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  const places = await getRoutePlaceOptions();
  return <JourneyRoutePage route={route} places={places} initialOriginSlug={query.origin} initialDestinationSlug={query.destination} backHref={backHref} backLabel={query.fromLabel} />;
}
