import { notFound, redirect } from "next/navigation";
import { PlaceDetails } from "@/components/sections/place/place-details";
import { getExternalGooglePlaceBySlug, getPlaceBySlug } from "@/lib/mock-data/places";

interface PlacePageProps {
  params: Promise<{ slug: string }>;
}

export default async function PlacePage({ params, searchParams }: PlacePageProps & { searchParams: Promise<{ from?: string; fromLabel?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const externalPlace = await getExternalGooglePlaceBySlug(slug);
  if (externalPlace?.canonicalSlug) redirect(`/place/${externalPlace.canonicalSlug}`);
  if (externalPlace) {
    const parameters = new URLSearchParams();
    if (query.from?.startsWith("/") && !query.from.startsWith("//")) parameters.set("from", query.from);
    if (query.fromLabel) parameters.set("fromLabel", query.fromLabel);
    const suffix = parameters.size ? `?${parameters.toString()}` : "";
    redirect(`/discover/${encodeURIComponent(externalPlace.googlePlaceId)}${suffix}`);
  }
  const place = await getPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  return <PlaceDetails place={place} backHref={backHref} backLabel={query.fromLabel} />;
}
