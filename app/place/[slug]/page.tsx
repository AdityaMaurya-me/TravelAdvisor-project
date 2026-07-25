import { notFound } from "next/navigation";
import { PlaceDetails } from "@/components/sections/place/place-details";
import { getPlaceBySlug } from "@/lib/mock-data/places";

interface PlacePageProps {
  params: Promise<{ slug: string }>;
}

export default async function PlacePage({ params, searchParams }: PlacePageProps & { searchParams: Promise<{ from?: string; fromLabel?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  return <PlaceDetails place={place} backHref={backHref} backLabel={query.fromLabel} />;
}
