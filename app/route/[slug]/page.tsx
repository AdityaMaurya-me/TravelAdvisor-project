import { notFound } from "next/navigation";

import { JourneyRoutePage } from "@/components/sections/route/journey-route-page";
import { getJourneyRouteBySlug } from "@/lib/mock-data/routes";

export default async function JourneyRoute({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string; fromLabel?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const route = await getJourneyRouteBySlug(slug);
  if (!route) notFound();
  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  return <JourneyRoutePage route={route} backHref={backHref} backLabel={query.fromLabel} />;
}
