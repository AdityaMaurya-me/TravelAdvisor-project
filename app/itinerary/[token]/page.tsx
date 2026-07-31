import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";

export default async function SharedItineraryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await (supabase as any).rpc("get_shared_trip_plan", { p_share_token: token });
  const trip = Array.isArray(data) ? data[0] : null;
  if (error || !trip) notFound();
  const stops = Array.isArray(trip.stops) ? trip.stops : [];

  return <main className="min-h-screen bg-background"><Navbar /><section className="mx-auto max-w-4xl px-4 py-14 sm:px-6"><p className="text-sm font-medium text-cyan-300">Shared itinerary</p><h1 className="mt-2 text-4xl font-bold tracking-tight">{trip.origin_name} <span className="text-cyan-300">→</span> {trip.destination_name}</h1><p className="mt-4 text-muted-foreground">A TravelAdvisor planning corridor with a {trip.buffer_km} km discovery buffer.</p><div className="mt-8 rounded-2xl border border-border bg-card p-6"><h2 className="text-xl font-semibold">Suggested stops</h2>{stops.length ? <ol className="mt-5 space-y-3">{stops.map((stop: { slug?: string; name?: string }, index: number) => <li key={`${stop.slug ?? stop.name}-${index}`} className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3"><span><span className="mr-3 text-cyan-300">{index + 1}.</span>{stop.name ?? "Verified stop"}</span>{stop.slug && <Link className="text-sm text-cyan-300 hover:text-cyan-100" href={`/place/${stop.slug}`}>View place</Link>}</li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">No stops were saved with this itinerary.</p>}</div><Link href="/planner" className="mt-8 inline-flex rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Plan your own journey</Link></section><Footer /></main>;
}
