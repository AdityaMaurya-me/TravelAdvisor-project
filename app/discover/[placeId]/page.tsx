import { notFound } from "next/navigation";

import { ExternalPlaceDetails } from "@/components/sections/place/external-place-details";
import { OpenStreetMapPlaceDetails } from "@/components/sections/place/openstreetmap-place-details";
import { getGooglePlaceById, type GooglePlaceDetail } from "@/lib/google-places";
import { getOpenStreetMapPlaceById } from "@/lib/openstreetmap-places";

export default async function DiscoverPlacePage({ params, searchParams }: { params: Promise<{ placeId: string }>; searchParams: Promise<{ from?: string; fromLabel?: string; name?: string; address?: string; lat?: string; lng?: string }> }) {
  const { placeId } = await params;
  const query = await searchParams;
  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  if (placeId.startsWith("osm-")) {
    const place = await getOpenStreetMapPlaceById(placeId);
    if (!place) notFound();
    return <OpenStreetMapPlaceDetails place={place} backHref={backHref} backLabel={query.fromLabel} />;
  }
  const latitude = Number(query.lat);
  const longitude = Number(query.lng);
  const snapshotName = query.name?.trim().slice(0, 200);
  const googlePlace = await getGooglePlaceById(placeId);
  const place: GooglePlaceDetail | null = googlePlace ?? (snapshotName && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    ? { id: placeId, name: snapshotName, address: query.address?.trim().slice(0, 500) ?? "Google place", latitude, longitude }
    : null);
  if (!place) notFound();
  return <ExternalPlaceDetails place={place} backHref={backHref} backLabel={query.fromLabel} />;
}
