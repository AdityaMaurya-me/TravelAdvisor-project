import { notFound } from "next/navigation";

import { ExternalPlaceDetails } from "@/components/sections/place/external-place-details";
import { getGooglePlaceById } from "@/lib/google-places";

export default async function DiscoverPlacePage({ params, searchParams }: { params: Promise<{ placeId: string }>; searchParams: Promise<{ from?: string; fromLabel?: string }> }) {
  const { placeId } = await params;
  const query = await searchParams;
  const place = await getGooglePlaceById(placeId);
  if (!place) notFound();
  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  return <ExternalPlaceDetails place={place} backHref={backHref} backLabel={query.fromLabel} />;
}
