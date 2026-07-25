import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DestinationCard } from "@/components/cards/destination-card";
import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { getDestinationSummaries } from "@/lib/mock-data/destinations";

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const destinations = await getDestinationSummaries();

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-100"><ArrowLeft className="h-4 w-4" />Back to home</Link>
        <header className="mt-6"><p className="text-sm font-medium text-cyan-300">Find your next journey</p><h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Explore all destinations</h1><p className="mt-3 text-lg text-muted-foreground">Discover remarkable places already available in TravelAdvisor.</p></header>
        {destinations.length > 0 ? <div className="mt-10 grid items-start gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{destinations.map((destination) => <DestinationCard key={destination.id} destination={destination} backHref="/destinations" backLabel="Back to destinations" />)}</div> : <p className="mt-10 rounded-2xl border border-dashed border-border p-8 text-muted-foreground">Destinations are being added. Explore categories in the meantime.</p>}
      </section>
      <Footer />
    </main>
  );
}
