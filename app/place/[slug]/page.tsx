import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlaceDetails } from "@/components/sections/place/place-details";
import { getExternalGooglePlaceBySlug, getPlaceBySlug } from "@/lib/mock-data/places";
import { conciseDescription, defaultShareImage } from "@/lib/seo/site";

interface PlacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    return { title: "Place not found", robots: { index: false, follow: false } };
  }

  const description = conciseDescription(
    place.description,
    `Plan a visit to ${place.title}${place.destinationTitle ? ` in ${place.destinationTitle}` : ""}.`,
  );

  return {
    title: `${place.title}${place.destinationTitle ? `, ${place.destinationTitle}` : ""}`,
    description,
    alternates: { canonical: `/place/${place.slug}` },
    openGraph: {
      title: place.title,
      description,
      type: "website",
      images: [{ url: place.coverImage || defaultShareImage, alt: place.title }],
    },
    twitter: { card: "summary_large_image", title: place.title, description, images: [place.coverImage || defaultShareImage] },
  };
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
  const locationSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: place.title,
    description: conciseDescription(place.description, `Travel information for ${place.title}.`),
    image: place.coverImage || undefined,
    url: `/place/${place.slug}`,
    containedInPlace: place.destinationTitle || undefined,
    sameAs: place.verifiedInfo.googleMapsUrl || undefined,
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(locationSchema) }} />
    <PlaceDetails place={place} backHref={backHref} backLabel={query.fromLabel} />
  </>;
}
