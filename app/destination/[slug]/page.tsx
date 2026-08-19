import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DestinationDetails } from "@/components/sections/destination/destination-details";
import { getDestinationBySlug } from "@/lib/mock-data/destinations";
import { conciseDescription, defaultShareImage } from "@/lib/seo/site";

interface DestinationPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DestinationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);

  if (!destination) {
    return { title: "Destination not found", robots: { index: false, follow: false } };
  }

  const description = conciseDescription(destination.description, `Explore places, routes, and local travel ideas in ${destination.title}.`);
  return {
    title: `Explore ${destination.title}`,
    description,
    alternates: { canonical: `/destination/${destination.slug}` },
    openGraph: { title: `Explore ${destination.title}`, description, type: "website", images: [{ url: destination.image || defaultShareImage, alt: destination.title }] },
    twitter: { card: "summary_large_image", title: `Explore ${destination.title}`, description, images: [destination.image || defaultShareImage] },
  };
}

export default async function DestinationPage({ params, searchParams }: DestinationPageProps & { searchParams: Promise<{ from?: string; fromLabel?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const destination = await getDestinationBySlug(slug);

  if (!destination) {
    notFound();
  }

  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  const destinationSchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: destination.title,
    description: conciseDescription(destination.description, `Travel information for ${destination.title}.`),
    image: destination.image || undefined,
    url: `/destination/${destination.slug}`,
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(destinationSchema) }} />
    <DestinationDetails destination={destination} backHref={backHref} backLabel={query.fromLabel} />
  </>;
}
