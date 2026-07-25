"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, MapPinned, Route } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DESTINATIONS = ["Mumbai", "Lonavala", "Pune", "Alibaug", "Matheran", "Manali", "Goa"];

export default function PlannerPage() {
  const router = useRouter();
  const [origin, setOrigin] = useState("Mumbai");
  const [destination, setDestination] = useState("Lonavala");

  function planJourney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (origin === "Mumbai" && destination === "Lonavala") {
      router.push("/route/mumbai-to-lonavala?from=/planner&fromLabel=Back%20to%20Journey%20Planner");
      return;
    }
    router.push(`/search/${encodeURIComponent(destination)}?from=/planner&fromLabel=Back%20to%20Journey%20Planner`);
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-5 py-12 sm:px-8">
      <Link href="/journey" className="text-sm text-muted-foreground transition-colors hover:text-cyan-400">← Back to journey tools</Link>
      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-10">
        <div className="flex items-start gap-4">
          <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-400"><Route className="h-6 w-6" /></span>
          <div>
            <p className="text-sm font-medium text-cyan-400">Journey planner</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Start with a route or a destination</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Build the route experience step by step. The Mumbai to Lonavala sample route is ready to explore; other destinations open their search results while more routes are added.</p>
          </div>
        </div>
        <form onSubmit={planJourney} className="mt-8 grid gap-4 rounded-2xl border border-border bg-background/40 p-5 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
          <label className="grid gap-2 text-sm font-medium">Starting point
            <select value={origin} onChange={(event) => setOrigin(event.target.value)} className="h-11 rounded-lg border border-border bg-card px-3 text-foreground outline-none focus:border-cyan-400">
              {DESTINATIONS.map((place) => <option key={place}>{place}</option>)}
            </select>
          </label>
          <ArrowRight className="hidden h-5 w-5 text-cyan-400 sm:mb-3 sm:block" />
          <label className="grid gap-2 text-sm font-medium">Destination
            <select value={destination} onChange={(event) => setDestination(event.target.value)} className="h-11 rounded-lg border border-border bg-card px-3 text-foreground outline-none focus:border-cyan-400">
              {DESTINATIONS.map((place) => <option key={place}>{place}</option>)}
            </select>
          </label>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 font-medium text-slate-950 transition-colors hover:bg-cyan-300"><MapPinned className="h-4 w-4" /> Plan journey</button>
        </form>
      </section>
    </main>
  );
}
