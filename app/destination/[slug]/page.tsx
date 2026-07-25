import { notFound } from "next/navigation";
import { DestinationDetails } from "@/components/sections/destination/destination-details";
import { getDestinationBySlug } from "@/lib/mock-data/destinations";

interface DestinationPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DestinationPage({ params, searchParams }: DestinationPageProps & { searchParams: Promise<{ from?: string; fromLabel?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const destination = await getDestinationBySlug(slug);

  if (!destination) {
    notFound();
  }

  const backHref = query.from?.startsWith("/") && !query.from.startsWith("//") ? query.from : undefined;
  return <DestinationDetails destination={destination} backHref={backHref} backLabel={query.fromLabel} />;
}
